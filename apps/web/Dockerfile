# Cyberpedia Payments web — production image (static build served by nginx).
# Build context must be the REPO ROOT (monorepo):
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.example.com .
# VITE_API_URL is baked in at build time and must be the PUBLIC URL of the API.

FROM node:22-slim AS build
RUN npm install -g pnpm@11.14.0
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm --filter @cyberpedia/web --filter @cyberpedia/shared install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required (public API URL)" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @cyberpedia/shared run build \
  && pnpm --filter @cyberpedia/web run build

FROM nginx:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
