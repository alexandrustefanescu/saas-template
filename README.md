# Vite+ Monorepo Starter

A starter for creating a Vite+ monorepo.

## Packages

| Package     | Path             | Stack              |
| ----------- | ---------------- | ------------------ |
| `dashboard` | `apps/dashboard` | React + Vite       |
| `api`       | `apps/api`       | Rust (Axum + SQLx) |
| `utils`     | `packages/utils` | TypeScript library |

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
vp run dev
```

- Or individually:

```bash
pnpm dev:dashboard
pnpm dev:api
```

API setup (Postgres + env): see [`apps/api/README.md`](apps/api/README.md).
