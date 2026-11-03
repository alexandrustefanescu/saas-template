# API

Rust HTTP API for the SaaS template. Built with [Axum](https://docs.rs/axum), [SQLx](https://docs.rs/sqlx), Postgres, [reqwest](https://docs.rs/reqwest), and [even-better-auth](https://docs.rs/even-better-auth).

> even-better-auth is pre-1.0 and not security-reviewed. Fine for templates/local; do not treat it as production-hardened yet.

## Folder structure

```text
src/
  main.rs
  app.rs                  # router + middleware + mount_better_auth
  auth/                   # BetterAuth bootstrap (email/password, Google, bearer, admin)
  state.rs                # AppState (+ FromRef<BetterAuth>)
  config.rs
  handlers/               # /v1 HTTP adapters (AuthSession on protected routes)
  services/
  domain/
  infrastructure/
  middleware/rate_limit.rs
```

## Auth (even-better-auth)

Wire-compatible with the TypeScript better-auth client under **`/api/auth`**.

| Flow            | Endpoint                                                 |
| --------------- | -------------------------------------------------------- |
| Sign up         | `POST /api/auth/sign-up/email`                           |
| Sign in         | `POST /api/auth/sign-in/email`                           |
| Session         | `GET /api/auth/get-session`                              |
| Google OAuth    | `POST /api/auth/sign-in/social` (`providerId: "google"`) |
| Google callback | `GET /api/auth/callback/google`                          |
| Admin APIs      | `/api/auth/admin/*`                                      |

Current user helper: `GET /v1/me` (requires session).

**Bearer plugin:** successful sign-up/sign-in can return `set-auth-token`; send `Authorization: Bearer <token>` on `/v1` routes.

### Google OAuth setup

1. Create an OAuth client in Google Cloud Console.
2. Authorized redirect URI: `http://localhost:8080/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

### Roles / authorization

| Actor     | Items                            |
| --------- | -------------------------------- |
| Anonymous | 401 on `/v1/items*` and `/v1/me` |
| `user`    | CRUD own items only              |
| `admin`   | List/get any item                |

Bootstrap admins with `ADMIN_USER_IDS=<user-id>` or promote via admin plugin after an admin exists.

## API versioning & rate limits

- Business routes: `/v1/*` (rate-limited)
- Probe: `GET /health` (not rate-limited, unversioned)
- Env: `RATE_LIMIT_BURST`, `RATE_LIMIT_PERIOD_MS`

## Setup

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
# edit BETTER_AUTH_SECRET, GOOGLE_* in apps/api/.env
cd apps/api
cargo run
```

## Docs

| Resource      | URL                                         |
| ------------- | ------------------------------------------- |
| Swagger UI    | http://localhost:8080/swagger-ui/           |
| OpenAPI JSON  | http://localhost:8080/api-docs/openapi.json |
| Auth protocol | `/api/auth/*` (better-auth compatible)      |

## Tests

```bash
cargo test
```

Auth ownership/admin tests need Postgres (`DATABASE_URL`) and a valid `BETTER_AUTH_SECRET` (>= 32 chars). Without a DB they skip.
