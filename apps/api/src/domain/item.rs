//! Item domain model and validation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::AppError;

/// Persisted item aggregate.
#[derive(Debug, Clone, Serialize, FromRow, ToSchema)]
pub struct Item {
    /// Stable unique identifier.
    pub id: Uuid,
    /// Owning better-auth user id.
    pub user_id: String,
    /// Display name of the item.
    pub name: String,
    /// Timestamp when the item was created (UTC).
    pub created_at: DateTime<Utc>,
}

/// Command / request body for creating an item.
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateItem {
    /// Non-empty display name.
    pub name: String,
}

/// Trims and validates an item name.
///
/// # Errors
///
/// Returns [`AppError::BadRequest`] when the trimmed name is empty.
///
/// # Examples
///
/// ```
/// use api::domain::validate_item_name;
///
/// assert_eq!(validate_item_name("  widget  ").unwrap(), "widget");
/// assert!(validate_item_name("   ").is_err());
/// ```
pub fn validate_item_name(name: &str) -> Result<&str, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::BadRequest("name must not be empty".to_string()));
    }
    Ok(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_item_name_trims_whitespace() {
        let name = validate_item_name("  hello  ").expect("valid");
        assert_eq!(name, "hello");
    }

    #[test]
    fn validate_item_name_rejects_empty() {
        let err = validate_item_name("").expect_err("empty");
        assert!(matches!(err, AppError::BadRequest(_)));
    }

    #[test]
    fn validate_item_name_rejects_whitespace_only() {
        let err = validate_item_name("   \t  ").expect_err("whitespace");
        assert_eq!(err.public_message(), "name must not be empty");
    }
}
