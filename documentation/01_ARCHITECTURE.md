# 01 — Architecture

## Runtime topology

```
Cloudflare (proxied, Full strict)
        │
        ▼
Caddy on iv-app (TLS via Cloudflare Origin CA, HTTP/2, compression)
        │  reverse_proxy app:3000
        ▼
Next.js standalone container (iv-app, non-root user `nextjs`)
        ├── Prisma ──────────────► PostgreSQL 17 (iv-data, 10.39.112.20:5432)
        ├── ioredis ─────────────► Redis 7        (iv-data, 10.39.112.20:6379)
        └── outbound HTTPS ──────► Congress.gov, OpenFEC, Google Civic,
                                   Oyez, CourtListener, USAspending,
                                   Anthropic, Resend (optional)
```

`iv-app` and `iv-data` are separate Proxmox VMs. The database and Redis bind
only to the VPC address and are never exposed publicly. The app port binds to
`127.0.0.1:3000` on the host; only Caddy is published.

## Request lifecycle

1. **Cloudflare** terminates the public TLS session and forwards to the origin
   (DNAT source-locked to Cloudflare ranges).
2. **Caddy** terminates TLS with the Origin CA certificate and proxies to the app.
3. **Middleware** (`src/middleware.ts`, Node runtime):
   - resolves the client IP (`cf-connecting-ip` → `x-real-ip` → rightmost XFF),
   - applies the rate-limit tier,
   - authenticates `/api/ai/*` and `/api/cron/*` (constant-time Bearer),
   - sets CORS headers scoped to the site origin.
4. **Route handler** (App Router) validates input, talks to Prisma or an external
   API, and returns JSON. Cron handlers re-verify the secret.
5. **Errors** are normalised by `withErrorHandler` into `{success, message, code}`
   with a request id; internal details are logged server-side only.

## Rendering strategy

- Default: **Server Components**; data is read directly through Prisma.
- Client components are used only for interactivity (forms, map, filters).
- Dynamic routes (`/state/[stateAbbr]`, `/bills/[billId]`, `/search`, `/sitemap.xml`)
  are server-rendered on demand (`ƒ`); stable pages are static (`○`).
- External fetches use explicit caching: Google Civic and USAspending use
  `next: { revalidate: 3600 }` / `86400`; cron fetches use `cache: "no-store"`.

## Data flow

```
host cron ──Bearer──► /api/cron/<job> ──► external API
                              │
                              ├──► Prisma upserts (idempotent)
                              └──► DataSyncLog row (logSync)

/api/health?verbose=1 ──► last run per job + dataset age (aggregates only)
```

All sync jobs are idempotent: they upsert by an external identifier (bill
`externalId`, FEC `candidate_id`, Oyez id, etc.) so a re-run repairs gaps rather
than duplicating rows.

## Key modules

| Path | Responsibility |
|---|---|
| `src/middleware.ts` | Rate limiting, cron/AI auth, CORS |
| `src/lib/auth.ts` | `verifyCronSecret` (timing-safe) |
| `src/lib/rate-limit.ts` | Redis fixed window, distributed lock, one-shot cooldown |
| `src/lib/request-guard.ts` | Origin/JSON/body-size/honeypot checks |
| `src/lib/sanitize.ts` | `sanitize-html` allowlist |
| `src/lib/api-error-handler.ts` | Error mapping + logging wrapper |
| `src/lib/errors/` | `AppError` hierarchy (400/401/403/404/429/500/502/503) |
| `src/lib/config.ts` | Optional-integration feature flags |
| `src/lib/sync-log.ts` | `DataSyncLog` writer |
| `src/lib/ai/claude-client.ts` | Prompts, JSON extraction, model calls |
| `src/lib/db.ts` | Prisma singleton |

## Failure behaviour

| Failure | Behaviour |
|---|---|
| Redis down | Rate limiter fails **open**; app keeps serving |
| Anthropic key missing | AI cron jobs skip; `/api/local/template` → 503 |
| Resend key missing | `/api/subscribe` → 503; subscribe UI hidden |
| External API 429/5xx | Job returns 502/500, logs to `DataSyncLog`; next run retries |
| Postgres down | `/api/health` → 503 `degraded`; pages surface the error boundary |
