//! Health-check slice.

mod domain;
pub mod handler;

pub use domain::HealthResponse;
pub use handler::{health, router};
