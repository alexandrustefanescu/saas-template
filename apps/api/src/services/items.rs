//! Item use-cases with ownership / admin authorization.

use even_better_auth::User;
use uuid::Uuid;

use crate::{
    auth,
    domain::{Item, validate_item_name},
    error::{AppError, AppResult},
    infrastructure::repository::items as items_repo,
    services::webhook,
    state::AppState,
};

/// Actor performing an item operation.
#[derive(Debug, Clone)]
pub struct Actor {
    /// better-auth user id.
    pub user_id: String,
    /// Whether the actor has the admin role.
    pub is_admin: bool,
}

impl Actor {
    /// Builds an actor from a better-auth user and optional bootstrap admin ids.
    pub fn from_user(user: &User, admin_user_ids: &[String]) -> Self {
        Self {
            user_id: user.id.clone(),
            is_admin: auth::is_admin_user(user)
                || admin_user_ids.iter().any(|id| id == &user.id),
        }
    }
}

/// Lists items visible to the actor.
pub async fn list(state: &AppState, actor: &Actor) -> AppResult<Vec<Item>> {
    items_repo::list(&state.pool, &actor.user_id, actor.is_admin).await
}

/// Validates input, persists an item for the actor, and best-effort notifies webhooks.
pub async fn create(state: &AppState, actor: &Actor, name: &str) -> AppResult<Item> {
    let name = validate_item_name(name)?;
    let item = items_repo::insert(&state.pool, &actor.user_id, name).await?;
    webhook::notify_item_created(state, &item).await;
    Ok(item)
}

/// Fetches one item if the actor may see it.
///
/// Non-owners (non-admin) get [`AppError::NotFound`] to avoid leaking ids.
pub async fn get(state: &AppState, actor: &Actor, id: Uuid) -> AppResult<Item> {
    let item = items_repo::find_by_id(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    if actor.is_admin || item.user_id == actor.user_id {
        Ok(item)
    } else {
        Err(AppError::NotFound)
    }
}
