//! Binary entrypoint — bootstrap only.

use std::net::SocketAddr;

use anyhow::Context;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

use api::{AppState, auth, config::Config, infrastructure::database, router};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env().context("failed to load config")?;
    let pool = database::connect(&config.database_url)
        .await
        .context("failed to connect to database")?;

    sqlx::migrate!()
        .run(&pool)
        .await
        .context("failed to run database migrations")?;

    let auth = auth::build(&config.database_url, &config.auth)
        .await
        .map_err(|err| anyhow::anyhow!("failed to initialize auth: {err}"))?;

    let state = AppState::new(
        pool,
        config.webhook_url.clone(),
        auth,
        config.auth.admin_user_ids.clone(),
    )
    .context("failed to build HTTP client")?;
    let app = router(state, &config.rate_limit);
    let addr = config.bind_addr();
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .with_context(|| format!("failed to bind to {addr}"))?;

    tracing::info!("listening on {addr}");
    tracing::info!("api base path /{}", api::config::API_VERSION);
    tracing::info!("auth endpoints at /api/auth");
    tracing::info!(
        "rate limit burst={} period_ms={}",
        config.rate_limit.burst_size,
        config.rate_limit.period_ms
    );
    tracing::info!("swagger ui available at http://{addr}/swagger-ui/");
    if config.webhook_url.is_some() {
        tracing::info!("outbound webhooks enabled");
    }

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .context("server error")?;

    Ok(())
}
