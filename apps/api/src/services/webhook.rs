//! Outbound webhook delivery via [`reqwest`].

use crate::{
    domain::{Item, WebhookPayload},
    error::AppError,
    state::AppState,
};

/// Posts a webhook payload with the shared HTTP client.
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

/// Best-effort notification after an item is created.
pub async fn notify_item_created(state: &AppState, item: &Item) {
    if state.webhook_url.is_none() {
        return;
    }

    let payload = WebhookPayload::item_created(item);
    if let Err(err) = deliver(state, &payload).await {
        tracing::warn!(error = %err, item_id = %item.id, "failed to deliver item.created webhook");
    }
}

/// Sends a ping payload to verify webhook connectivity.
pub async fn ping(state: &AppState) -> Result<(), AppError> {
    deliver(state, &WebhookPayload::ping()).await
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use even_better_auth::{BetterAuth, BetterAuthOptions, EmailAndPasswordOptions, MemoryAdapter};
    use reqwest::Client;
    use sqlx::postgres::PgPoolOptions;
    use wiremock::{
        Mock, MockServer, ResponseTemplate,
        matchers::{body_partial_json, method, path},
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

    #[tokio::test]
    async fn deliver_posts_json_to_webhook_url() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/hooks"))
            .and(body_partial_json(serde_json::json!({ "event": "webhook.ping" })))
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
}
