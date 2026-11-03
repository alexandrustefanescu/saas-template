//! Request throttling via [`tower_governor`].
//!
//! Token-bucket limits keyed by client IP (proxy-aware via
//! [`SmartIpKeyExtractor`]). Exceeding the quota returns HTTP 429 with
//! `retry-after` / `x-ratelimit-*` headers.

use std::{sync::Arc, time::Duration};

use governor::middleware::StateInformationMiddleware;
use tower_governor::{
    governor::{GovernorConfig, GovernorConfigBuilder},
    key_extractor::SmartIpKeyExtractor,
};

use crate::config::RateLimitConfig;

/// Shared governor configuration used by [`tower_governor::GovernorLayer`].
pub type SharedConfig = Arc<GovernorConfig<SmartIpKeyExtractor, StateInformationMiddleware>>;

/// Builds rate-limit configuration from app settings.
///
/// # Panics
///
/// Panics if the quota is invalid (e.g. zero burst). Validated config from
/// [`RateLimitConfig`] never uses a zero burst.
pub fn shared_config(settings: &RateLimitConfig) -> SharedConfig {
    let config = GovernorConfigBuilder::default()
        .period(Duration::from_millis(settings.period_ms))
        .burst_size(settings.burst_size)
        .key_extractor(SmartIpKeyExtractor)
        .use_headers()
        .finish()
        .expect("rate limit configuration must be valid");

    Arc::new(config)
}

/// Periodically drops idle client buckets so memory stays bounded.
pub fn spawn_limiter_cleanup(config: &SharedConfig) {
    let limiter = config.limiter().clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            limiter.retain_recent();
        }
    });
}
