//! HTTP API crate for the SaaS template.
//!
//! Vertical domain slices under `/v1`:
//! - [`health`] — liveness
//! - [`account`] — current session (`/v1/me`)
//! - [`items`] — org-scoped item CRUD
//! - [`webhooks`] — org webhooks + ops ping
//! - [`notifications`] — org inbox
//!
//! Cross-cutting:
//! - [`auth`] — even-better-auth bootstrap, Actor, org helpers
//! - [`infrastructure`] — database pool
//! - [`middleware`] — rate limiting
//! - [`app`] — router composition
//!
//! # Documentation
//!
//! Public functions use rustdoc with narrative prose, `# Errors` (linking
//! [`error::AppError`] variants), and `# Examples` where a runnable snippet
//! helps. Generate HTML docs with `cargo doc --open --no-deps`.
//!

#![warn(missing_docs)]

pub mod account;
pub mod app;
pub mod auth;
pub mod config;
pub mod error;
pub mod health;
pub mod infrastructure;
pub mod items;
pub mod middleware;
pub mod notifications;
pub mod openapi;
pub mod state;
pub mod webhooks;

pub use app::router;
pub use state::AppState;
