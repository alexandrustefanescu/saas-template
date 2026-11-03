//! Account webhook endpoint persistence (SQL only).

use sqlx::PgPool;
use uuid::Uuid;

use super::domain::{WebhookDelivery, WebhookEndpointRow};
use crate::error::AppResult;

/// Lists endpoints for an organisation.
pub async fn list_endpoints(
    pool: &PgPool,
    organization_id: &str,
) -> AppResult<Vec<WebhookEndpointRow>> {
    let rows = sqlx::query_as::<_, WebhookEndpointRow>(
        "SELECT id, user_id, organization_id, url, secret, events, created_at
         FROM webhook_endpoints
         WHERE organization_id = $1
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Inserts a new endpoint for an organisation.
pub async fn insert_endpoint(
    pool: &PgPool,
    user_id: &str,
    organization_id: &str,
    url: &str,
    secret: &str,
    events: &[String],
) -> AppResult<WebhookEndpointRow> {
    let row = sqlx::query_as::<_, WebhookEndpointRow>(
        "INSERT INTO webhook_endpoints (user_id, organization_id, url, secret, events)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, organization_id, url, secret, events, created_at",
    )
    .bind(user_id)
    .bind(organization_id)
    .bind(url)
    .bind(secret)
    .bind(events)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Fetches one endpoint by id.
pub async fn find_endpoint(pool: &PgPool, id: Uuid) -> AppResult<Option<WebhookEndpointRow>> {
    let row = sqlx::query_as::<_, WebhookEndpointRow>(
        "SELECT id, user_id, organization_id, url, secret, events, created_at
         FROM webhook_endpoints
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Lists endpoints for an organisation that subscribe to `event`.
pub async fn list_endpoints_for_event(
    pool: &PgPool,
    organization_id: &str,
    event: &str,
) -> AppResult<Vec<WebhookEndpointRow>> {
    let rows = sqlx::query_as::<_, WebhookEndpointRow>(
        "SELECT id, user_id, organization_id, url, secret, events, created_at
         FROM webhook_endpoints
         WHERE organization_id = $1 AND $2 = ANY(events)
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .bind(event)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Deletes an endpoint owned by an organisation. Returns whether a row was removed.
pub async fn delete_endpoint(pool: &PgPool, id: Uuid, organization_id: &str) -> AppResult<bool> {
    let result =
        sqlx::query("DELETE FROM webhook_endpoints WHERE id = $1 AND organization_id = $2")
            .bind(id)
            .bind(organization_id)
            .execute(pool)
            .await?;

    Ok(result.rows_affected() > 0)
}

/// Records a delivery attempt.
pub async fn insert_delivery(
    pool: &PgPool,
    endpoint_id: Uuid,
    event: &str,
    success: bool,
    status_code: Option<i32>,
    error: Option<&str>,
) -> AppResult<WebhookDelivery> {
    let delivery = sqlx::query_as::<_, WebhookDelivery>(
        "INSERT INTO webhook_deliveries (endpoint_id, event, success, status_code, error)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, endpoint_id, event, success, status_code, error, created_at",
    )
    .bind(endpoint_id)
    .bind(event)
    .bind(success)
    .bind(status_code)
    .bind(error)
    .fetch_one(pool)
    .await?;

    Ok(delivery)
}

/// Lists recent deliveries for an endpoint.
pub async fn list_deliveries(
    pool: &PgPool,
    endpoint_id: Uuid,
    limit: i64,
) -> AppResult<Vec<WebhookDelivery>> {
    let rows = sqlx::query_as::<_, WebhookDelivery>(
        "SELECT id, endpoint_id, event, success, status_code, error, created_at
         FROM webhook_deliveries
         WHERE endpoint_id = $1
         ORDER BY created_at DESC
         LIMIT $2",
    )
    .bind(endpoint_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}
