//! HTTP API crate for the SaaS template.
//!
//! Layered Axum layout:
//! - [`handlers`] — thin HTTP adapters (`/v1` versioned API)
//! - [`services`] — use-cases / orchestration
//! - [`domain`] — models and validation
//! - [`infrastructure`] — database and repositories
//! - [`middleware`] — rate limiting / throttling
//! - [`auth`] — even-better-auth bootstrap
//! - [`app`] — router composition and middleware

#![warn(missing_docs)]

pub mod app;
pub mod auth;
pub mod config;
pub mod domain;
pub mod error;
pub mod handlers;
pub mod infrastructure;
pub mod middleware;
pub mod openapi;
pub mod services;
pub mod state;

pub use app::router;
pub use state::AppState;
