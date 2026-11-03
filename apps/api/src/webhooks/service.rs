//! Outbound webhook delivery via [`reqwest`].

use hmac::{Hmac, KeyInit, Mac};
use rand::Rng;
use sha2::Sha256;

use super::{
    domain::{
        ITEM_CREATED_EVENT, WebhookDelivery, WebhookEndpoint, WebhookEndpointRow, WebhookPayload,
        validate_webhook_events, validate_webhook_url,
    },
    repo as webhooks_repo,
};
use crate::{error::AppError, items::Item, state::AppState};

type HmacSha256 = Hmac<Sha256>;

/// Posts a webhook payload with the shared HTTP client (unsigned ops URL).
///
/// # Errors
///
/// Returns [`AppError::WebhookNotConfigured`] when no URL is set,
/// [`AppError::Upstream`] on non-success HTTP status,
/// or [`AppError::Http`] when the request fails.
pub async fn deliver(state: &AppState, payload: &WebhookPayload) -> Result<(), AppError> {
    let url = state
        .webhook_url
        .as_deref()
        .ok_or(AppError::WebhookNotConfigured)?;

    let response = state.http.post(url).json(payload).send().await?;
    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Upstream(format!(
            "webhook responded with {status}: {body}"
        )));
    }

    Ok(())
}

/// Signs `body` with HMAC-SHA256 and returns `sha256=<hex>`.
///
/// # Examples
///
/// ```
/// use api::webhooks::sign_payload;
///
/// let signature = sign_payload("secret", br#"{"event":"webhook.ping"}"#);
/// assert!(signature.starts_with("sha256="));
/// assert_eq!(signature, sign_payload("secret", br#"{"event":"webhook.ping"}"#));
/// ```
pub fn sign_payload(secret: &str, body: &[u8]) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(body);
    let digest = mac.finalize().into_bytes();
    format!("sha256={}", hex::encode(digest))
}

fn generate_secret() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

async fn post_signed(
    state: &AppState,
    url: &str,
    secret: &str,
    payload: &WebhookPayload,
) -> Result<u16, AppError> {
    let body = serde_json::to_vec(payload)
        .map_err(|err| AppError::BadRequest(format!("failed to encode payload: {err}")))?;
    let signature = sign_payload(secret, &body);

    let response = state
        .http
        .post(url)
        .header("content-type", "application/json")
        .header("x-webhook-signature", signature)
        .body(body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Upstream(format!(
            "webhook responded with {status}: {text}"
        )));
    }

    Ok(status.as_u16())
}

async fn deliver_to_endpoint(
    state: &AppState,
    endpoint: &WebhookEndpointRow,
    payload: &WebhookPayload,
) -> Result<WebhookDelivery, AppError> {
    match post_signed(state, &endpoint.url, &endpoint.secret, payload).await {
        Ok(status_code) => {
            webhooks_repo::insert_delivery(
                &state.pool,
                endpoint.id,
                &payload.event,
                true,
                Some(i32::from(status_code)),
                None,
            )
            .await
        }
        Err(err) => {
            let status_code = match &err {
                AppError::Upstream(message) => message
                    .strip_prefix("webhook responded with ")
                    .and_then(|rest| rest.split(':').next())
                    .and_then(|code| code.trim().parse::<i32>().ok()),
                _ => None,
            };
            webhooks_repo::insert_delivery(
                &state.pool,
                endpoint.id,
                &payload.event,
                false,
                status_code,
                Some(&err.to_string()),
            )
            .await
        }
    }
}

