# ═══════════════════════════════════════════════════════════════════════════
# InformedVoter — Production Dockerfile
# Multi-stage build for minimal image size and security
# ═══════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies + Build
# ───────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (native modules, Prisma engines)
RUN apk add --no-cache openssl libc6-compat

# Copy dependency manifests first (better Docker layer caching)
COPY package.json package-lock.json* ./
# Install ALL deps (including the pinned `prisma` devDependency) with scripts
# disabled, so `npx prisma generate` below uses the same pinned CLI version
# rather than fetching an unpinned one from the registry (finding H-4).
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy Prisma schema and generate client BEFORE copying source
# This layer is cached unless schema changes
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY . .

# Build the Next.js app for production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# NEXT_PUBLIC_* must be present at build time (Next inlines them into the bundle)
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_UMAMI_SCRIPT_URL=$NEXT_PUBLIC_UMAMI_SCRIPT_URL
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID

RUN npm run build

# ───────────────────────────────────────────────────────────────────────────
# Stage 2: Production runtime
# ───────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install runtime deps only
RUN apk add --no-cache openssl curl

# Copy standalone output (includes server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + generated client (for runtime if ever needed)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
