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

/// Creates an organisation and sets it active (create also activates by default).
async fn create_and_activate_org(app: &axum::Router, token: &str, name: &str, slug: &str) -> String {
    let response = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/api/auth/organization/create",
            json!({ "name": name, "slug": slug }),
            token,
        ))
        .await
        .expect("create organization");

    assert!(
        response.status().is_success(),
        "create organization failed: {}",
        response.status()
    );

    let body = body_json(response).await;
    body["id"]
        .as_str()
        .expect("organization id")
        .to_string()
}

/// Signs up and activates a fresh organisation for tenancy-scoped API calls.
async fn sign_up_with_org(app: &axum::Router, email: &str, password: &str, name: &str) -> String {
    let token = sign_up(app, email, password, name).await;
    let slug = format!("org-{}", Uuid::new_v4());
    let _org_id = create_and_activate_org(app, &token, &format!("{name} Org"), &slug).await;
    token
}

/// Signs up, creates an organisation, and returns `(token, organization_id)`.
async fn sign_up_with_org_id(
    app: &axum::Router,
    email: &str,
    password: &str,
    name: &str,
) -> (String, String) {
    let token = sign_up(app, email, password, name).await;
    let slug = format!("org-{}", Uuid::new_v4());
    let org_id = create_and_activate_org(app, &token, &format!("{name} Org"), &slug).await;
    (token, org_id)
}

async fn user_id_from_me(app: &axum::Router, token: &str) -> String {
    let me = app
        .clone()
        .oneshot(authed_request("GET", "/v1/me", token))
        .await
        .expect("me");
    assert_eq!(me.status(), StatusCode::OK);
    body_json(me).await["user"]["id"]
        .as_str()
        .expect("user id")
        .to_string()
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
    assert!(paths.contains_key("/v1/webhooks"));
    assert!(paths.contains_key("/v1/webhooks/{id}"));
    assert!(paths.contains_key("/v1/webhooks/{id}/ping"));
    assert!(paths.contains_key("/v1/webhooks/{id}/deliveries"));
    assert!(paths.contains_key("/v1/notifications"));
    assert!(paths.contains_key("/v1/notifications/read-all"));
    assert!(paths.contains_key("/v1/notifications/{id}/read"));
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
        .oneshot(json_request("POST", "/v1/items", json!({ "name": "nope" })))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn create_item_requires_active_organization() {
    let Some(app) = setup().await else {
        return;
    };

    let email = format!("no-org-{}@example.com", Uuid::new_v4());
    let token = sign_up(&app, &email, "password1234!", "No Org").await;

    let response = app
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "needs-org" }),
            &token,
        ))
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = body_json(response).await;
    assert!(
        body["error"]
            .as_str()
            .unwrap_or_default()
            .contains("organisation"),
        "expected organisation message, got {body}"
    );
}

#[tokio::test]
async fn create_then_get_own_item() {
    let Some(app) = setup().await else {
        return;
    };

    let email = format!("user-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "User One").await;

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
    assert!(created["organization_id"].as_str().is_some());

    let id = created["id"].as_str().expect("id");
    let get_response = app
        .clone()
        .oneshot(authed_request("GET", &format!("/v1/items/{id}"), &token))
        .await
        .expect("response");
    assert_eq!(get_response.status(), StatusCode::OK);

    let me = app
        .clone()
        .oneshot(authed_request("GET", "/v1/me", &token))
        .await
        .expect("me");
    assert_eq!(me.status(), StatusCode::OK);
    let me_body = body_json(me).await;
    assert_eq!(me_body["user"]["email"], email);

    let delete_response = app
        .clone()
        .oneshot(authed_request("DELETE", &format!("/v1/items/{id}"), &token))
        .await
        .expect("delete");
    assert_eq!(delete_response.status(), StatusCode::NO_CONTENT);

    let missing = app
        .oneshot(authed_request("GET", &format!("/v1/items/{id}"), &token))
        .await
        .expect("get after delete");
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn second_user_cannot_read_foreign_item() {
    let Some(app) = setup().await else {
        return;
    };

    let owner_email = format!("owner-{}@example.com", Uuid::new_v4());
    let other_email = format!("other-{}@example.com", Uuid::new_v4());
    let owner_token = sign_up_with_org(&app, &owner_email, "password1234!", "Owner").await;
    let other_token = sign_up_with_org(&app, &other_email, "password1234!", "Other").await;

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
        .oneshot(authed_request(
            "GET",
            &format!("/v1/items/{id}"),
            &other_token,
        ))
        .await
        .expect("get");
    assert_eq!(forbidden.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn items_are_scoped_to_active_organization() {
    let Some(app) = setup().await else {
        return;
    };

    let email = format!("scoped-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Scoped").await;

    let created = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "org-a-item" }),
            &token,
        ))
        .await
        .expect("create");
    assert_eq!(created.status(), StatusCode::CREATED);

    // Second organisation becomes active on create.
    let _org_b = create_and_activate_org(
        &app,
        &token,
        "Org B",
        &format!("org-b-{}", Uuid::new_v4()),
    )
    .await;

    let list = app
        .oneshot(authed_request("GET", "/v1/items", &token))
        .await
        .expect("list");
    assert_eq!(list.status(), StatusCode::OK);
    let items = body_json(list).await;
    assert!(
        items
            .as_array()
            .expect("array")
            .iter()
            .all(|item| item["name"] != "org-a-item"),
        "active organisation B must not list organisation A items"
    );
}

