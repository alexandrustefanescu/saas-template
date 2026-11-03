//! Health-check handlers.

use axum::Json;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::domain::HealthResponse;
use crate::state::AppState;

/// Health route table (`/v1/health`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(health))
}

/// Liveness probe used by load balancers and local checks.
///
/// Always succeeds when the process can serve HTTP. Does not check Postgres.
/// An unversioned `GET /health` (outside the rate limiter) is also mounted in
/// [`crate::app::router`].
///
/// # Examples
///
/// ```
/// use api::health::HealthResponse;
///
/// assert_eq!(HealthResponse::ok().status, "ok");
/// ```
#[utoipa::path(
    get,
    path = "/v1/health",
    tag = "health",
    responses(
        (status = 200, description = "Service is reachable", body = HealthResponse),
        (status = 429, description = "Rate limit exceeded")
    )
)]
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse::ok())
}
