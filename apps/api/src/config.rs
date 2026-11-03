//! Runtime configuration loaded from environment variables.

use std::env;

use thiserror::Error;

/// Current public HTTP API version prefix (e.g. `/v1`).
pub const API_VERSION: &str = "v1";

/// Server, database, auth, webhook, and throttling settings.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    /// Postgres connection string (`DATABASE_URL`).
    pub database_url: String,
    /// Bind host (`HOST`, default `0.0.0.0`).
    pub host: String,
    /// Bind port (`PORT`, default `8080`).
    pub port: u16,
    /// Optional outbound webhook endpoint (`WEBHOOK_URL`).
    pub webhook_url: Option<String>,
    /// Inbound request throttling.
    pub rate_limit: RateLimitConfig,
    /// even-better-auth settings.
    pub auth: AuthConfig,
}

/// Authentication / authorization settings for even-better-auth.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthConfig {
    /// Signing secret (`BETTER_AUTH_SECRET`, >= 32 chars).
    pub secret: String,
    /// Public base URL (`BETTER_AUTH_URL` or `BASE_URL`).
    pub base_url: String,
    /// Google OAuth client id.
    pub google_client_id: String,
    /// Google OAuth client secret.
    pub google_client_secret: String,
    /// Bootstrap admin user ids (`ADMIN_USER_IDS`, comma-separated).
    pub admin_user_ids: Vec<String>,
    /// Trusted browser origins for CSRF (`TRUSTED_ORIGINS`, comma-separated).
    pub trusted_origins: Vec<String>,
}

/// Token-bucket rate limit settings.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitConfig {
    /// Maximum burst size before throttling (`RATE_LIMIT_BURST`, default `60`).
    pub burst_size: u32,
    /// Milliseconds between replenishing one token (`RATE_LIMIT_PERIOD_MS`, default `1000`).
    pub period_ms: u64,
}

impl RateLimitConfig {
    /// Defaults suitable for local development and integration tests.
    pub fn permissive() -> Self {
        Self {
            burst_size: 1_000,
            period_ms: 1,
        }
    }

    /// Tight limits used to assert HTTP 429 behavior in tests.
    pub fn tight_for_tests() -> Self {
        Self {
            burst_size: 2,
            period_ms: 60_000,
        }
    }
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            burst_size: 60,
            period_ms: 1_000,
        }
    }
}

/// Failures while reading or parsing configuration.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum ConfigError {
    /// A required environment variable was not set.
    #[error("missing environment variable: {0}")]
    Missing(&'static str),
    /// `PORT` was set but could not be parsed as a `u16`.
    #[error("invalid PORT value: {0}")]
    InvalidPort(String),
    /// A numeric setting was present but invalid.
    #[error("invalid {0} value: {1}")]
    InvalidNumber(&'static str, String),
    /// `BETTER_AUTH_SECRET` is too short.
    #[error("BETTER_AUTH_SECRET must be at least 32 characters")]
    SecretTooShort,
}

impl Config {
    /// Builds a [`Config`] from explicit values (useful in tests).
    pub fn new(
        database_url: impl Into<String>,
        host: impl Into<String>,
        port: u16,
        webhook_url: Option<String>,
        rate_limit: RateLimitConfig,
        auth: AuthConfig,
    ) -> Self {
        Self {
            database_url: database_url.into(),
            host: host.into(),
            port,
            webhook_url,
            rate_limit,
            auth,
        }
    }

    /// Loads configuration from the process environment.
    ///
    /// # Errors
    ///
    /// Returns [`ConfigError`] when required values are missing or invalid.
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;
        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = match env::var("PORT") {
            Ok(value) => parse_port(&value)?,
            Err(_) => 8080,
        };
        let webhook_url = env::var("WEBHOOK_URL").ok().filter(|value| !value.is_empty());
        let rate_limit = RateLimitConfig::from_env()?;
        let auth = AuthConfig::from_env()?;

        Ok(Self::new(
            database_url,
            host,
            port,
            webhook_url,
            rate_limit,
            auth,
        ))
    }

    /// Returns `host:port` for binding a TCP listener.
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

impl AuthConfig {
    /// Test helpers: local auth config with placeholder Google credentials.
    pub fn for_tests() -> Self {
        Self {
            secret: "test-secret-at-least-32-characters-long!".into(),
            base_url: "http://localhost:8080".into(),
            google_client_id: "test-google-client-id".into(),
            google_client_secret: "test-google-client-secret".into(),
            admin_user_ids: Vec::new(),
            trusted_origins: vec!["http://localhost:3000".into()],
        }
    }

    fn from_env() -> Result<Self, ConfigError> {
        let secret =
            env::var("BETTER_AUTH_SECRET").map_err(|_| ConfigError::Missing("BETTER_AUTH_SECRET"))?;
        if secret.len() < 32 {
            return Err(ConfigError::SecretTooShort);
        }

        let base_url = env::var("BETTER_AUTH_URL")
            .or_else(|_| env::var("BASE_URL"))
            .unwrap_or_else(|_| "http://localhost:8080".to_string());

        let google_client_id = env::var("GOOGLE_CLIENT_ID")
            .map_err(|_| ConfigError::Missing("GOOGLE_CLIENT_ID"))?;
        let google_client_secret = env::var("GOOGLE_CLIENT_SECRET")
            .map_err(|_| ConfigError::Missing("GOOGLE_CLIENT_SECRET"))?;

        let admin_user_ids = env::var("ADMIN_USER_IDS")
            .ok()
            .map(parse_csv)
            .unwrap_or_default();

        let trusted_origins = env::var("TRUSTED_ORIGINS")
            .ok()
            .map(parse_csv)
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| vec!["http://localhost:3000".to_string()]);

        Ok(Self {
            secret,
            base_url,
            google_client_id,
            google_client_secret,
            admin_user_ids,
            trusted_origins,
        })
    }
}

