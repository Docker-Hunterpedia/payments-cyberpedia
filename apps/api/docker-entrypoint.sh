#!/bin/sh
set -e
cd /app/apps/api

echo "[entrypoint] applying database migrations"
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] seeding first admin account (skipped when users exist)"
node prisma/seed-prod.mjs

echo "[entrypoint] starting API"
exec node dist/main.js
