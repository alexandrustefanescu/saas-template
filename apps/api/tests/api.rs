use std::env;
use std::sync::Arc;

use api::{
    AppState, auth,
    config::{AuthConfig, RateLimitConfig},
    infrastructure::database,
    openapi::ApiDoc,
    router,
};
use axum::{
    body::Body,
    http::{Request, StatusCode, header},
};
use even_better_auth::{BetterAuth, BetterAuthOptions, EmailAndPasswordOptions, MemoryAdapter};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;
use utoipa::OpenApi;
use uuid::Uuid;

async fn memory_auth() -> BetterAuth {
    let mut options = BetterAuthOptions::new(Arc::new(MemoryAdapter::new()));
    options.base_url = Some("http://localhost:8080".into());
    options.secret = Some("test-secret-at-least-32-characters-long!".into());
    options.email_and_password = EmailAndPasswordOptions::enabled();
    options.trusted_origins = vec!["http://localhost:3000".into()];
    BetterAuth::new(options).await.expect("memory auth")
}

async fn setup() -> Option<axum::Router> {
    dotenvy::dotenv().ok();

    let database_url = match env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("skipping: DATABASE_URL is not set");
            return None;
        }
    };

    let pool = match database::connect(&database_url).await {
        Ok(pool) => pool,
        Err(err) => {
            eprintln!("skipping: failed to connect to database: {err}");
            return None;
        }
    };

    if let Err(err) = sqlx::migrate!().run(&pool).await {
        eprintln!("skipping: failed to run migrations: {err}");
        return None;
    }

    let mut auth_config = AuthConfig::for_tests();
    if let Ok(secret) = env::var("BETTER_AUTH_SECRET") {
        auth_config.secret = secret;
    }
    if let Ok(base) = env::var("BETTER_AUTH_URL").or_else(|_| env::var("BASE_URL")) {
        auth_config.base_url = base;
    }

    let auth = match auth::build(&database_url, &auth_config).await {
        Ok(auth) => auth,
        Err(err) => {
            eprintln!("skipping: failed to build auth: {err}");
            return None;
        }
    };

    let admin_user_ids = auth_config.admin_user_ids.clone();
    let state = AppState::new(pool, None, auth, admin_user_ids).expect("http client");
    Some(router(state, &RateLimitConfig::permissive()))
}

async fn setup_memory(rate_limit: &RateLimitConfig) -> axum::Router {
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://saas:saas@127.0.0.1:1/saas")
        .expect("lazy pool");
    let state = AppState::new(pool, None, memory_auth().await, Vec::new()).expect("http client");
    router(state, rate_limit)
}

fn request(method: &str, uri: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("x-forwarded-for", "203.0.113.10")
        .header("origin", "http://localhost:3000")
        .body(Body::empty())
        .expect("request")
}

fn json_request(method: &str, uri: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .header("x-forwarded-for", "203.0.113.10")
        .header("origin", "http://localhost:3000")
        .body(Body::from(body.to_string()))
        .expect("request")
}

fn authed_json_request(method: &str, uri: &str, body: Value, token: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {token}"))
        .header("x-forwarded-for", "203.0.113.10")
        .header("origin", "http://localhost:3000")
        .body(Body::from(body.to_string()))
        .expect("request")
}

fn authed_request(method: &str, uri: &str, token: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("authorization", format!("Bearer {token}"))
        .header("x-forwarded-for", "203.0.113.10")
        .header("origin", "http://localhost:3000")
        .body(Body::empty())
        .expect("request")
}

async fn body_json(response: axum::response::Response) -> Value {
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    serde_json::from_slice(&bytes).expect("json body")
}

fn bearer_from_set_auth_token(response: &axum::response::Response) -> Option<String> {
    response
        .headers()
        .get("set-auth-token")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}

