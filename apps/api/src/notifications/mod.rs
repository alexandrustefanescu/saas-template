//! Organisation notification inbox slice.

mod domain;
pub mod handler;
mod repo;
pub mod service;

pub use domain::{
    KIND_INVITATION_SENT, KIND_ITEM_CREATED, Notification, NotificationRow,
};
pub use handler::{
    list_notifications, mark_all_notifications_read, mark_notification_read, router,
};
