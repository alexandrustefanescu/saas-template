//! Item HTTP handlers (authenticated).

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use even_better_auth_axum::AuthSession;
use utoipa_axum::{router::OpenApiRouter, routes};
use uuid::Uuid;

use super::{
    domain::{CreateItem, Item},
    service,
};
use crate::{
    auth::Actor,
    error::{AppResult, ErrorBody},
    state::AppState,
};

/// Item route table (`/v1/items`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(list_items, create_item))
        .routes(routes!(get_item, delete_item))
}

/// Lists items for the caller's active organisation.
///
/// Requires a signed-in session with `activeOrganizationId` set. Results are
/// newest-first and scoped strictly to that organisation.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, or [`AppError::Database`](crate::error::AppError::Database)
/// if the query fails. Missing/invalid session is rejected by the auth layer (401).
#[utoipa::path(
    get,
    path = "/v1/items",
    tag = "items",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Items listed successfully", body = [Item]),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody)
    )
)]
pub async fn list_items(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
) -> AppResult<Json<Vec<Item>>> {
    let actor = Actor::from_session(&session, &state.admin_user_ids)?;
    Ok(Json(service::list(&state, &actor).await?))
}

/// Creates a new item in the active organisation.
///
/// Persists the item, records an inbox notification (best-effort), and fans out
/// to subscribed webhooks / the ops `WEBHOOK_URL` when configured.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when the
/// name is empty/whitespace or no organisation is active, or
/// [`AppError::Database`](crate::error::AppError::Database) if insert fails.
///
/// # Examples
///
/// Request body shape (validated by [`CreateItem`] / [`validate_item_name`](super::validate_item_name)):
///
/// ```
/// use api::items::CreateItem;
///
/// let body = CreateItem {
///     name: "Ada".into(),
/// };
/// assert_eq!(body.name, "Ada");
/// ```
#[utoipa::path(
    post,
    path = "/v1/items",
    tag = "items",
    request_body = CreateItem,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "Item created", body = Item),
        (status = 400, description = "Invalid request or no active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody)
    )
)]
pub async fn create_item(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Json(payload): Json<CreateItem>,
) -> AppResult<(StatusCode, Json<Item>)> {
    let actor = Actor::from_session(&session, &state.admin_user_ids)?;
    let item = service::create(&state, &actor, &payload.name).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

/// Fetches a single item by id within the active organisation.
///
/// Items that exist but belong to another organisation are reported as missing
/// (no existence leak across tenants).
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// when the item is absent or not in the active org, or
/// [`AppError::Database`](crate::error::AppError::Database) on query failure.
#[utoipa::path(
    get,
    path = "/v1/items/{id}",
    tag = "items",
    params(
        ("id" = Uuid, Path, description = "Item id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Item found", body = Item),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Item not found", body = ErrorBody),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody)
    )
)]
pub async fn get_item(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Item>> {
    let actor = Actor::from_session(&session, &state.admin_user_ids)?;
    Ok(Json(service::get(&state, &actor, id).await?))
}

/// Deletes an item by id within the active organisation.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when no
/// organisation is active, [`AppError::NotFound`](crate::error::AppError::NotFound)
/// when nothing was deleted, or
/// [`AppError::Database`](crate::error::AppError::Database) on query failure.
#[utoipa::path(
    delete,
    path = "/v1/items/{id}",
    tag = "items",
    params(
        ("id" = Uuid, Path, description = "Item id")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 204, description = "Item deleted"),
        (status = 400, description = "No active organisation", body = ErrorBody),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Item not found", body = ErrorBody),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody)
    )
)]
pub async fn delete_item(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let actor = Actor::from_session(&session, &state.admin_user_ids)?;
    service::delete(&state, &actor, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
