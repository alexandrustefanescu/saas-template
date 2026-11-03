//! Webhook administration handlers.

use axum::{Json, extract::State, http::StatusCode};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    domain::WebhookPingResponse,
    error::{AppResult, ErrorBody},
    services,
    state::AppState,
};

/// Webhook route table.
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(ping_webhook))
}

/// Sends a test payload to the configured `WEBHOOK_URL` using reqwest.
#[utoipa::path(
    post,
    path = "/v1/webhooks/ping",
    tag = "webhooks",
    responses(
        (status = 200, description = "Webhook accepted the ping", body = WebhookPingResponse),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 503, description = "WEBHOOK_URL is not configured", body = ErrorBody),
        (status = 502, description = "Upstream webhook failed", body = ErrorBody)
    )
)]
pub async fn ping_webhook(
    State(state): State<AppState>,
) -> AppResult<(StatusCode, Json<WebhookPingResponse>)> {
    services::webhook::ping(&state).await?;
    Ok((
        StatusCode::OK,
        Json(WebhookPingResponse { delivered: true }),
    ))
}
