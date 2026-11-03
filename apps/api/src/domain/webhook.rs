//! Webhook-related domain / API DTOs.

use serde::Serialize;
use serde_json::{Value, json};
use utoipa::ToSchema;

use crate::domain::Item;

/// JSON body posted to the configured webhook URL.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct WebhookPayload {
    /// Event name, e.g. `item.created` or `webhook.ping`.
    pub event: String,
    /// Event-specific payload.
    pub data: Value,
}

impl WebhookPayload {
    /// Builds an `item.created` notification.
    pub fn item_created(item: &Item) -> Self {
        Self {
            event: "item.created".to_string(),
            data: json!({
                "id": item.id,
                "user_id": item.user_id,
                "name": item.name,
                "created_at": item.created_at,
            }),
        }
    }

    /// Builds a connectivity check payload.
    pub fn ping() -> Self {
        Self {
            event: "webhook.ping".to_string(),
            data: json!({ "ok": true }),
        }
    }
}

/// Response returned after a successful webhook ping.
#[derive(Debug, Serialize, ToSchema)]
pub struct WebhookPingResponse {
    /// Always `true` when the upstream accepted the ping.
    pub delivered: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn sample_item() -> Item {
        Item {
            id: Uuid::nil(),
            user_id: "user-1".to_string(),
            name: "widget".to_string(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn item_created_payload_uses_expected_event() {
        let payload = WebhookPayload::item_created(&sample_item());
        assert_eq!(payload.event, "item.created");
        assert_eq!(payload.data["name"], "widget");
        assert_eq!(payload.data["id"], Uuid::nil().to_string());
    }

    #[test]
    fn ping_payload_marks_ok() {
        let payload = WebhookPayload::ping();
        assert_eq!(payload.event, "webhook.ping");
        assert_eq!(payload.data["ok"], true);
    }
}
