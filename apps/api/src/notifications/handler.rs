//! Organisation notification inbox handlers.

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use even_better_auth_axum::AuthSession;
use utoipa_axum::{router::OpenApiRouter, routes};
use uuid::Uuid;

use super::{domain::Notification, service};
use crate::{
    auth,
    error::{AppResult, ErrorBody},
    state::AppState,
};

/// Notification route table (`/v1/notifications`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(list_notifications, mark_all_notifications_read))
        .routes(routes!(mark_notification_read))
}

/// Lists recent notifications for the active organisation.
///
/// Each row includes an `unread` flag for the current user (absence of a
/// `notification_reads` row).
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, or [`AppError::Database`](crate::error::AppError::Database)
/// if the query fails.
#[utoipa::path(
    get,
    path = "/v1/notifications",
    tag = "notifications",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Notifications listed", body = [Notification]),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn list_notifications(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
) -> AppResult<Json<Vec<Notification>>> {
    let organization_id = auth::require_active_organization(&session)?;
    Ok(Json(
        service::list(&state, &organization_id, &session.user.id).await?,
    ))
}

/// Marks every organisation notification as read for the current user.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, or [`AppError::Database`](crate::error::AppError::Database)
/// if the write fails.
#[utoipa::path(
    post,
    path = "/v1/notifications/read-all",
    tag = "notifications",
    security(("bearerAuth" = [])),
    responses(
        (status = 204, description = "All marked read"),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn mark_all_notifications_read(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
) -> AppResult<StatusCode> {
    let organization_id = auth::require_active_organization(&session)?;
    service::mark_all_read(&state, &organization_id, &session.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Marks one notification as read for the current user.
///
/// Idempotent: repeating the call for an already-read id succeeds.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// when the id is missing or outside the active org, or
/// [`AppError::Database`](crate::error::AppError::Database) on query failure.
#[utoipa::path(
    post,
    path = "/v1/notifications/{id}/read",
    tag = "notifications",
    params(
        ("id" = Uuid, Path, description = "Notification id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 204, description = "Marked read"),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn mark_notification_read(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let organization_id = auth::require_active_organization(&session)?;
    service::mark_read(&state, &organization_id, &session.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
