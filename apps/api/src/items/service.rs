//! Item use-cases with organisation tenancy.

use uuid::Uuid;

use super::{
    domain::{Item, validate_item_name},
    repo,
};
use crate::{
    auth::Actor,
    error::{AppError, AppResult},
    state::AppState,
};

/// Lists items for the actor's active organisation.
///
/// # Errors
///
/// Returns [`AppError::Database`] if the query fails.
pub async fn list(state: &AppState, actor: &Actor) -> AppResult<Vec<Item>> {
    repo::list(&state.pool, &actor.organization_id).await
}

/// Validates input, persists an item for the actor's organisation, and notifies side effects.
///
/// After a successful insert, records an inbox notification and delivers webhooks
/// (both best-effort — failures are logged, not returned to the caller).
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] when `name` is empty after trimming, or
/// [`AppError::Database`] if the insert fails.
///
/// # Examples
///
/// ```
/// use api::items::validate_item_name;
///
/// assert_eq!(validate_item_name("  widget  ").unwrap(), "widget");
/// assert!(validate_item_name("   ").is_err());
/// ```
pub async fn create(state: &AppState, actor: &Actor, name: &str) -> AppResult<Item> {
    let name = validate_item_name(name)?;
    let item = repo::insert(&state.pool, &actor.user_id, &actor.organization_id, name).await?;
    crate::notifications::service::record_item_created(
        &state.pool,
        &actor.organization_id,
        &actor.user_id,
        &item.name,
    )
    .await;
    crate::webhooks::service::notify_item_created(state, &item).await;
    Ok(item)
}

/// Fetches one item if it belongs to the actor's organisation.
///
/// # Errors
///
/// Returns [`AppError::NotFound`] when the row is missing or owned by another
/// organisation, or [`AppError::Database`] on query failure.
pub async fn get(state: &AppState, actor: &Actor, id: Uuid) -> AppResult<Item> {
    let item = repo::find_by_id(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    if item.organization_id == actor.organization_id {
        Ok(item)
    } else {
        Err(AppError::NotFound)
    }
}

/// Deletes one item in the actor's organisation.
///
/// # Errors
///
/// Returns [`AppError::NotFound`] when no row matched the id + organisation, or
/// [`AppError::Database`] on query failure.
pub async fn delete(state: &AppState, actor: &Actor, id: Uuid) -> AppResult<()> {
    let deleted = repo::delete(&state.pool, id, &actor.organization_id).await?;
    if deleted {
        Ok(())
    } else {
        Err(AppError::NotFound)
    }
}
