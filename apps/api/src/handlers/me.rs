//! Current-session handler.

use axum::Json;
use even_better_auth_axum::AuthSession;
use serde::Serialize;
use serde_json::Value;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::state::AppState;

/// Me route table.
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(me))
}

/// Authenticated session payload.
#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    /// Signed-in user (JSON).
    pub user: Value,
    /// Active session (JSON).
    pub session: Value,
}

/// Returns the current authenticated user and session.
#[utoipa::path(
    get,
    path = "/v1/me",
    tag = "auth",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Current session", body = MeResponse),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn me(AuthSession(session): AuthSession) -> Json<MeResponse> {
    Json(MeResponse {
        user: serde_json::to_value(&session.user).unwrap_or(Value::Null),
        session: serde_json::to_value(&session.session).unwrap_or(Value::Null),
    })
}