async fn sign_up(app: &axum::Router, email: &str, password: &str, name: &str) -> String {
    let response = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/sign-up/email",
            json!({
                "email": email,
                "password": password,
                "name": name
            }),
        ))
        .await
        .expect("sign-up response");

    assert!(
        response.status().is_success(),
        "sign-up failed: {}",
        response.status()
    );

    bearer_from_set_auth_token(&response).expect("set-auth-token header from bearer plugin")
}

#[test]
fn openapi_spec_includes_versioned_paths() {
    let spec = ApiDoc::openapi();
    let paths = spec.paths.paths;
    assert!(paths.contains_key("/v1/health"));
    assert!(paths.contains_key("/v1/me"));
    assert!(paths.contains_key("/v1/items"));
    assert!(paths.contains_key("/v1/items/{id}"));
    assert!(paths.contains_key("/v1/webhooks/ping"));
}

#[tokio::test]
async fn unversioned_health_returns_ok() {
    let app = setup_memory(&RateLimitConfig::permissive()).await;
    let response = app
        .oneshot(request("GET", "/health"))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn versioned_health_returns_ok() {
    let app = setup_memory(&RateLimitConfig::permissive()).await;
    let response = app
        .oneshot(request("GET", "/v1/health"))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn openapi_json_is_served() {
    let app = setup_memory(&RateLimitConfig::permissive()).await;
    let response = app
        .oneshot(request("GET", "/api-docs/openapi.json"))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["info"]["title"], "SaaS Template API");
    assert!(body["paths"].get("/v1/me").is_some());
}

#[tokio::test]
async fn swagger_ui_is_served() {
    let app = setup_memory(&RateLimitConfig::permissive()).await;
    let response = app
        .oneshot(request("GET", "/swagger-ui/"))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn create_item_requires_auth() {
    let app = setup_memory(&RateLimitConfig::permissive()).await;
    let response = app
        .oneshot(json_request(
            "POST",
            "/v1/items",
            json!({ "name": "nope" }),
        ))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn create_then_get_own_item() {
    let Some(app) = setup().await else {
        return;
    };

    let email = format!("user-{}@example.com", Uuid::new_v4());
    let token = sign_up(&app, &email, "password1234!", "User One").await;

    let name = format!("item-{}", Uuid::new_v4());
    let create_response = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": name }),
            &token,
        ))
        .await
        .expect("response");

    assert_eq!(create_response.status(), StatusCode::CREATED);
    let created = body_json(create_response).await;
    assert_eq!(created["name"], name);
    assert!(created["user_id"].as_str().is_some());

    let id = created["id"].as_str().expect("id");
    let get_response = app
        .clone()
        .oneshot(authed_request("GET", &format!("/v1/items/{id}"), &token))
        .await
        .expect("response");
    assert_eq!(get_response.status(), StatusCode::OK);

    let me = app
        .oneshot(authed_request("GET", "/v1/me", &token))
        .await
        .expect("me");
    assert_eq!(me.status(), StatusCode::OK);
    let me_body = body_json(me).await;
    assert_eq!(me_body["user"]["email"], email);
}

#[tokio::test]
async fn second_user_cannot_read_foreign_item() {
    let Some(app) = setup().await else {
        return;
    };

    let owner_email = format!("owner-{}@example.com", Uuid::new_v4());
    let other_email = format!("other-{}@example.com", Uuid::new_v4());
    let owner_token = sign_up(&app, &owner_email, "password1234!", "Owner").await;
    let other_token = sign_up(&app, &other_email, "password1234!", "Other").await;

    let create_response = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "secret" }),
            &owner_token,
        ))
        .await
        .expect("create");
    assert_eq!(create_response.status(), StatusCode::CREATED);
    let id = body_json(create_response).await["id"]
        .as_str()
        .expect("id")
        .to_string();

    let forbidden = app
        .oneshot(authed_request("GET", &format!("/v1/items/{id}"), &other_token))
        .await
        .expect("get");
    assert_eq!(forbidden.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn admin_can_list_all_items() {
    let Some(app) = setup().await else {
        return;
    };

    let user_email = format!("member-{}@example.com", Uuid::new_v4());
    let admin_email = format!("admin-{}@example.com", Uuid::new_v4());
    let user_token = sign_up(&app, &user_email, "password1234!", "Member").await;
    let admin_token = sign_up(&app, &admin_email, "password1234!", "Admin").await;

    let created = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "owned-by-member" }),
            &user_token,
        ))
        .await
        .expect("create");
    assert_eq!(created.status(), StatusCode::CREATED);

    // Promote admin via better-auth internal adapter.
    let me = app
        .clone()
        .oneshot(authed_request("GET", "/v1/me", &admin_token))
        .await
        .expect("me");
    let admin_id = body_json(me).await["user"]["id"]
        .as_str()
        .expect("admin id")
        .to_string();

    // Use admin set-role through auth API after bootstrapping via update_user_by_email
    // is awkward without AppState access; call set-role using a direct DB update via sqlx.
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = database::connect(&database_url).await.expect("pool");
    sqlx::query("UPDATE \"user\" SET role = $1 WHERE id = $2")
        .bind("admin")
        .bind(&admin_id)
        .execute(&pool)
        .await
        .expect("promote admin");

    // Re-sign-in may be needed if role is cached; bearer session may still have old user.
    // Fetch session again through get-session with bearer.
    let session = app
        .clone()
        .oneshot(authed_request("GET", "/api/auth/get-session", &admin_token))
        .await
        .expect("session");
    assert!(session.status().is_success());

    // Sign in again to refresh session user payload with role.
    let sign_in = app
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/sign-in/email",
            json!({ "email": admin_email, "password": "password1234!" }),
        ))
        .await
        .expect("sign-in");
    assert!(sign_in.status().is_success());
    let admin_token = bearer_from_set_auth_token(&sign_in).unwrap_or(admin_token);

    let list = app
        .oneshot(authed_request("GET", "/v1/items", &admin_token))
        .await
        .expect("list");
    assert_eq!(list.status(), StatusCode::OK);
    let items = body_json(list).await;
    assert!(
        items
            .as_array()
            .expect("array")
            .iter()
            .any(|item| item["name"] == "owned-by-member")
    );
}

