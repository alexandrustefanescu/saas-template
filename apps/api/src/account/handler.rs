//! Current-session handler.

use axum::Json;
use even_better_auth_axum::AuthSession;
use serde_json::Value;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::domain::MeResponse;
use crate::state::AppState;

/// Account route table (`/v1/me`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(me))
}

/// Returns the current authenticated user and session as JSON.
///
/// Useful for the dashboard settings shell and session debugging. Identity
/// mutations (profile, password, organisation) go through `/api/auth/*`.
///
/// # Errors
///
/// Missing or invalid sessions are rejected by the auth extractor (HTTP 401)
/// before this handler runs.
///
/// # Examples
///
/// Response shape:
///
/// ```
/// use api::account::MeResponse;
/// use serde_json::json;
///
/// let body = MeResponse {
///     user: json!({ "id": "u1", "email": "ada@example.com" }),
///     session: json!({ "id": "s1" }),
/// };
/// assert_eq!(body.user["email"], "ada@example.com");
/// ```
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