/// Best-effort notification after an item is created.
///
/// Delivers to the ops `WEBHOOK_URL` (when set) and every organisation endpoint
/// subscribed to `item.created`. Failures are logged, never returned.
pub async fn notify_item_created(state: &AppState, item: &Item) {
    if state.webhook_url.is_some() {
        let payload = WebhookPayload::item_created(item);
        if let Err(err) = deliver(state, &payload).await {
            tracing::warn!(error = %err, item_id = %item.id, "failed to deliver item.created webhook");
        }
    }

    let endpoints = match webhooks_repo::list_endpoints_for_event(
        &state.pool,
        &item.organization_id,
        ITEM_CREATED_EVENT,
    )
    .await
    {
        Ok(rows) => rows,
        Err(err) => {
            tracing::warn!(error = %err, item_id = %item.id, "failed to load organisation webhooks");
            return;
        }
    };

    let payload = WebhookPayload::item_created(item);
    for endpoint in endpoints {
        match deliver_to_endpoint(state, &endpoint, &payload).await {
            Ok(delivery) if !delivery.success => {
                tracing::warn!(
                    error = delivery.error.as_deref().unwrap_or("webhook delivery failed"),
                    item_id = %item.id,
                    endpoint_id = %endpoint.id,
                    "failed to deliver account item.created webhook"
                );
            }
            Err(err) => {
                tracing::warn!(
                    error = %err,
                    item_id = %item.id,
                    endpoint_id = %endpoint.id,
                    "failed to record account item.created webhook"
                );
            }
            Ok(_) => {}
        }
    }
}

/// Sends a ping payload to verify webhook connectivity (ops `WEBHOOK_URL`).
///
/// # Errors
///
/// Same as [`deliver`].
pub async fn ping(state: &AppState) -> Result<(), AppError> {
    deliver(state, &WebhookPayload::ping()).await
}

/// Lists endpoints for the active organisation (secrets omitted).
///
/// # Errors
///
/// Returns [`AppError::Database`] if the query fails.
pub async fn list_endpoints(
    state: &AppState,
    organization_id: &str,
) -> Result<Vec<WebhookEndpoint>, AppError> {
    let rows = webhooks_repo::list_endpoints(&state.pool, organization_id).await?;
    Ok(rows
        .into_iter()
        .map(WebhookEndpointRow::into_public)
        .collect())
}

/// Creates an endpoint and returns it with the secret once.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] for invalid URL/events, or
/// [`AppError::Database`] if insert fails.
pub async fn create_endpoint(
    state: &AppState,
    user_id: &str,
    organization_id: &str,
    url: &str,
    events: &[String],
) -> Result<WebhookEndpoint, AppError> {
    let url = validate_webhook_url(url)?;
    let events = validate_webhook_events(events)?;
    let secret = generate_secret();
    let row = webhooks_repo::insert_endpoint(
        &state.pool,
        user_id,
        organization_id,
        url,
        &secret,
        &events,
    )
    .await?;
    Ok(row.into_created())
}

/// Deletes an endpoint owned by the organisation.
///
/// # Errors
///
/// Returns [`AppError::NotFound`] when no row matched, or [`AppError::Database`]
/// on query failure.
pub async fn delete_endpoint(
    state: &AppState,
    organization_id: &str,
    id: uuid::Uuid,
) -> Result<(), AppError> {
    if !webhooks_repo::delete_endpoint(&state.pool, id, organization_id).await? {
        return Err(AppError::NotFound);
    }
    Ok(())
}

