//! Item persistence (SQL only).

use sqlx::PgPool;
use uuid::Uuid;

use crate::{domain::Item, error::AppResult};

/// Lists items visible to the caller.
pub async fn list(pool: &PgPool, user_id: &str, is_admin: bool) -> AppResult<Vec<Item>> {
    let items = if is_admin {
        sqlx::query_as::<_, Item>(
            "SELECT id, user_id, name, created_at FROM items ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, Item>(
            "SELECT id, user_id, name, created_at FROM items WHERE user_id = $1 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?
    };

    Ok(items)
}

/// Inserts an item owned by `user_id`.
pub async fn insert(pool: &PgPool, user_id: &str, name: &str) -> AppResult<Item> {
    let item = sqlx::query_as::<_, Item>(
        "INSERT INTO items (user_id, name) VALUES ($1, $2) RETURNING id, user_id, name, created_at",
    )
    .bind(user_id)
    .bind(name)
    .fetch_one(pool)
    .await?;

    Ok(item)
}

/// Fetches a single item by id.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Item>> {
    let item = sqlx::query_as::<_, Item>(
        "SELECT id, user_id, name, created_at FROM items WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(item)
}
