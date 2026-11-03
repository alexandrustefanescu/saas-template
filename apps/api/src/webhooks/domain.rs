//! Webhook-related domain / API DTOs.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{error::AppError, items::Item};

/// Allowed account webhook event names.
pub const ITEM_CREATED_EVENT: &str = "item.created";

/// JSON body posted to a webhook URL.
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
            event: ITEM_CREATED_EVENT.to_string(),
            data: json!({
                "id": item.id,
                "user_id": item.user_id,
                "organization_id": item.organization_id,
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

/// Persisted account webhook endpoint (secret included for create responses).
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WebhookEndpoint {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Owning better-auth user id (creator).
    pub user_id: String,
    /// Organisation that owns this endpoint.
    pub organization_id: String,
    /// Destination URL.
    pub url: String,
    /// Shared HMAC secret (only returned on create).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
    /// Subscribed event names.
    pub events: Vec<String>,
    /// Timestamp when the endpoint was created (UTC).
    pub created_at: DateTime<Utc>,
}

/// Row as stored in Postgres (secret always present).
#[derive(Debug, Clone, FromRow)]
pub struct WebhookEndpointRow {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Owning better-auth user id (creator).
    pub user_id: String,
    /// Organisation that owns this endpoint.
    pub organization_id: String,
    /// Destination URL.
    pub url: String,
    /// Shared HMAC secret.
    pub secret: String,
    /// Subscribed event names.
    pub events: Vec<String>,
    /// Timestamp when the endpoint was created (UTC).
    pub created_at: DateTime<Utc>,
}

impl WebhookEndpointRow {
    /// Public list view without the secret.
    pub fn into_public(self) -> WebhookEndpoint {
        WebhookEndpoint {
            id: self.id,
            user_id: self.user_id,
            organization_id: self.organization_id,
            url: self.url,
            secret: None,
            events: self.events,
            created_at: self.created_at,
        }
    }

    /// Create response that includes the secret once.
    pub fn into_created(self) -> WebhookEndpoint {
        WebhookEndpoint {
            id: self.id,
            user_id: self.user_id,
            organization_id: self.organization_id,
            url: self.url,
            secret: Some(self.secret),
            events: self.events,
            created_at: self.created_at,
        }
    }
}

/// Request body for registering a webhook endpoint.
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateWebhookEndpoint {
    /// Destination URL (`http` or `https`).
    pub url: String,
    /// Event names to subscribe to (currently only `item.created`).
    pub events: Vec<String>,
}

/// A recorded delivery attempt.
#[derive(Debug, Clone, Serialize, FromRow, ToSchema)]
pub struct WebhookDelivery {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Endpoint that was called.
    pub endpoint_id: Uuid,
    /// Event name that was delivered.
    pub event: String,
    /// Whether the upstream accepted the delivery.
    pub success: bool,
    /// HTTP status from the upstream, when available.
    pub status_code: Option<i32>,
    /// Error text when the delivery failed.
    pub error: Option<String>,
    /// Timestamp when the attempt was recorded (UTC).
    pub created_at: DateTime<Utc>,
}

/// Validates a webhook destination URL.
///
/// Accepts `http` or `https` URLs with a host.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] when the URL is not parseable, uses another
/// scheme, or has no host.
///
/// # Examples
///
/// ```
/// use api::webhooks::validate_webhook_url;
///
/// assert_eq!(
///     validate_webhook_url("https://hooks.example.com/path").unwrap(),
///     "https://hooks.example.com/path"
/// );
/// assert!(validate_webhook_url("ftp://example.com").is_err());
/// ```
pub fn validate_webhook_url(url: &str) -> Result<&str, AppError> {
    let trimmed = url.trim();
    let parsed = url::Url::parse(trimmed)
        .map_err(|_| AppError::BadRequest("url must be a valid http or https URL".to_string()))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(AppError::BadRequest(
            "url must use http or https".to_string(),
        ));
    }

    if parsed.host_str().is_none() {
        return Err(AppError::BadRequest("url must include a host".to_string()));
    }

    Ok(trimmed)
}

/// Validates subscribed event names.
///
/// Currently only [`ITEM_CREATED_EVENT`] is allowed. Duplicates are collapsed.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] when `events` is empty or contains an
/// unsupported name.
///
/// # Examples
///
/// ```
/// use api::webhooks::{ITEM_CREATED_EVENT, validate_webhook_events};
///
/// let events = validate_webhook_events(&[ITEM_CREATED_EVENT.to_string()]).unwrap();
/// assert_eq!(events, vec![ITEM_CREATED_EVENT.to_string()]);
/// assert!(validate_webhook_events(&["item.updated".to_string()]).is_err());
/// ```
pub fn validate_webhook_events(events: &[String]) -> Result<Vec<String>, AppError> {
    if events.is_empty() {
        return Err(AppError::BadRequest("events must not be empty".to_string()));
    }

    let mut normalized = Vec::with_capacity(events.len());
    for event in events {
        let trimmed = event.trim();
        if trimmed != ITEM_CREATED_EVENT {
            return Err(AppError::BadRequest(format!(
                "unsupported event: {trimmed}"
            )));
        }
        if !normalized.iter().any(|existing| existing == trimmed) {
            normalized.push(trimmed.to_string());
        }
    }

    Ok(normalized)
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
            organization_id: "org-1".to_string(),
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

    #[test]
    fn validate_webhook_url_accepts_https() {
        let url = validate_webhook_url("https://hooks.example.com/path").expect("valid");
        assert_eq!(url, "https://hooks.example.com/path");
    }

    #[test]
    fn validate_webhook_url_rejects_ftp() {
        let err = validate_webhook_url("ftp://example.com").expect_err("ftp");
        assert!(matches!(err, AppError::BadRequest(_)));
    }

    #[test]
    fn validate_webhook_events_accepts_item_created() {
        let events = validate_webhook_events(&[ITEM_CREATED_EVENT.to_string()]).expect("valid");
        assert_eq!(events, vec![ITEM_CREATED_EVENT.to_string()]);
    }

    #[test]
    fn validate_webhook_events_rejects_unknown() {
        let err = validate_webhook_events(&["item.updated".to_string()]).expect_err("unknown");
        assert!(matches!(err, AppError::BadRequest(_)));
    }
}
