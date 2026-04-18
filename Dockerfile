# Multi-stage Dockerfile for live.eidosagi.com Next.js app.
#
# Used for the EPYC migration (TASK-0050). Railway currently uses Nixpacks
# auto-detect; once this file lands Railway will prefer Docker unless pinned
# otherwise. When cutover runs, the railway service flips to "disabled" and
# the EPYC host serves via docker-compose.yml + Caddyfile in this repo.
#
# Base: node:20-alpine (pnpm via corepack, no rebuild of node on every layer)
# SQLite: better-sqlite3 is a native module; alpine needs build tooling in
# the builder stage, not the runtime stage.

# ─── builder ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Toolchain for better-sqlite3's native build.
RUN apk add --no-cache python3 make g++

# Enable pnpm 9.14.4 (matches package.json packageManager field).
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

# Install deps first (cache layer separate from source).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ─── runtime ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# better-sqlite3 at runtime needs libc6-compat; python/g++ NOT needed.
RUN apk add --no-cache libc6-compat

# Pnpm available for `pnpm start`.
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

# Non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# Copy the built app + production dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
# Migrations are read at runtime by src/lib/db.ts (not baked into .next).
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/migrations ./src/lib/migrations

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# DATABASE_PATH defaults to /data/eidos-live.sqlite (see src/lib/db.ts).
# docker-compose.yml mounts a host volume at /data for SQLite durability.

CMD ["pnpm", "start"]
