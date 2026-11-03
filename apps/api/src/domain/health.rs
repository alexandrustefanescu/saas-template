//! Health-check domain types.

use serde::Serialize;
use utoipa::ToSchema;

/// Payload returned by `GET /health`.
#[derive(Debug, Clone, Serialize, ToSchema, PartialEq, Eq)]
pub struct HealthResponse {
    /// Service status indicator (always `"ok"` when reachable).
    pub status: String,
}

impl HealthResponse {
    /// Creates a successful health response.
    pub fn ok() -> Self {
        Self {
            status: "ok".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ok_sets_status_field() {
        assert_eq!(HealthResponse::ok().status, "ok");
    }
}
