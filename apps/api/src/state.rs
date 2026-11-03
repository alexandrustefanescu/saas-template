//! Shared Axum application state.

use std::time::Duration;

use axum::extract::FromRef;
use even_better_auth::BetterAuth;
use reqwest::Client;
use sqlx::PgPool;

/// Shared state injected into handlers via [`axum::extract::State`].
#[derive(Clone)]
pub struct AppState {
    /// Postgres connection pool for application tables.
    pub pool: PgPool,
    /// Shared HTTP client for outbound requests.
    pub http: Client,
    /// Optional webhook destination (`WEBHOOK_URL`).
    pub webhook_url: Option<String>,
    /// even-better-auth instance (sessions, users, OAuth).
    pub auth: BetterAuth,
    /// Bootstrap admin user ids (`ADMIN_USER_IDS`).
    pub admin_user_ids: Vec<String>,
}

impl AppState {
    /// Builds application state with a tuned [`reqwest::Client`].
    ///
    /// # Errors
    ///
    /// Returns [`reqwest::Error`] if the HTTP client cannot be constructed.
    pub fn new(
        pool: PgPool,
        webhook_url: Option<String>,
        auth: BetterAuth,
        admin_user_ids: Vec<String>,
    ) -> Result<Self, reqwest::Error> {
        let http = Client::builder()
            .timeout(Duration::from_secs(5))
            .user_agent(concat!("saas-template-api/", env!("CARGO_PKG_VERSION")))
            .build()?;

        Ok(Self {
            pool,
            http,
            webhook_url,
            auth,
            admin_user_ids,
        })
    }
}

impl FromRef<AppState> for BetterAuth {
    fn from_ref(state: &AppState) -> Self {
        state.auth.clone()
    }
}