impl RateLimitConfig {
    fn from_env() -> Result<Self, ConfigError> {
        let mut config = Self::default();

        if let Ok(value) = env::var("RATE_LIMIT_BURST") {
            config.burst_size = value
                .parse()
                .map_err(|_| ConfigError::InvalidNumber("RATE_LIMIT_BURST", value))?;
            if config.burst_size == 0 {
                return Err(ConfigError::InvalidNumber(
                    "RATE_LIMIT_BURST",
                    "0".to_string(),
                ));
            }
        }

        if let Ok(value) = env::var("RATE_LIMIT_PERIOD_MS") {
            config.period_ms = value
                .parse()
                .map_err(|_| ConfigError::InvalidNumber("RATE_LIMIT_PERIOD_MS", value))?;
            if config.period_ms == 0 {
                return Err(ConfigError::InvalidNumber(
                    "RATE_LIMIT_PERIOD_MS",
                    "0".to_string(),
                ));
            }
        }

        Ok(config)
    }
}

fn parse_csv(value: String) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(str::to_string)
        .collect()
}

/// Parses a port string into a `u16`.
///
/// # Errors
///
/// Returns [`ConfigError::InvalidPort`] when the value is not a valid `u16`.
pub fn parse_port(value: &str) -> Result<u16, ConfigError> {
    value
        .parse()
        .map_err(|_| ConfigError::InvalidPort(value.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_stores_provided_values() {
        let config = Config::new(
            "postgres://localhost/db",
            "127.0.0.1",
            3001,
            Some("https://example.com/hook".into()),
            RateLimitConfig::default(),
            AuthConfig::for_tests(),
        );
        assert_eq!(config.database_url, "postgres://localhost/db");
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3001);
        assert_eq!(
            config.webhook_url.as_deref(),
            Some("https://example.com/hook")
        );
        assert_eq!(config.rate_limit.burst_size, 60);
        assert_eq!(config.auth.google_client_id, "test-google-client-id");
    }

    #[test]
    fn bind_addr_joins_host_and_port() {
        let config = Config::new(
            "postgres://localhost/db",
            "0.0.0.0",
            8080,
            None,
            RateLimitConfig::permissive(),
            AuthConfig::for_tests(),
        );
        assert_eq!(config.bind_addr(), "0.0.0.0:8080");
    }

    #[test]
    fn parse_port_accepts_valid_u16() {
        assert_eq!(parse_port("8080"), Ok(8080));
        assert_eq!(parse_port("1"), Ok(1));
    }

    #[test]
    fn parse_port_rejects_non_numeric() {
        assert_eq!(
            parse_port("abc"),
            Err(ConfigError::InvalidPort("abc".to_string()))
        );
    }

    #[test]
    fn parse_port_rejects_out_of_range() {
        assert_eq!(
            parse_port("70000"),
            Err(ConfigError::InvalidPort("70000".to_string()))
        );
    }

    #[test]
    fn api_version_is_v1() {
        assert_eq!(API_VERSION, "v1");
    }

    #[test]
    fn parse_csv_splits_and_trims() {
        assert_eq!(
            parse_csv(" a, b ,,c ".into()),
            vec!["a".to_string(), "b".to_string(), "c".to_string()]
        );
    }
}