async fn owned_endpoint(
    state: &AppState,
    organization_id: &str,
    id: uuid::Uuid,
) -> Result<WebhookEndpointRow, AppError> {
    let endpoint = webhooks_repo::find_endpoint(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    if endpoint.organization_id != organization_id {
        return Err(AppError::NotFound);
    }

    Ok(endpoint)
}

/// Sends a signed ping to one organisation endpoint and records the delivery.
///
/// # Errors
///
/// Returns [`AppError::NotFound`] for a missing/foreign endpoint,
/// [`AppError::Upstream`] when the recorded delivery failed, or database/HTTP
/// errors from the underlying delivery path.
pub async fn ping_endpoint(
    state: &AppState,
    organization_id: &str,
    id: uuid::Uuid,
) -> Result<WebhookDelivery, AppError> {
    let endpoint = owned_endpoint(state, organization_id, id).await?;
    let payload = WebhookPayload::ping();
    let delivery = deliver_to_endpoint(state, &endpoint, &payload).await?;
    if !delivery.success {
        return Err(AppError::Upstream(
            delivery
                .error
                .clone()
                .unwrap_or_else(|| "webhook delivery failed".to_string()),
        ));
    }
    Ok(delivery)
}

/// Lists recent deliveries for an owned endpoint (newest 20).
///
/// # Errors
///
/// Returns [`AppError::NotFound`] for a missing/foreign endpoint, or
/// [`AppError::Database`] on query failure.
pub async fn list_deliveries(
    state: &AppState,
    organization_id: &str,
    id: uuid::Uuid,
) -> Result<Vec<WebhookDelivery>, AppError> {
    let _endpoint = owned_endpoint(state, organization_id, id).await?;
    webhooks_repo::list_deliveries(&state.pool, id, 20).await
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use even_better_auth::{BetterAuth, BetterAuthOptions, EmailAndPasswordOptions, MemoryAdapter};
    use reqwest::Client;
    use sqlx::postgres::PgPoolOptions;
    use wiremock::{
        Mock, MockServer, ResponseTemplate,
        matchers::{body_partial_json, header, method, path},
    };

    use super::*;

    async fn memory_auth() -> BetterAuth {
        let mut options = BetterAuthOptions::new(Arc::new(MemoryAdapter::new()));
        options.base_url = Some("http://localhost:8080".into());
        options.secret = Some("test-secret-at-least-32-characters-long!".into());
        options.email_and_password = EmailAndPasswordOptions::enabled();
        BetterAuth::new(options).await.expect("auth")
    }

    async fn state_with_webhook(url: Option<String>) -> AppState {
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://saas:saas@127.0.0.1:1/saas")
            .expect("lazy pool");

        AppState {
            pool,
            http: Client::new(),
            webhook_url: url,
            auth: memory_auth().await,
            admin_user_ids: Vec::new(),
        }
    }

    #[test]
    fn sign_payload_is_stable() {
        let signature = sign_payload("secret", br#"{"event":"webhook.ping"}"#);
        assert_eq!(
            signature,
            sign_payload("secret", br#"{"event":"webhook.ping"}"#)
        );
        assert!(signature.starts_with("sha256="));
        assert_eq!(signature.len(), "sha256=".len() + 64);
        assert_ne!(
            signature,
            sign_payload("other", br#"{"event":"webhook.ping"}"#)
        );
    }

    #[tokio::test]
    async fn deliver_posts_json_to_webhook_url() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/hooks"))
            .and(body_partial_json(
                serde_json::json!({ "event": "webhook.ping" }),
            ))
            .respond_with(ResponseTemplate::new(204))
            .mount(&server)
            .await;

        let state = state_with_webhook(Some(format!("{}/hooks", server.uri()))).await;
        deliver(&state, &WebhookPayload::ping())
            .await
            .expect("webhook delivery");
    }

    #[tokio::test]
    async fn deliver_requires_configured_url() {
        let state = state_with_webhook(None).await;
        let err = deliver(&state, &WebhookPayload::ping())
            .await
            .expect_err("missing url");
        assert!(matches!(err, AppError::WebhookNotConfigured));
    }

    #[tokio::test]
    async fn deliver_maps_non_success_status() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&server)
            .await;

        let state = state_with_webhook(Some(server.uri())).await;
        let err = deliver(&state, &WebhookPayload::ping())
            .await
            .expect_err("upstream failure");
        assert!(matches!(err, AppError::Upstream(_)));
    }

    #[tokio::test]
    async fn post_signed_sends_signature_header() {
        let server = MockServer::start().await;
        let payload = WebhookPayload::ping();
        let body = serde_json::to_vec(&payload).unwrap();
        let signature = sign_payload("test-secret", &body);

        Mock::given(method("POST"))
            .and(header("x-webhook-signature", signature.as_str()))
            .and(body_partial_json(
                serde_json::json!({ "event": "webhook.ping" }),
            ))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;

        let state = state_with_webhook(None).await;
        let status = post_signed(&state, &server.uri(), "test-secret", &payload)
            .await
            .expect("signed post");
        assert_eq!(status, 200);
    }
}
