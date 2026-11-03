# SaaS template

Polyglot monorepo for a multi-tenant SaaS starter: a **React dashboard** and a **Rust Axum API** sharing one Postgres database. Auth, organisations, items, notifications, and webhooks are wired end-to-end — not just an empty shell.

|               |                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------- |
| **Dashboard** | http://localhost:3000                                                                               |
| **API**       | http://localhost:8080                                                                               |
| **Health**    | http://localhost:8080/health                                                                        |
| **Swagger**   | http://localhost:8080/swagger-ui/                                                                   |
| **Deep docs** | [`apps/dashboard/README.md`](apps/dashboard/README.md) · [`apps/api/README.md`](apps/api/README.md) |

---

## Table of contents

1. [What you get](#1-what-you-get)
2. [Repository layout](#2-repository-layout)
3. [Prerequisites](#3-prerequisites)
4. [Quick start](#4-quick-start)
5. [How local traffic works](#5-how-local-traffic-works)
6. [Day-to-day commands](#6-day-to-day-commands)
7. [Environment & secrets](#7-environment--secrets)
8. [Product surface](#8-product-surface)
9. [Architecture at a glance](#9-architecture-at-a-glance)
10. [Testing](#10-testing)
11. [Troubleshooting](#11-troubleshooting)
12. [Where to go next](#12-where-to-go-next)

---

## 1. What you get

**Dashboard** (`apps/dashboard`) — SPA with sign-in / sign-up / forgot-password, organisation onboarding, org switcher, home, items table, settings (profile, email, password, organisation, webhooks, account), and an organisation notification inbox.

**API** (`apps/api`) — Axum + SQLx service with even-better-auth (`/api/auth/*`), versioned business routes under `/v1/*` (me, items, webhooks, notifications), org tenancy via `activeOrganizationId`, rate limiting, CORS, and OpenAPI.

**Data** — Postgres 16 (Docker Compose). Auth tables migrate via better-auth on boot; app tables via SQLx migrations in `apps/api/migrations/`.

---

## 2. Repository layout

```text
saas-template/
  apps/
    dashboard/     # React 19 · Vite · TanStack Router · Spectrum S2 · better-auth client
    api/           # Rust Axum · SQLx · even-better-auth · utoipa
  packages/        # Reserved for future shared TS libs (empty placeholder)
  tools/           # Declared in workspace; not present yet
  docker-compose.yml
  package.json     # Root scripts (pnpm / Vite+)
  pnpm-workspace.yaml
```

Workspace members: `apps/*`, `packages/*`, `tools/*`. Shared JS dependency versions live in the pnpm `catalog` in `pnpm-workspace.yaml`.

---

## 3. Prerequisites

| Tool             | Version / notes                                                                     |
| ---------------- | ----------------------------------------------------------------------------------- |
| **Node.js**      | ≥ 22.18                                                                             |
| **pnpm**         | 12.x (devEngines can auto-download)                                                 |
| **Rust**         | Stable toolchain + Cargo (`cargo` must be on `PATH` for the API)                    |
| **Docker**       | For local Postgres (`docker compose`)                                               |
| **Google OAuth** | Client ID + secret required at API startup (even for email/password-only local use) |

Optional: `sqlx-cli` is not required — migrations run automatically when the API starts.

---

## 4. Quick start

From the repository root:

```bash
# 1. Install JS workspace deps
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure the API (required once)
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env:
#   - BETTER_AUTH_SECRET (≥ 32 characters)
#   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
#   - TRUSTED_ORIGINS=http://localhost:3000  (recommended)

# 4. Run dashboard + API together (labeled parallel output)
pnpm dev
```

Then open:

- **App:** http://localhost:3000
- **API health:** http://localhost:8080/health
- **OpenAPI UI:** http://localhost:8080/swagger-ui/

First boot runs SQLx migrations and `BetterAuth::migrate()`. Create an account in the UI; if you have no organisation yet you will be sent to **`/onboarding`**.

### Run apps separately

```bash
pnpm dev:dashboard   # Vite on :3000
pnpm dev:api         # cargo run on :8080
```

Equivalent Vite+ form:

```bash
vp run --parallel -F dashboard -F api --log labeled dev
```

> Do **not** use `vp run --parallel dashboard#dev api#dev` — the second specifier is treated as args to the first task and breaks the frontend root.

---

## 5. How local traffic works

```mermaid
flowchart LR
  browser[Browser :3000]
  vite[Vite proxy]
  api[API :8080]
  pg[(Postgres :5432)]

  browser -->|"/api/*, /v1/*"| vite
  vite --> api
  api --> pg
```

By default **leave `VITE_API_URL` unset** in the dashboard. The Vite dev server proxies `/api` and `/v1` to `http://localhost:8080`, so the browser stays same-origin and cookies work without CORS friction.

For a split deploy (dashboard and API on different origins), set `VITE_API_URL` to the public API URL and ensure `TRUSTED_ORIGINS` on the API includes the dashboard origin.

---

## 6. Day-to-day commands

| Command                | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `pnpm install`         | Install / link the workspace                 |
| `pnpm dev`             | Dashboard + API in parallel                  |
| `pnpm dev:dashboard`   | UI only                                      |
| `pnpm dev:api`         | API only                                     |
| `vp run -r test`       | Run tests in all packages that define `test` |
| `vp run -r build`      | Build all packages                           |
| `vp run ready`         | `vp check` + tests + builds (CI-style gate)  |
| `docker compose up -d` | Start Postgres                               |
| `docker compose down`  | Stop Postgres (volume kept)                  |

Package-local scripts (examples):

```bash
cd apps/dashboard && pnpm test && pnpm test:e2e
cd apps/api && cargo test && cargo clippy -- -D warnings && pnpm docs
```

---

## 7. Environment & secrets

### API — `apps/api/.env`

Copy from [`apps/api/.env.example`](apps/api/.env.example). Critical variables:

| Variable                                    | Required    | Purpose                                                             |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                              | yes         | Default matches Compose: `postgres://saas:saas@localhost:5432/saas` |
| `BETTER_AUTH_SECRET`                        | yes         | ≥ 32 characters                                                     |
| `BETTER_AUTH_URL`                           | no          | Public API base (default `http://localhost:8080`)                   |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes         | Fail-fast at process start                                          |
| `TRUSTED_ORIGINS`                           | recommended | e.g. `http://localhost:3000` for cookie CORS                        |
| `ADMIN_USER_IDS`                            | no          | Bootstrap platform admins                                           |
| `WEBHOOK_URL`                               | no          | Ops unsigned webhook; org endpoints are separate in DB              |
| `RATE_LIMIT_*`                              | no          | Token-bucket throttle on `/v1`                                      |

Never commit `.env`. Google redirect URI for local OAuth:  
`http://localhost:8080/api/auth/callback/google`.

### Dashboard

Usually **no** `.env`. Optional:

```bash
# apps/dashboard/.env — only if you bypass the Vite proxy
VITE_API_URL=http://localhost:8080
```

---

## 8. Product surface

| Area          | Behaviour                                                        |
| ------------- | ---------------------------------------------------------------- |
| Auth          | Email/password + Google via `/api/auth/*`                        |
| Onboarding    | Users with zero orgs go to `/onboarding` and create one          |
| Organisation  | Switcher in the shell; invite members in Settings → Organisation |
| Items         | Org-scoped CRUD under `/items` → `/v1/items`                     |
| Notifications | Bell inbox; unread is per user; `/v1/notifications`              |
| Webhooks      | Org endpoints in Settings; signed `item.created` delivery        |
| Settings      | Profile, email, password, organisation, webhooks, account        |

Tenancy rule: business `/v1` routes that need an org return **400** without `activeOrganizationId`, and **404** for resources outside the active organisation.

---

## 9. Architecture at a glance

```mermaid
flowchart TB
  subgraph ui [apps/dashboard]
    routes[routes]
    features[features by domain]
    libApi[lib/api + auth-client]
    routes --> features
    features --> libApi
  end

  subgraph backend [apps/api]
    auth["/api/auth"]
    slices["/v1 slices: health account items webhooks notifications"]
    auth --> pg[(Postgres)]
    slices --> pg
  end

  libApi -->|proxy or VITE_API_URL| auth
  libApi --> slices
```

- **Dashboard:** thin file routes; UI in `features/{auth,onboarding,shell,home,items,settings,organisations,notifications}`; HTTP helpers in `lib/api/*`.
- **API:** vertical slices under `src/{health,account,items,webhooks,notifications}`; shared `auth/` (Better Auth, `Actor`, org helpers); SQLx pool in `infrastructure/`.

Details, sequences, and contracts live in the app READMEs — do not duplicate them here when they change.

---

## 10. Testing

| Layer                  | How                                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| Workspace gate         | `vp run ready` or `vp run -r test` / `vp run -r build`                  |
| Dashboard unit         | `cd apps/dashboard && pnpm test`                                        |
| Dashboard e2e          | `cd apps/dashboard && pnpm test:e2e` (Playwright + mocked API)          |
| API unit + integration | `cd apps/api && cargo test` (integration needs Postgres + valid `.env`) |
| API docs               | `cd apps/api && cargo doc --no-deps --open`                             |

---

## 11. Troubleshooting

| Symptom                               | Likely cause                               | Fix                                                               |
| ------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Frontend 404 / Vite root contains `#` | Broken parallel task syntax                | Use `pnpm dev` (filter-based) or the two `dev:*` scripts          |
| API exits on start                    | Missing/short secret or missing Google env | Fill `apps/api/.env` from `.env.example`                          |
| Dashboard auth / CORS failures        | API not running or origins mismatch        | Check `:8080/health`; set `TRUSTED_ORIGINS=http://localhost:3000` |
| Proxy `ECONNREFUSED` on `/api`        | API still compiling or down                | Wait for `listening on 0.0.0.0:8080` in the `[api#dev]` log       |
| DB connection errors                  | Compose not up                             | `docker compose up -d` and verify port `5432`                     |
| Redirect loop to onboarding           | No organisation membership                 | Complete `/onboarding` or create an org in the API auth routes    |

---

## 12. Where to go next

| Doc                                                    | Contents                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`apps/dashboard/README.md`](apps/dashboard/README.md) | Routes, guards, forms, UI system, e2e, extending the SPA                |
| [`apps/api/README.md`](apps/api/README.md)             | Auth, tenancy, `/v1` contract, errors, rate limits, migrations, rustdoc |
| http://localhost:8080/swagger-ui/                      | Live OpenAPI for `/v1`                                                  |

This root README is the **operator entry point** (start, env, map of the repo). App READMEs are the **maintainer contracts** for each package.
