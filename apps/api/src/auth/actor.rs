//! Request actor with organisation tenancy.

use even_better_auth::{SessionWithUser, User};

use crate::{auth, error::AppResult};

/// Actor performing an organisation-scoped operation.
///
/// Built from a better-auth session (or an explicit user + org id) and passed
/// into feature services so tenancy and admin flags stay consistent.
#[derive(Debug, Clone)]
pub struct Actor {
    /// better-auth user id.
    pub user_id: String,
    /// Active organisation id (required for tenancy).
    pub organization_id: String,
    /// Whether the actor has the platform admin role.
    pub is_admin: bool,
}

impl Actor {
    /// Builds an actor from a session (requires an active organisation).
    ///
    /// Admin is true when the user has the better-auth admin role or their id
    /// appears in `admin_user_ids`.
    ///
    /// # Errors
    ///
    /// Returns [`AppError::BadRequest`](crate::error::AppError::BadRequest) when
    /// the session has no `activeOrganizationId`.
    ///
    /// # Examples
    ///
    /// ```
    /// use api::auth::Actor;
    ///
    /// // Prefer [`Actor::from_session`] in handlers; `from_user` is useful in tests.
    /// assert!(!Actor {
    ///     user_id: "u1".into(),
    ///     organization_id: "org-1".into(),
    ///     is_admin: false,
    /// }.is_admin);
    /// ```
    pub fn from_session(
        session: &SessionWithUser,
        admin_user_ids: &[String],
    ) -> AppResult<Self> {
        let organization_id = auth::require_active_organization(session)?;
        Ok(Self {
            user_id: session.user.id.clone(),
            organization_id,
            is_admin: auth::is_admin_user(&session.user)
                || admin_user_ids.iter().any(|id| id == &session.user.id),
        })
    }

    /// Builds an actor from a user + explicit organisation id.
    ///
    /// Does not read session extras — callers must supply a trusted
    /// `organization_id` (e.g. tests or internal jobs).
    pub fn from_user(
        user: &User,
        organization_id: String,
        admin_user_ids: &[String],
    ) -> Self {
        Self {
            user_id: user.id.clone(),
            organization_id,
            is_admin: auth::is_admin_user(user) || admin_user_ids.iter().any(|id| id == &user.id),
        }
    }
}
