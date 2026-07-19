# Cyberpedia Payments API — production image.
# Build context must be the REPO ROOT (monorepo):
#   docker build -f apps/api/Dockerfile .
# On start: prisma migrate deploy → seed first admin (if no users) → serve.

# ---- build: full install, compile shared + api, generate prisma client ----
FROM node:22-slim AS build
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.14.0
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm --filter @cyberpedia/api --filter @cyberpedia/shared install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @cyberpedia/shared run build \
  && pnpm --filter @cyberpedia/api exec prisma generate \
  && pnpm --filter @cyberpedia/api run build

# ---- prod-deps: production-only node_modules + generated prisma client ----
FROM node:22-slim AS prod-deps
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.14.0
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm --filter @cyberpedia/api --filter @cyberpedia/shared install --frozen-lockfile --prod
COPY apps/api/prisma apps/api/prisma
RUN pnpm --filter @cyberpedia/api exec prisma generate

# ---- runtime ----
FROM node:22-slim AS runtime
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app /app
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3600
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3600)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
