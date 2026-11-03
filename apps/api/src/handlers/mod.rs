//! HTTP handlers — thin Axum adapters over application services.
//!
//! Public business routes are versioned under `/v1`.

pub mod health;
pub mod items;
pub mod me;
pub mod webhooks;

use utoipa_axum::router::OpenApiRouter;

use crate::state::AppState;

/// Versioned API router (`/v1/...`).
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(health::router())
        .merge(me::router())
        .merge(items::router())
        .merge(webhooks::router())
}
