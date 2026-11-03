# AGENTS.md — KnowYourGov

Single source of truth for AI coding agents. Update this file when you change
the build, folder structure, data pipeline, or security model.

---

## Project

**KnowYourGov** (`https://knowyourgov.us`) is a nonpartisan US civic-information
platform: Congress, the Supreme Court, federal agencies, campaign finance,
elections, and local government, explained in plain English.

Stack: **Next.js 16 (App Router) + TypeScript 5.9 (strict) + Tailwind v4 +
Prisma 5.22 + PostgreSQL 17 + Redis 7**, self-hosted on Proxmox behind Caddy and
Cloudflare. Anthropic and Resend are optional integrations.

---

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install (runs `prisma generate`) |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (live site by default) |
| `npm run test:e2e:api` | API contract suite only |
| `npm run db:push` | Apply Prisma schema |
| `npm run db:seed` | Seed reference data |
| `npm run db:studio` | Prisma Studio |

Node 22+. There is no enforced formatter; match surrounding style (2 spaces).

---

## Structure

```
src/app/                  Pages + API routes (App Router)
src/app/api/cron/         Scheduled sync + analysis jobs
src/app/api/ai/           On-demand AI endpoints (Bearer auth)
src/app/api/health/       Liveness + verbose freshness report
src/components/           ui/ layout/ features/ seo/ error/
src/lib/                  db, auth, rate-limit, sanitize, ai/, errors/, guards
prisma/                   schema.prisma + seeds
e2e/                      Playwright specs
documentation/            Architecture, data, deployment, ops, security
scripts/                  deploy.sh, backup-db.sh, cron-setup.sh
```

Use `@/` imports (maps to `src/`). Default to Server Components; add
`"use client"` only for interactivity.

---

## Security model

1. **Middleware** (`src/middleware.ts`, Node runtime) rate-limits all `/api/*`
   and authenticates `/api/ai/*` and `/api/cron/*` with a constant-time Bearer
   check. Cron also accepts `?secret=`.
2. **Handler auth** — every cron route re-verifies with
   `verifyCronSecret()` (`src/lib/auth.ts`) using `crypto.timingSafeEqual`.
   Defense in depth: do not remove either layer.
3. **Public writes** — `src/lib/request-guard.ts` enforces same-origin,
   `application/json`, a body-size cap and a honeypot. Applied to subscribe,
   demographics, meetings/submit and local/template.
4. **Sanitization** — external HTML goes through `sanitizeHtml()`
   (`src/lib/sanitize.ts`). Never pass raw external HTML to
   `dangerouslySetInnerHTML`.
5. **Error handling** — wrap routes with `withErrorHandler` /
   `withCronErrorHandler`. Do not add local `try/catch` that swallows
   `AppError`; it turns 400/404 into 500.
6. **Optional integrations** — check `src/lib/config.ts` before calling Claude
   or Resend. Missing keys must return `503`/skip, never 500 or a false success.
7. **Rate limiting fails open** when Redis is unavailable (intentional).

---

## Data pipeline

15 host-cron jobs call `/api/cron/*` with a Bearer secret. Every job records a
row in `DataSyncLog` via `logSync()` (`src/lib/sync-log.ts`).
`GET /api/health?verbose=1` reports the last run per job plus dataset age.

| Job | Schedule | Source |
|---|---|---|
| `sync-local-meetings` | 04:00 daily | Legistar |
| `sync-scotus` | 05:00 daily | Oyez + CourtListener |
| `sync-members` | 06:00 daily | Congress.gov |
| `sync-bills` | 07:00 daily | Congress.gov |
| `sync-votes` | 08:00 daily | Congress.gov |
| `sync-campaign-finance` | Mon 09:00 | OpenFEC |
| `sync-elections` | Mon 10:00 | Google Civic |
| `sync-candidates` | Mon 10:45 | OpenFEC |
| `sync-pac-contributions` | Wed 10:00 | OpenFEC |
| `sync-social` | Fri 10:30 | congress-legislators |
| `sync-voter-info` | 1st 11:00 | static table |
| `analyze-bills` | 12:00 daily | Claude |
| `analyze-candidates` | 13:00 daily | Claude |
| `analyze-cases` | 14:00 daily | Claude |
| `send-digest` | 15:00 daily | Resend |

**Cron log ownership:** jobs append to `/var/log/informedvoter-cron.log`, which
must be writable by the crontab owner (`smsadmin`). A root-owned file makes bash
fail the redirect *before* `curl` runs — every job fails silently. All entries
use `--max-time 900`.

---

## Pitfalls

- **Prisma singleton** — import `prisma` from `@/lib/db`; never `new PrismaClient()`.
- **Middleware runtime** — must stay `nodejs` (ioredis needs TCP).
- **`next.config.mjs` CSP** — `img-src` must include every remote image host
  (`www.congress.gov`, `bioguide.congress.gov`, `theunitedstates.io`, `*.oyez.org`).
- **FEC candidates** — `sync-candidates` imports `cycle=2026`,
  `candidate_status=C`, `has_raised_funds=true`. It is not a full ballot list.
- **Voter info is static** (`sync-voter-info`), not scraped; date fields are null.
- **No LegiScan integration**, despite older docs. State bill pages show federal
  bills sponsored by that state's delegation.
- **`/local` is empty** until municipalities are seeded.
- **Backups** — nightly `pg_dump` on `iv-data` (`/etc/cron.d/informedvoter-backup`).

---

## Testing expectations

Before finishing a change:

```bash
npm run typecheck
npm run lint
npm test
```

For API/UI changes, run `npm run test:e2e:api` (and `test:e2e` when practical).
Unit tests live in `src/lib/__tests__/`; E2E in `e2e/`.

---

## Deployment

Two Proxmox VMs:

- **`iv-app`** — Caddy (TLS), Next.js app, Umami. Deploy: `./scripts/deploy.sh`
  (git pull + `docker compose -f docker-compose.app.yml up -d --build`).
- **`iv-data`** — PostgreSQL 17 + Redis 7, VPC-only (`10.39.112.20`).
  Deploy: `docker compose -f docker-compose.data.yml up -d`.

Ingress: Cloudflare (proxied, Full strict) → DNAT source-locked to Cloudflare →
Caddy → app. Database and Redis are never publicly reachable.

Full runbook: [`documentation/03_DEPLOYMENT.md`](./documentation/03_DEPLOYMENT.md)
and [`documentation/04_OPERATIONS.md`](./documentation/04_OPERATIONS.md).
