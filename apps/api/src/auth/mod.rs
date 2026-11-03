//! even-better-auth bootstrap (email/password, Google, bearer, admin, organization).

mod actor;
mod hooks;
mod org;

pub use actor::Actor;
pub use org::{active_organization_id, require_active_organization};

use std::sync::Arc;

use even_better_auth::{
    BetterAuth, BetterAuthOptions, ChangeEmailOptions, DeleteUserOptions,
    EmailAndPasswordOptions, callback,
    oauth2::ProviderOptions,
    plugins::{
        admin::{AdminOptions, admin},
        bearer::bearer,
        organization::{
            InvitationEmail, OrganizationHooks, OrganizationOptions, TeamOptions, organization,
        },
    },
    social_providers::Google,
};
use even_better_auth_sqlx::SqlxAdapter;

use crate::{config::AuthConfig, infrastructure::database};

/// Builds and migrates a [`BetterAuth`] instance for this API.
///
/// # Errors
///
/// Returns auth/adapter errors when the database cannot be reached or options
/// are invalid.
pub async fn build(
    database_url: &str,
    config: &AuthConfig,
) -> even_better_auth::Result<BetterAuth> {
    let adapter = SqlxAdapter::connect(database_url).await?;
    let notification_pool = database::connect(database_url)
        .await
        .map_err(|err| even_better_auth::Error::Database(err.to_string()))?;

    let mut options = BetterAuthOptions::new(Arc::new(adapter));
    options.base_url = Some(config.base_url.clone());
    options.secret = Some(config.secret.clone());
    options.trusted_origins = config.trusted_origins.clone();
    options.email_and_password = EmailAndPasswordOptions::enabled();
    // Allow email changes in the dashboard without a mailer for unverified accounts.
    options.user.change_email = ChangeEmailOptions {
        enabled: true,
        update_email_without_verification: true,
        ..Default::default()
    };
    // Password-confirmed deletion from Settings → Account.
    options.user.delete_user = DeleteUserOptions {
        enabled: true,
        ..Default::default()
    };
    options
        .social_providers
        .push(Arc::new(Google::new(ProviderOptions::new(
            config.google_client_id.clone(),
            config.google_client_secret.clone(),
        ))));
    options.plugins.push(bearer(Default::default()));
    options.plugins.push(admin(AdminOptions {
        admin_user_ids: config.admin_user_ids.clone(),
        ..Default::default()
    })?);
    options.plugins.push(organization(OrganizationOptions {
        teams: TeamOptions {
            enabled: false,
            ..Default::default()
        },
        // Local/dev stub — invitations still persist; replace with a real mailer in production.
        send_invitation_email: callback(|email: InvitationEmail| async move {
            let org_id = email
                .organization
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or("unknown");
            tracing::info!(
                invitee = %email.email,
                role = %email.role,
                invitation_id = %email.id,
                organization_id = %org_id,
                "organization invitation email (stub — not sent)"
            );
            Ok(())
        }),
        hooks: OrganizationHooks {
            after_create_invitation: Some(hooks::after_create_invitation(notification_pool)),
            ..Default::default()
        },
        ..Default::default()
    }));

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
        options
            .social_providers
            .push(Arc::new(Google::new(ProviderOptions::new(
                config.google_client_id.clone(),
                config.google_client_secret.clone(),
            ))));
        options.plugins.push(bearer(Default::default()));
        options.plugins.push(
            admin(AdminOptions {
                admin_user_ids: config.admin_user_ids.clone(),
                ..Default::default()
            })
            .expect("admin plugin"),
        );

        assert_eq!(options.social_providers.len(), 1);
        assert_eq!(options.social_providers[0].id(), "google");
        BetterAuth::new(options).await.expect("auth with google");
    }
}
