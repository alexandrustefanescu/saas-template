//! even-better-auth bootstrap (email/password, Google, bearer, admin).

use std::sync::Arc;

use even_better_auth::{
    BetterAuth, BetterAuthOptions, EmailAndPasswordOptions,
    oauth2::ProviderOptions,
    plugins::{
        admin::{AdminOptions, admin},
        bearer::bearer,
    },
    social_providers::Google,
};
use even_better_auth_sqlx::SqlxAdapter;

use crate::config::AuthConfig;

/// Builds and migrates a [`BetterAuth`] instance for this API.
///
/// # Errors
///
/// Returns auth/adapter errors when the database cannot be reached or options
/// are invalid.
pub async fn build(database_url: &str, config: &AuthConfig) -> even_better_auth::Result<BetterAuth> {
    let adapter = SqlxAdapter::connect(database_url).await?;
    let mut options = BetterAuthOptions::new(Arc::new(adapter));
    options.base_url = Some(config.base_url.clone());
    options.secret = Some(config.secret.clone());
    options.trusted_origins = config.trusted_origins.clone();
    options.email_and_password = EmailAndPasswordOptions::enabled();
    options.social_providers.push(Arc::new(Google::new(
        ProviderOptions::new(
            config.google_client_id.clone(),
            config.google_client_secret.clone(),
        ),
    )));
    options.plugins.push(bearer(Default::default()));
    options.plugins.push(admin(AdminOptions {
        admin_user_ids: config.admin_user_ids.clone(),
        ..Default::default()
    })?);

    let auth = BetterAuth::new(options).await?;
    auth.migrate().await?;
    Ok(auth)
}

/// Returns true when a role string includes `admin`.
pub fn is_admin(role: Option<&str>) -> bool {
    role.is_some_and(|role| {
        role.split(',')
            .map(str::trim)
            .any(|part| part.eq_ignore_ascii_case("admin"))
    })
}

/// Returns true when the better-auth user has the admin role (in `extra.role`).
pub fn is_admin_user(user: &even_better_auth::User) -> bool {
    is_admin(user.extra.get("role").and_then(|value| value.as_str()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use even_better_auth::MemoryAdapter;
    use serde_json::{Map, json};

    use crate::config::AuthConfig;

    #[test]
    fn is_admin_detects_admin_role() {
        assert!(is_admin(Some("admin")));
        assert!(is_admin(Some("user,admin")));
        assert!(!is_admin(Some("user")));
        assert!(!is_admin(None));
    }

    #[test]
    fn is_admin_user_reads_extra_role() {
        let mut extra = Map::new();
        extra.insert("role".into(), json!("admin"));
        let user = even_better_auth::User {
            id: "u1".into(),
            name: "Admin".into(),
            email: "a@b.com".into(),
            email_verified: true,
            image: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            extra,
        };
        assert!(is_admin_user(&user));
    }

    #[tokio::test]
    async fn google_provider_registers_with_test_config() {
        let config = AuthConfig::for_tests();
        let mut options = BetterAuthOptions::new(Arc::new(MemoryAdapter::new()));
        options.base_url = Some(config.base_url.clone());
        options.secret = Some(config.secret.clone());
        options.email_and_password = EmailAndPasswordOptions::enabled();
        options.social_providers.push(Arc::new(Google::new(
            ProviderOptions::new(
                config.google_client_id.clone(),
                config.google_client_secret.clone(),
            ),
        )));
        options.plugins.push(bearer(Default::default()));
        options.plugins.push(admin(AdminOptions {
            admin_user_ids: config.admin_user_ids.clone(),
            ..Default::default()
        })
        .expect("admin plugin"));

        assert_eq!(options.social_providers.len(), 1);
        assert_eq!(options.social_providers[0].id(), "google");
        BetterAuth::new(options).await.expect("auth with google");
    }
}
