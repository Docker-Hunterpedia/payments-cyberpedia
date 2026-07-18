# Cyberpedia Payments

Self-hosted payment **collection & tracking** platform for courses — record
installment payments collected offline, follow up unpaid students, manage
teacher compensation, and get income/outcome/net-profit analytics.

📄 **Docs:** [docs/idea.md](docs/idea.md) (full specification) ·
[docs/development-checklist.md](docs/development-checklist.md) (build phases)

## Stack

- **Monorepo:** pnpm workspaces
- **`apps/web`** — Vite + React + TypeScript (mobile-first UI)
- **`apps/api`** — NestJS (Express) + Prisma + PostgreSQL
- **`packages/shared`** — shared enums, zod schemas, types (built with tsup)
- **Logging:** pino everywhere
- **Deploy:** Dokploy (Docker)

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 11
- Docker (for local PostgreSQL)

## Getting started

```bash
pnpm install

# local PostgreSQL
docker compose up -d

# environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# database schema + first admin user
pnpm --filter @cyberpedia/api exec prisma migrate dev
pnpm --filter @cyberpedia/api run db:seed

# build once (compiles packages/shared), then run everything in watch mode
pnpm build
pnpm dev
```

The seed creates the first admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
in `apps/api/.env` (default: `admin@cyberpedia.local`). Change the password
after first login.

- Web: http://localhost:5173
- API: http://localhost:3000

## Scripts (run from the repo root)

| Script           | What it does                                                |
| ---------------- | ----------------------------------------------------------- |
| `pnpm dev`       | Builds `shared`, then runs api + web + shared in watch mode |
| `pnpm build`     | Builds all packages (topological order)                     |
| `pnpm lint`      | ESLint over the whole repo (single root config)             |
| `pnpm format`    | Prettier write over the whole repo                          |
| `pnpm typecheck` | TypeScript checks for every package                         |
| `pnpm test`      | Runs tests in every package that has them                   |

## Structure

```
apps/
  web/        # Vite + React frontend
  api/        # NestJS backend
packages/
  shared/     # shared enums, zod schemas, types
docs/         # specification + development checklist
```
