//! OpenAPI document root for Swagger UI.

use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::{
    account::{self, MeResponse},
    error::ErrorBody,
    health::{self, HealthResponse},
    items::{self, CreateItem, Item},
    notifications::{self, Notification},
    webhooks::{
        self, CreateWebhookEndpoint, WebhookDelivery, WebhookEndpoint, WebhookPingResponse,
    },
};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearerAuth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("Session token")
                        .description(Some(
                            "Session token from even-better-auth (cookie or Authorization: Bearer)",
                        ))
                        .build(),
                ),
            );
        }
    }
}

/// Aggregated OpenAPI specification for the API.
///
/// Authentication protocol endpoints live under `/api/auth` (even-better-auth /
/// better-auth wire protocol) and are documented in the README rather than fully
/// duplicated here.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "SaaS Template API",
        version = "0.1.0",
        description = "Versioned Axum + SQLx API (`/v1`) with even-better-auth sessions, Google OAuth, and admin RBAC. Auth protocol: `/api/auth/*` (see README)."
    ),
    paths(
        health::handler::health,
        account::handler::me,
        items::handler::list_items,
        items::handler::create_item,
        items::handler::get_item,
        items::handler::delete_item,
        webhooks::handler::ping_webhook,
        webhooks::handler::list_webhooks,
        webhooks::handler::create_webhook,
        webhooks::handler::delete_webhook,
        webhooks::handler::ping_account_webhook,
        webhooks::handler::list_webhook_deliveries,
        notifications::handler::list_notifications,
        notifications::handler::mark_notification_read,
        notifications::handler::mark_all_notifications_read,
    ),
    components(schemas(
        Item,
        CreateItem,
        HealthResponse,
        ErrorBody,
        WebhookPingResponse,
        WebhookEndpoint,
        CreateWebhookEndpoint,
        WebhookDelivery,
        Notification,
        MeResponse
    )),
    modifiers(&SecurityAddon),
    tags(
        (name = "health", description = "Liveness and readiness"),
        (name = "auth", description = "Current session helpers"),
        (name = "items", description = "Item CRUD (active organisation)"),
        (name = "webhooks", description = "Account webhooks and ops ping"),
        (name = "notifications", description = "Organisation inbox")
    )
)]
pub struct ApiDoc;
