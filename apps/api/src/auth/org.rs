//! Active organisation helpers for app API tenancy.

use even_better_auth::SessionWithUser;

use crate::error::{AppError, AppResult};

/// Reads `activeOrganizationId` from the session extras.
///
/// Used by handlers and [`crate::auth::Actor`] before touching org-scoped data.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] when no organisation is active.
///
/// # Examples
///
/// ```
/// use api::error::AppError;
///
/// // Handlers map a missing active org to HTTP 400:
/// let err = AppError::BadRequest(
///     "select an organisation before using this resource".to_string(),
/// );
/// assert_eq!(err.status(), axum::http::StatusCode::BAD_REQUEST);
/// ```
pub fn require_active_organization(session: &SessionWithUser) -> AppResult<String> {
    session
        .session
        .extra
        .get("activeOrganizationId")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| {
            AppError::BadRequest(
                "select an organisation before using this resource".to_string(),
            )
        })
}

/// Optional active organisation id (`None` when unset).
pub fn active_organization_id(session: &SessionWithUser) -> Option<String> {
    session
        .session
        .extra
        .get("activeOrganizationId")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}
