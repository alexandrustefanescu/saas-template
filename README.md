# SaaS template monorepo

Vite+ workspace with a React dashboard and a Rust Axum API. The product surface includes organisations (create/switch/invite), onboarding, items, notifications, and webhooks — not only an auth shell.

## Packages

| Package     | Path             | Stack              |
| ----------- | ---------------- | ------------------ |
| `dashboard` | `apps/dashboard` | React + Vite       |
| `api`       | `apps/api`       | Rust (Axum + SQLx) |

`pnpm-workspace.yaml` also globs `packages/*` and `tools/*`. `packages/` is reserved for future shared TypeScript libraries (e.g. OpenAPI-derived client types); there is no shared package yet. `tools/` is not present on disk yet (same placeholder pattern).

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run dashboard + API together:

```bash
pnpm dev
# or: vp run --parallel -F dashboard -F api --log labeled dev
```

- Or individually:

```bash
pnpm dev:dashboard
pnpm dev:api
```

API setup (Postgres + env): see [`apps/api/README.md`](apps/api/README.md).  
Dashboard architecture: see [`apps/dashboard/README.md`](apps/dashboard/README.md).
