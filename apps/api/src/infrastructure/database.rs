//! Database connection helpers.

use sqlx::{PgPool, postgres::PgPoolOptions};

/// Creates a Postgres connection pool.
///
/// # Errors
///
/// Returns [`sqlx::Error`] when the server cannot be reached or authentication fails.
pub async fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}
