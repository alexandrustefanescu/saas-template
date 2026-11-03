//! Item persistence (SQL only).

use sqlx::PgPool;
use uuid::Uuid;

use super::domain::Item;
use crate::error::AppResult;

/// Lists items for an organisation, newest first.
///
/// # Errors
///
/// Returns [`AppError::Database`](crate::error::AppError::Database) if the query fails.
pub async fn list(pool: &PgPool, organization_id: &str) -> AppResult<Vec<Item>> {
    let items = sqlx::query_as::<_, Item>(
        "SELECT id, user_id, organization_id, name, created_at
         FROM items
         WHERE organization_id = $1
         ORDER BY created_at DESC",
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// Inserts an item owned by `user_id` within `organization_id`.
///
/// # Errors
///
/// Returns [`AppError::Database`](crate::error::AppError::Database) if the insert fails.
pub async fn insert(
    pool: &PgPool,
    user_id: &str,
    organization_id: &str,
    name: &str,
) -> AppResult<Item> {
    let item = sqlx::query_as::<_, Item>(
        "INSERT INTO items (user_id, organization_id, name)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, organization_id, name, created_at",
    )
    .bind(user_id)
    .bind(organization_id)
    .bind(name)
    .fetch_one(pool)
    .await?;

    Ok(item)
}

/// Fetches a single item by id (any organisation).
///
/// Tenancy checks belong in the service layer.
///
/// # Errors
///
/// Returns [`AppError::Database`](crate::error::AppError::Database) if the query fails.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Item>> {
    let item = sqlx::query_as::<_, Item>(
        "SELECT id, user_id, organization_id, name, created_at FROM items WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(item)
}

/// Deletes an item by id within an organisation.
///
/// Returns `true` when a row was removed.
///
/// # Errors
///
/// Returns [`AppError::Database`](crate::error::AppError::Database) if the query fails.
pub async fn delete(pool: &PgPool, id: Uuid, organization_id: &str) -> AppResult<bool> {
    let result = sqlx::query("DELETE FROM items WHERE id = $1 AND organization_id = $2")
        .bind(id)
        .bind(organization_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}