#[tokio::test]
async fn create_item_rejects_empty_name() {
    let Some(app) = setup().await else {
        return;
    };
    let email = format!("empty-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Empty").await;

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
async fn account_webhook_create_list_and_reject_unknown_event() {
    let Some(app) = setup().await else {
        return;
    };

    let email = format!("hooks-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Hooks").await;

    let bad = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/webhooks",
            json!({
                "url": "https://example.com/hooks",
                "events": ["item.updated"]
            }),
            &token,
        ))
        .await
        .expect("bad create");
    assert_eq!(bad.status(), StatusCode::BAD_REQUEST);

    let create = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/webhooks",
            json!({
                "url": "https://example.com/hooks",
                "events": ["item.created"]
            }),
            &token,
        ))
        .await
        .expect("create");
    assert_eq!(create.status(), StatusCode::CREATED);
    let created = body_json(create).await;
    assert_eq!(created["url"], "https://example.com/hooks");
    assert!(created["secret"].as_str().is_some());
    let id = created["id"].as_str().expect("id").to_string();

    let list = app
        .clone()
        .oneshot(authed_request("GET", "/v1/webhooks", &token))
        .await
        .expect("list");
    assert_eq!(list.status(), StatusCode::OK);
    let endpoints = body_json(list).await;
    let endpoints = endpoints.as_array().expect("array");
    assert_eq!(endpoints.len(), 1);
    assert!(endpoints[0]["secret"].is_null() || endpoints[0].get("secret").is_none());

    let other_email = format!("other-hooks-{}@example.com", Uuid::new_v4());
    let other_token = sign_up_with_org(&app, &other_email, "password1234!", "Other").await;
    let foreign = app
        .clone()
        .oneshot(authed_request(
            "GET",
            &format!("/v1/webhooks/{id}/deliveries"),
            &other_token,
        ))
        .await
        .expect("foreign deliveries");
    assert_eq!(foreign.status(), StatusCode::NOT_FOUND);

    let delete = app
        .oneshot(authed_request(
            "DELETE",
            &format!("/v1/webhooks/{id}"),
            &token,
        ))
        .await
        .expect("delete");
    assert_eq!(delete.status(), StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn account_webhook_ping_records_signed_delivery() {
    let Some(app) = setup().await else {
        return;
    };

    let server = wiremock::MockServer::start().await;
    wiremock::Mock::given(wiremock::matchers::method("POST"))
        .and(wiremock::matchers::header_exists("x-webhook-signature"))
        .and(wiremock::matchers::body_partial_json(json!({
            "event": "webhook.ping"
        })))
        .respond_with(wiremock::ResponseTemplate::new(200))
        .mount(&server)
        .await;

    let email = format!("ping-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Ping").await;

    let create = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/webhooks",
            json!({
                "url": server.uri(),
                "events": ["item.created"]
            }),
            &token,
        ))
        .await
        .expect("create");
    assert_eq!(create.status(), StatusCode::CREATED);
    let id = body_json(create).await["id"]
        .as_str()
        .expect("id")
        .to_string();

    let ping = app
        .clone()
        .oneshot(authed_request(
            "POST",
            &format!("/v1/webhooks/{id}/ping"),
            &token,
        ))
        .await
        .expect("ping");
    assert_eq!(ping.status(), StatusCode::OK);
    let delivery = body_json(ping).await;
    assert_eq!(delivery["success"], true);
    assert_eq!(delivery["event"], "webhook.ping");

    let deliveries = app
        .oneshot(authed_request(
            "GET",
            &format!("/v1/webhooks/{id}/deliveries"),
            &token,
        ))
        .await
        .expect("deliveries");
    assert_eq!(deliveries.status(), StatusCode::OK);
    let rows = body_json(deliveries).await;
    assert_eq!(rows.as_array().expect("array").len(), 1);
}

