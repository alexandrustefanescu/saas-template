//! Application router composition and middleware.

use axum::{Router, routing::get};
use even_better_auth_axum::BetterAuthExt;
use tower_governor::GovernorLayer;
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    config::RateLimitConfig,
    handlers::{self, health},
    middleware::rate_limit,
    openapi::ApiDoc,
    state::AppState,
};

/// Builds the full HTTP application, including auth, versioning, throttling, and Swagger UI.
///
/// - Unversioned `GET /health` for probes (not rate-limited)
/// - Versioned API under `/v1/*` (rate-limited, session-protected where noted)
/// - Auth protocol at `/api/auth/*` via [`BetterAuthExt::mount_better_auth`]
/// - Docs at `/swagger-ui/` and `/api-docs/openapi.json`
pub fn router(state: AppState, rate_limit: &RateLimitConfig) -> Router {
    let auth = state.auth.clone();
    let governor = rate_limit::shared_config(rate_limit);
    rate_limit::spawn_limiter_cleanup(&governor);

    let (api_router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(handlers::router())
        .split_for_parts();

    let versioned_api = api_router
        .layer(GovernorLayer::new(governor))
        .with_state(state);

    Router::new()
        .route("/health", get(health::health))
        .merge(versioned_api)
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api))
        .layer(TraceLayer::new_for_http())
        .mount_better_auth(auth)
}
