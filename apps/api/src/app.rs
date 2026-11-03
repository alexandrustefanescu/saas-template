//! Application router composition and middleware.

use axum::http::{HeaderName, HeaderValue, Method, header};
use axum::{Router, routing::get};
use even_better_auth_axum::BetterAuthExt;
use tower_governor::GovernorLayer;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    account, config::RateLimitConfig, health, items, middleware::rate_limit, notifications,
    openapi::ApiDoc, state::AppState, webhooks,
};

/// Builds the full HTTP application, including auth, versioning, throttling, and Swagger UI.
///
/// - Unversioned `GET /health` for probes (not rate-limited)
/// - Versioned API under `/v1/*` (rate-limited, session-protected where noted)
/// - Auth protocol at `/api/auth/*` via [`BetterAuthExt::mount_better_auth`]
/// - CORS for `TRUSTED_ORIGINS`, with credentials
/// - Docs at `/swagger-ui/` and `/api-docs/openapi.json`
pub fn router(state: AppState, rate_limit: &RateLimitConfig) -> Router {
    let trusted_origins = state.auth.context().options.trusted_origins.clone();
    let auth = state.auth.clone();
    let governor = rate_limit::shared_config(rate_limit);
    rate_limit::spawn_limiter_cleanup(&governor);

    let (api_router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(health::router())
        .merge(account::router())
        .merge(items::router())
        .merge(notifications::router())
        .merge(webhooks::router())
        .split_for_parts();

    let versioned_api = api_router
        .layer(GovernorLayer::new(governor))
        .with_state(state);

    let app = Router::new()
        .route("/health", get(health::health))
        .merge(versioned_api)
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api))
        .layer(TraceLayer::new_for_http())
        .mount_better_auth(auth);

    match cors_layer(&trusted_origins) {
        Some(cors) => app.layer(cors),
        None => app,
    }
}

/// Browser access from the dashboard origin (`TRUSTED_ORIGINS`).
fn cors_layer(origins: &[String]) -> Option<CorsLayer> {
    let allowed: Vec<HeaderValue> = origins
        .iter()
        .filter(|origin| origin.as_str() != "*")
        .filter_map(|origin| origin.parse().ok())
        .collect();
    if allowed.is_empty() {
        return None;
    }

    Some(
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(allowed))
            .allow_credentials(true)
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([header::ACCEPT, header::AUTHORIZATION, header::CONTENT_TYPE])
            .expose_headers([HeaderName::from_static("set-auth-token")]),
    )
}
