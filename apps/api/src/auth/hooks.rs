//! Organization plugin hooks that fan out into app feature modules.

use even_better_auth::plugins::organization::{value_fn, OrgHook};
use serde_json::Value;
use sqlx::PgPool;

use crate::notifications::service as notifications;

/// Builds the `after_create_invitation` hook that records an inbox notification.
pub fn after_create_invitation(notification_pool: PgPool) -> OrgHook {
    value_fn(move |arg: Value| {
        let pool = notification_pool.clone();
        async move {
            let organization_id = arg
                .pointer("/organization/id")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let invitee_email = arg
                .pointer("/invitation/email")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let role = arg
                .pointer("/invitation/role")
                .and_then(Value::as_str)
                .unwrap_or("member")
                .to_string();
            let inviter_id = arg
                .pointer("/inviter/id")
                .and_then(Value::as_str)
                .map(str::to_string);

            if !organization_id.is_empty() && !invitee_email.is_empty() {
                notifications::record_invitation_sent(
                    &pool,
                    &organization_id,
                    inviter_id.as_deref(),
                    &invitee_email,
                    &role,
                )
                .await;
            }

            Ok(None)
        }
    })
}
