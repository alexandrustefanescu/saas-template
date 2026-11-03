//! Current-session account slice (`/v1/me`).

mod domain;
pub mod handler;

pub use domain::MeResponse;
pub use handler::{me, router};
