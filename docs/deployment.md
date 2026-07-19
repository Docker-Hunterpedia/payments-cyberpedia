# Deployment (Dokploy)

Production runs as three containers built from this repo:

| Service | Image                              | Port | What it does                                     |
| ------- | ---------------------------------- | ---- | ------------------------------------------------ |
| `db`    | `postgres:17-alpine`               | 5432 | Data, persisted in the `db-data` volume          |
| `api`   | `apps/api/Dockerfile` (repo root context) | 3600 | NestJS API; migrates + seeds admin on start |
| `web`   | `apps/web/Dockerfile` (repo root context) | 80   | Static SPA served by nginx                  |

On every start the API container runs `prisma migrate deploy`, then creates
the **first admin account only if the users table is empty** (no demo data is
ever seeded in production), then starts the server.

## Dokploy setup

1. Create a **Compose** service in Dokploy pointing at this repository and
   `docker-compose.prod.yml`.
2. Copy the variables from `.env.production.example` into the service's
   Environment settings and fill in real values:
   - `POSTGRES_PASSWORD` — strong database password
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — `openssl rand -hex 32` each
   - `CORS_ORIGIN` — the public web URL (e.g. `https://pay.example.com`)
   - `VITE_API_URL` — the public API URL (e.g. `https://api.pay.example.com`)
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the first admin login
3. Attach domains (Dokploy issues HTTPS automatically):
   - web domain → service `web`, port **80**
   - API domain → service `api`, port **3600**
4. Deploy. First boot applies all migrations and prints
   `[seed] created first admin account: …` in the api logs.
5. Log in with the seed admin credentials, **change the password**, then add
   currencies, payment methods, courses, and other users in Settings.

`VITE_API_URL` is baked into the web build — changing it requires a redeploy
of the `web` service.

## Backups

In Dokploy, add a scheduled backup for the `db` service (Postgres) to S3 or
local storage. Test a restore once after setting it up:

```sh
# manual backup
docker exec <db-container> pg_dump -U cyberpedia -Fc cyberpedia_payments > backup.dump
# restore into a fresh database
docker exec -i <db-container> pg_restore -U cyberpedia -d cyberpedia_payments --clean < backup.dump
```

## Health checks

- API: `GET /` returns 200 (public). The api image also has a built-in
  Docker HEALTHCHECK against it.
- Web: nginx serves `/` (built-in HEALTHCHECK too).

## Local production rehearsal

```sh
cp .env.production.example .env.production   # fill in values
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
