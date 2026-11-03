//! Item HTTP handlers (authenticated).

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use even_better_auth_axum::AuthSession;
use utoipa_axum::{router::OpenApiRouter, routes};
use uuid::Uuid;

use crate::{
    domain::{CreateItem, Item},
    error::{AppResult, ErrorBody},
    services::{self, items::Actor},
    state::AppState,
};

/// Item route table.
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(list_items, create_item))
        .routes(routes!(get_item))
}

/// Lists items visible to the current user (or all items for admins).
#[utoipa::path(
    get,
    path = "/v1/items",
    tag = "items",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Items listed successfully", body = [Item]),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody)
    )
)]
pub async fn list_items(
    State(state): State<AppState>,
    AuthSession(session): AuthSession,
) -> AppResult<Json<Vec<Item>>> {
    let actor = Actor::from_user(&session.user, &state.admin_user_ids);
    Ok(Json(services::items::list(&state, &actor).await?))
}

/// Creates a new item owned by the current user.
#[utoipa::path(
    post,
    path = "/v1/items",
    tag = "items",
    request_body = CreateItem,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "Item created", body = Item),
        (status = 400, description = "Invalid request body", body = ErrorBody),
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
    let actor = Actor::from_user(&session.user, &state.admin_user_ids);
    let item = services::items::create(&state, &actor, &payload.name).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

/// Fetches a single item by id (own items, or any item for admins).
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
    let actor = Actor::from_user(&session.user, &state.admin_user_ids);
    Ok(Json(services::items::get(&state, &actor, id).await?))
}
