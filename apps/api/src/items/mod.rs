//! Items feature slice.

mod domain;
pub mod handler;
mod repo;
pub mod service;

pub use domain::{CreateItem, Item, validate_item_name};
pub use handler::{create_item, delete_item, get_item, list_items, router};