#[tokio::test]
async fn creating_item_fans_out_to_account_webhook() {
    let Some(app) = setup().await else {
        return;
    };

    let server = wiremock::MockServer::start().await;
    wiremock::Mock::given(wiremock::matchers::method("POST"))
        .and(wiremock::matchers::header_exists("x-webhook-signature"))
        .and(wiremock::matchers::body_partial_json(json!({
            "event": "item.created"
        })))
        .respond_with(wiremock::ResponseTemplate::new(204))
        .expect(1)
        .mount(&server)
        .await;

    let email = format!("fanout-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Fanout").await;

    let create_hook = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/webhooks",
            json!({
                "url": server.uri(),
                "events": ["item.created"]
            }),
            &token,
        ))
        .await
        .expect("create hook");
    assert_eq!(create_hook.status(), StatusCode::CREATED);
    let hook_id = body_json(create_hook).await["id"]
        .as_str()
        .expect("id")
        .to_string();

    let create_item = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "widget" }),
            &token,
        ))
        .await
        .expect("create item");
    assert_eq!(create_item.status(), StatusCode::CREATED);

    // Give the async HTTP client a moment to finish delivery + insert.
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

    let deliveries = app
        .oneshot(authed_request(
            "GET",
            &format!("/v1/webhooks/{hook_id}/deliveries"),
            &token,
        ))
        .await
        .expect("deliveries");
    assert_eq!(deliveries.status(), StatusCode::OK);
    let rows = body_json(deliveries).await;
    let rows = rows.as_array().expect("array");
    assert!(
        rows.iter()
            .any(|row| row["event"] == "item.created" && row["success"] == true),
        "expected item.created delivery, got {rows:?}"
    );
}

#[tokio::test]
async fn item_create_writes_notification_unread_for_other_member() {
    let Some(app) = setup().await else {
        return;
    };

    let owner_email = format!("notify-owner-{}@example.com", Uuid::new_v4());
    let member_email = format!("notify-member-{}@example.com", Uuid::new_v4());
    let (owner_token, org_id) =
        sign_up_with_org_id(&app, &owner_email, "password1234!", "NotifyOwner").await;
    let member_token = sign_up(&app, &member_email, "password1234!", "NotifyMember").await;
    let member_user_id = user_id_from_me(&app, &member_token).await;

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = database::connect(&database_url).await.expect("pool");
    sqlx::query(
        r#"INSERT INTO member (id, "organizationId", "userId", role, "createdAt")
           VALUES ($1, $2, $3, 'member', now())"#,
    )
    .bind(format!("mem-{}", Uuid::new_v4()))
    .bind(&org_id)
    .bind(&member_user_id)
    .execute(&pool)
    .await
    .expect("insert member");

    let set_active = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/api/auth/organization/set-active",
            json!({ "organizationId": org_id }),
            &member_token,
        ))
        .await
        .expect("set-active");
    assert!(
        set_active.status().is_success(),
        "set-active failed: {}",
        set_active.status()
    );

    let create = app
        .clone()
        .oneshot(authed_json_request(
            "POST",
            "/v1/items",
            json!({ "name": "Inbox probe" }),
            &owner_token,
        ))
        .await
        .expect("create item");
    assert_eq!(create.status(), StatusCode::CREATED);

    let owner_list = app
        .clone()
        .oneshot(authed_request("GET", "/v1/notifications", &owner_token))
        .await
        .expect("owner list");
    assert_eq!(owner_list.status(), StatusCode::OK);
    let owner_rows = body_json(owner_list).await;
    let owner_rows = owner_rows.as_array().expect("array");
    let owner_note = owner_rows
        .iter()
        .find(|row| row["body"] == "Inbox probe")
        .expect("owner notification");
    assert_eq!(owner_note["unread"], false);
    assert_eq!(owner_note["kind"], "item.created");

    let member_list = app
        .clone()
        .oneshot(authed_request("GET", "/v1/notifications", &member_token))
        .await
        .expect("member list");
    assert_eq!(member_list.status(), StatusCode::OK);
    let member_rows = body_json(member_list).await;
    let member_rows = member_rows.as_array().expect("array");
    let member_note = member_rows
        .iter()
        .find(|row| row["body"] == "Inbox probe")
        .expect("member notification");
    assert_eq!(member_note["unread"], true);
    let note_id = member_note["id"].as_str().expect("id").to_string();

    let read_all = app
        .clone()
        .oneshot(authed_request(
            "POST",
            "/v1/notifications/read-all",
            &member_token,
        ))
        .await
        .expect("read-all");
    assert_eq!(read_all.status(), StatusCode::NO_CONTENT);

    let after = app
        .clone()
        .oneshot(authed_request("GET", "/v1/notifications", &member_token))
        .await
        .expect("member list after read-all");
    assert_eq!(after.status(), StatusCode::OK);
    let after_rows = body_json(after).await;
    let after_note = after_rows
        .as_array()
        .expect("array")
        .iter()
        .find(|row| row["id"] == note_id)
        .expect("notification after read");
    assert_eq!(after_note["unread"], false);
}

#[tokio::test]
async fn get_missing_item_returns_404() {
    let Some(app) = setup().await else {
        return;
    };
    let email = format!("missing-{}@example.com", Uuid::new_v4());
    let token = sign_up_with_org(&app, &email, "password1234!", "Missing").await;
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
