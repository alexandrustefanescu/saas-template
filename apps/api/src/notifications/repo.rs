//! Notification inbox persistence (SQL only).

use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use super::domain::{Notification, NotificationRow};
use crate::error::AppResult;

#[derive(Debug, FromRow)]
struct NotificationListRow {
    id: Uuid,
    organization_id: String,
    kind: String,
    title: String,
    body: String,
    actor_user_id: Option<String>,
    created_at: DateTime<Utc>,
    unread: bool,
}

impl NotificationListRow {
    fn into_notification(self) -> Notification {
        Notification {
            id: self.id,
            organization_id: self.organization_id,
            kind: self.kind,
            title: self.title,
            body: self.body,
            actor_user_id: self.actor_user_id,
            created_at: self.created_at,
            unread: self.unread,
        }
    }
}

/// Inserts a notification and returns the row.
pub async fn insert(
    pool: &PgPool,
    organization_id: &str,
    kind: &str,
    title: &str,
    body: &str,
    actor_user_id: Option<&str>,
) -> AppResult<NotificationRow> {
    let row = sqlx::query_as::<_, NotificationRow>(
        "INSERT INTO notifications (organization_id, kind, title, body, actor_user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, organization_id, kind, title, body, actor_user_id, created_at",
    )
    .bind(organization_id)
    .bind(kind)
    .bind(title)
    .bind(body)
    .bind(actor_user_id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Marks a notification as read for a user (idempotent).
pub async fn mark_read(pool: &PgPool, notification_id: Uuid, user_id: &str) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO notification_reads (notification_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (notification_id, user_id) DO NOTHING",
    )
    .bind(notification_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Lists recent notifications for an organisation with unread flags for `user_id`.
pub async fn list_for_user(
    pool: &PgPool,
    organization_id: &str,
    user_id: &str,
    limit: i64,
) -> AppResult<Vec<Notification>> {
    let rows = sqlx::query_as::<_, NotificationListRow>(
        "SELECT n.id,
                n.organization_id,
                n.kind,
                n.title,
                n.body,
                n.actor_user_id,
                n.created_at,
                (r.notification_id IS NULL) AS unread
         FROM notifications n
         LEFT JOIN notification_reads r
           ON r.notification_id = n.id AND r.user_id = $2
         WHERE n.organization_id = $1
         ORDER BY n.created_at DESC
         LIMIT $3",
    )
    .bind(organization_id)
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(NotificationListRow::into_notification).collect())
}

/// Fetches one notification by id.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<NotificationRow>> {
    let row = sqlx::query_as::<_, NotificationRow>(
        "SELECT id, organization_id, kind, title, body, actor_user_id, created_at
         FROM notifications
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Marks every notification in an organisation as read for `user_id`.
pub async fn mark_all_read(pool: &PgPool, organization_id: &str, user_id: &str) -> AppResult<u64> {
    let result = sqlx::query(
        "INSERT INTO notification_reads (notification_id, user_id)
         SELECT n.id, $2
         FROM notifications n
         WHERE n.organization_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM notification_reads r
             WHERE r.notification_id = n.id AND r.user_id = $2
           )",
    )
    .bind(organization_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}
