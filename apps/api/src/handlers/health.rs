//! Health-check handlers.

use axum::Json;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{domain::HealthResponse, state::AppState};

/// Health route table.
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(health))
}

/// Liveness probe used by load balancers and local checks.
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
