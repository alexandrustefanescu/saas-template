//! Webhook administration handlers.

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use even_better_auth_axum::AuthSession;
use utoipa_axum::{router::OpenApiRouter, routes};
use uuid::Uuid;

use super::{
    domain::{CreateWebhookEndpoint, WebhookDelivery, WebhookEndpoint, WebhookPingResponse},
    service,
};
use crate::{
    auth,
    error::{AppResult, ErrorBody},
    state::AppState,
};

/// Webhook route table (`/v1/webhooks`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(list_webhooks, create_webhook))
        .routes(routes!(
            delete_webhook,
            ping_account_webhook,
            list_webhook_deliveries
        ))
        .routes(routes!(ping_webhook))
}

/// Lists webhook endpoints for the active organisation.
///
/// Secrets are omitted from list responses; they are only returned once on create.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, or [`AppError::Database`](crate::error::AppError::Database)
/// if the query fails.
#[utoipa::path(
    get,
    path = "/v1/webhooks",
    tag = "webhooks",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Endpoints listed", body = [WebhookEndpoint]),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn list_webhooks(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
) -> AppResult<Json<Vec<WebhookEndpoint>>> {
    let organization_id = auth::require_active_organization(&session)?;
    Ok(Json(
        service::list_endpoints(&state, &organization_id).await?,
    ))
}

/// Registers a webhook endpoint for the active organisation.
///
/// Validates URL + event list, generates an HMAC secret, and returns the secret
/// once in the create response.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) for invalid
/// URL/events or missing active organisation, or
/// [`AppError::Database`](crate::error::AppError::Database) if insert fails.
///
/// # Examples
///
/// ```
/// use api::webhooks::CreateWebhookEndpoint;
///
/// let body = CreateWebhookEndpoint {
///     url: "https://hooks.example.com/saas".into(),
///     events: vec!["item.created".into()],
/// };
/// assert!(body.url.starts_with("https://"));
/// ```
#[utoipa::path(
    post,
    path = "/v1/webhooks",
    tag = "webhooks",
    request_body = CreateWebhookEndpoint,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "Endpoint created (secret returned once)", body = WebhookEndpoint),
        (status = 400, description = "Invalid request or no active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn create_webhook(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Json(payload): Json<CreateWebhookEndpoint>,
) -> AppResult<(StatusCode, Json<WebhookEndpoint>)> {
    let organization_id = auth::require_active_organization(&session)?;
    let endpoint = service::create_endpoint(
        &state,
        &session.user.id,
        &organization_id,
        &payload.url,
        &payload.events,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(endpoint)))
}

/// Deletes a webhook endpoint owned by the active organisation.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// when the endpoint is missing or foreign, or
/// [`AppError::Database`](crate::error::AppError::Database) on query failure.
#[utoipa::path(
    delete,
    path = "/v1/webhooks/{id}",
    tag = "webhooks",
    params(
        ("id" = Uuid, Path, description = "Endpoint id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 204, description = "Endpoint deleted"),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn delete_webhook(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let organization_id = auth::require_active_organization(&session)?;
    service::delete_endpoint(&state, &organization_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Sends a signed test payload to one organisation endpoint.
///
/// Records a delivery row whether the upstream succeeds or fails. Upstream
/// failure is returned as [`AppError::Upstream`](crate::error::AppError::Upstream).
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// for a missing/foreign endpoint,
/// [`AppError::Upstream`](crate::error::AppError::Upstream) /
/// [`AppError::Http`](crate::error::AppError::Http) on delivery failure, or
/// [`AppError::Database`](crate::error::AppError::Database) on persistence errors.
#[utoipa::path(
    post,
    path = "/v1/webhooks/{id}/ping",
    tag = "webhooks",
    params(
        ("id" = Uuid, Path, description = "Endpoint id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Ping delivered", body = WebhookDelivery),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 502, description = "Upstream webhook failed", body = ErrorBody)
    )
)]
pub async fn ping_account_webhook(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<Json<WebhookDelivery>> {
    let organization_id = auth::require_active_organization(&session)?;
    Ok(Json(
        service::ping_endpoint(&state, &organization_id, id).await?,
    ))
}

/// Lists recent deliveries for an owned endpoint.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// for a missing/foreign endpoint, or
/// [`AppError::Database`](crate::error::AppError::Database) on query failure.
#[utoipa::path(
    get,
    path = "/v1/webhooks/{id}/deliveries",
    tag = "webhooks",
    params(
        ("id" = Uuid, Path, description = "Endpoint id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Deliveries listed", body = [WebhookDelivery]),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Not found"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn list_webhook_deliveries(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<WebhookDelivery>>> {
    let organization_id = auth::require_active_organization(&session)?;
    Ok(Json(
        service::list_deliveries(&state, &organization_id, id).await?,
    ))
}

/// Sends a test payload to the configured ops `WEBHOOK_URL` using reqwest.
///
/// This is the unsigned platform/ops hook (env `WEBHOOK_URL`), not an
/// organisation endpoint.
///
/// # Errors
///
/// Returns [`AppError::WebhookNotConfigured`](crate::error::AppError::WebhookNotConfigured)
/// when `WEBHOOK_URL` is unset, [`AppError::Upstream`](crate::error::AppError::Upstream)
/// on non-success HTTP status, or [`AppError::Http`](crate::error::AppError::Http)
/// when the request fails.
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
    service::ping(&state).await?;
    Ok((
        StatusCode::OK,
        Json(WebhookPingResponse { delivered: true }),
    ))
}
