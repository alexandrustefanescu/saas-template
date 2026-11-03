//! Application error types mapped to HTTP responses.

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use utoipa::ToSchema;

/// JSON error payload returned by the API.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
pub struct ErrorBody {
    /// Human-readable error message.
    pub error: String,
}

/// Fallible API operations return this error type.
#[derive(Debug, Error)]
pub enum AppError {
    /// Client sent an invalid request.
    #[error("{0}")]
    BadRequest(String),
    /// Requested resource does not exist.
    #[error("not found")]
    NotFound,
    /// Authenticated caller is not allowed to perform the action.
    #[error("forbidden")]
    Forbidden,
    /// Outbound webhook URL is not configured.
    #[error("webhook url is not configured")]
    WebhookNotConfigured,
    /// Remote HTTP service returned a failure response.
    #[error("{0}")]
    Upstream(String),
    /// Underlying database failure.
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    /// Outbound HTTP client failure.
    #[error(transparent)]
    Http(#[from] reqwest::Error),
}

impl AppError {
    /// HTTP status associated with this error.
    pub fn status(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::WebhookNotConfigured => StatusCode::SERVICE_UNAVAILABLE,
            Self::Upstream(_) | Self::Http(_) => StatusCode::BAD_GATEWAY,
            Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// Public error message safe to return to clients.
    pub fn public_message(&self) -> String {
        match self {
            Self::BadRequest(message) | Self::Upstream(message) => message.clone(),
            Self::NotFound | Self::Forbidden | Self::WebhookNotConfigured => self.to_string(),
            Self::Database(_) => "internal server error".to_string(),
            Self::Http(_) => "upstream request failed".to_string(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match &self {
            Self::Database(err) => tracing::error!(error = %err, "database error"),
            Self::Http(err) => tracing::error!(error = %err, "http client error"),
            Self::Upstream(err) => tracing::warn!(error = %err, "upstream error"),
            _ => {}
        }

        let status = self.status();
        let body = ErrorBody {
            error: self.public_message(),
        };

        (status, Json(body)).into_response()
    }
}

/// Convenient alias for handler results.
pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt;

    #[test]
    fn bad_request_uses_400() {
        let err = AppError::BadRequest("name must not be empty".into());
        assert_eq!(err.status(), StatusCode::BAD_REQUEST);
        assert_eq!(err.public_message(), "name must not be empty");
    }

    #[test]
    fn not_found_uses_404() {
        let err = AppError::NotFound;
        assert_eq!(err.status(), StatusCode::NOT_FOUND);
        assert_eq!(err.public_message(), "not found");
    }

    #[test]
    fn forbidden_uses_403() {
        let err = AppError::Forbidden;
        assert_eq!(err.status(), StatusCode::FORBIDDEN);
        assert_eq!(err.public_message(), "forbidden");
    }

    #[test]
    fn webhook_not_configured_uses_503() {
        let err = AppError::WebhookNotConfigured;
        assert_eq!(err.status(), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(err.public_message(), "webhook url is not configured");
    }

    #[test]
    fn upstream_uses_502() {
        let err = AppError::Upstream("webhook responded with 500".into());
        assert_eq!(err.status(), StatusCode::BAD_GATEWAY);
        assert_eq!(err.public_message(), "webhook responded with 500");
    }

    #[test]
    fn database_error_hides_details() {
        let err = AppError::Database(sqlx::Error::RowNotFound);
        assert_eq!(err.status(), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(err.public_message(), "internal server error");
    }

    #[tokio::test]
    async fn into_response_serializes_error_body() {
        let response = AppError::NotFound.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        let body: ErrorBody = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(
            body,
            ErrorBody {
                error: "not found".into()
            }
        );
    }
}
