//! Organisation notification inbox models.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// Kind of inbox event.
pub const KIND_ITEM_CREATED: &str = "item.created";
/// Invitation was sent within the organisation.
pub const KIND_INVITATION_SENT: &str = "invitation.sent";

/// Notification as returned to clients (includes unread for the caller).
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Notification {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Owning organisation id.
    pub organization_id: String,
    /// Event kind (`item.created`, `invitation.sent`, …).
    pub kind: String,
    /// Short title for the bell.
    pub title: String,
    /// Longer body / detail line.
    pub body: String,
    /// User who caused the event, when known.
    pub actor_user_id: Option<String>,
    /// When the notification was created (UTC).
    pub created_at: DateTime<Utc>,
    /// Whether the current user has not marked this as read.
    pub unread: bool,
}

/// Row from the `notifications` table (no unread flag).
#[derive(Debug, Clone, FromRow)]
pub struct NotificationRow {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Owning organisation id.
    pub organization_id: String,
    /// Event kind.
    pub kind: String,
    /// Short title.
    pub title: String,
    /// Detail line.
    pub body: String,
    /// Actor user id when known.
    pub actor_user_id: Option<String>,
    /// Creation timestamp (UTC).
    pub created_at: DateTime<Utc>,
}

impl NotificationRow {
    /// Converts a row into an API notification with an unread flag.
    pub fn into_notification(self, unread: bool) -> Notification {
        Notification {
            id: self.id,
            organization_id: self.organization_id,
            kind: self.kind,
            title: self.title,
            body: self.body,
            actor_user_id: self.actor_user_id,
            created_at: self.created_at,
            unread,
        }
    }
}