#[tokio::test]
async fn create_item_rejects_empty_name() {
    let Some(app) = setup().await else {
        return;
    };
    let email = format!("empty-{}@example.com", Uuid::new_v4());
    let token = sign_up(&app, &email, "password1234!", "Empty").await;

    let response = app
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "   " }),
            &token,
        ))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn ping_webhook_without_config_returns_503() {
    let Some(app) = setup().await else {
        return;
    };
    let response = app
        .oneshot(request("POST", "/v1/webhooks/ping"))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn get_missing_item_returns_404() {
    let Some(app) = setup().await else {
        return;
    };
    let email = format!("missing-{}@example.com", Uuid::new_v4());
    let token = sign_up(&app, &email, "password1234!", "Missing").await;
    let missing_id = Uuid::new_v4();
    let response = app
        .oneshot(authed_request(
            "GET",
            &format!("/v1/items/{missing_id}"),
            &token,
        ))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn rate_limit_returns_429_after_burst() {
    let app = setup_memory(&RateLimitConfig::tight_for_tests()).await;
    let mut last_status = StatusCode::OK;
    for _ in 0..3 {
        let response = app
            .clone()
            .oneshot(request("GET", "/v1/health"))
            .await
            .expect("response");
        last_status = response.status();
    }
    assert_eq!(last_status, StatusCode::TOO_MANY_REQUESTS);
}

#[test]
fn auth_config_for_tests_includes_google_credentials() {
    let auth = AuthConfig::for_tests();
    assert!(!auth.google_client_id.is_empty());
    assert!(!auth.google_client_secret.is_empty());
    assert!(auth.secret.len() >= 32);
}

#[allow(dead_code)]
fn _silence_unused_header_import() {
    let _ = header::AUTHORIZATION;
}
