//! Organisation notification inbox use-cases.

use sqlx::PgPool;
use uuid::Uuid;

use super::{
    domain::{KIND_INVITATION_SENT, KIND_ITEM_CREATED, Notification, NotificationRow},
    repo as notifications_repo,
};
use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

/// Best-effort: records an `item.created` notification and marks the actor as read.
///
/// Insert or mark-read failures are logged and swallowed so item creation is
/// not blocked by inbox side effects.
pub async fn record_item_created(
    pool: &PgPool,
    organization_id: &str,
    actor_user_id: &str,
    item_name: &str,
) {
    match notifications_repo::insert(
        pool,
        organization_id,
        KIND_ITEM_CREATED,
        "Item created",
        item_name,
        Some(actor_user_id),
    )
    .await
    {
        Ok(row) => {
            if let Err(err) = notifications_repo::mark_read(pool, row.id, actor_user_id).await {
                tracing::warn!(error = %err, "failed to mark item.created notification read for actor");
            }
        }
        Err(err) => {
            tracing::warn!(error = %err, "failed to insert item.created notification");
        }
    }
}

/// Best-effort: records an `invitation.sent` notification and marks the inviter as read.
///
/// Called from the organisation plugin hook after an invitation is persisted.
pub async fn record_invitation_sent(
    pool: &PgPool,
    organization_id: &str,
    actor_user_id: Option<&str>,
    invitee_email: &str,
    role: &str,
) {
    let body = format!("{invitee_email} · {role}");
    match notifications_repo::insert(
        pool,
        organization_id,
        KIND_INVITATION_SENT,
        "Invitation sent",
        &body,
        actor_user_id,
    )
    .await
    {
        Ok(row) => {
            if let Some(actor) = actor_user_id
                && let Err(err) = notifications_repo::mark_read(pool, row.id, actor).await
            {
                tracing::warn!(
                    error = %err,
                    "failed to mark invitation.sent notification read for inviter"
                );
            }
        }
        Err(err) => {
            tracing::warn!(error = %err, "failed to insert invitation.sent notification");
        }
    }
}

/// Lists recent notifications for the caller in an organisation (limit 30).
///
/// # Errors
///
/// Returns [`AppError::Database`] if the query fails.
pub async fn list(
    state: &AppState,
    organization_id: &str,
    user_id: &str,
) -> AppResult<Vec<Notification>> {
    notifications_repo::list_for_user(&state.pool, organization_id, user_id, 30).await
}

/// Marks one notification as read when it belongs to the organisation.
///
/// # Errors
///
/// Returns [`AppError::NotFound`] when the id is missing or outside
/// `organization_id`, or [`AppError::Database`] on query failure.
pub async fn mark_read(
    state: &AppState,
    organization_id: &str,
    user_id: &str,
    id: Uuid,
) -> AppResult<()> {
    let row = require_org_notification(&state.pool, organization_id, id).await?;
    notifications_repo::mark_read(&state.pool, row.id, user_id).await
}

/// Marks all organisation notifications as read for the caller.
///
/// # Errors
///
/// Returns [`AppError::Database`] if the write fails.
pub async fn mark_all_read(
    state: &AppState,
    organization_id: &str,
    user_id: &str,
) -> AppResult<()> {
    notifications_repo::mark_all_read(&state.pool, organization_id, user_id).await?;
    Ok(())
}

async fn require_org_notification(
    pool: &PgPool,
    organization_id: &str,
    id: Uuid,
) -> AppResult<NotificationRow> {
    let row = notifications_repo::find_by_id(pool, id)
        .await?
        .ok_or(AppError::NotFound)?;
    if row.organization_id != organization_id {
        return Err(AppError::NotFound);
    }
    Ok(row)
}
