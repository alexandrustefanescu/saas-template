//! OpenAPI document root for Swagger UI.

use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::{
    domain::{CreateItem, HealthResponse, Item, WebhookPingResponse},
    error::ErrorBody,
    handlers::{
        health, items, me,
        me::MeResponse,
        webhooks,
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
        health::health,
        me::me,
        items::list_items,
        items::create_item,
        items::get_item,
        webhooks::ping_webhook,
    ),
    components(schemas(Item, CreateItem, HealthResponse, ErrorBody, WebhookPingResponse, MeResponse)),
    modifiers(&SecurityAddon),
    tags(
        (name = "health", description = "Liveness and readiness"),
        (name = "auth", description = "Current session helpers"),
        (name = "items", description = "Item CRUD (owner or admin)"),
        (name = "webhooks", description = "Outbound webhook utilities (reqwest)")
    )
)]
pub struct ApiDoc;
