//! Account / session response types.

use serde::Serialize;
use serde_json::Value;
use utoipa::ToSchema;

/// Authenticated session payload.
#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    /// Signed-in user (JSON).
    pub user: Value,
    /// Active session (JSON).
    pub session: Value,
}
