# 05 — Security

## Threat model

| Actor | Capability | Primary controls |
|---|---|---|
| Anonymous internet user | Read pages, call public APIs | Rate limits, input validation, read-only surface |
| Abusive client | Flood, enumerate, scrape | Per-IP limits, result caps, no auth endpoints to brute force |
| Spam bot | Fill public forms | Honeypot, origin check, per-IP and per-address cooldowns |
| Network attacker | Intercept traffic | TLS (Cloudflare Full strict + Origin CA), HSTS preload |
| Compromised dependency | Supply chain | Pinned lockfile, `npm ci`, `npm audit` gate |
| Insider / host access | Read env, DB | VPC-only DB, `600` env, rotated secrets, least-privilege containers |

There is no user account system, no admin panel, and no server actions — the
authenticated surface is limited to cron/AI endpoints protected by a shared
Bearer secret.

## Controls

### Authentication

- `/api/ai/*` and `/api/cron/*` require `Authorization: Bearer <CRON_SECRET>`.
- Middleware performs a constant-time compare; handlers re-verify with
  `crypto.timingSafeEqual` (dummy compare on length mismatch).
- `?manual=true` bypass is development-only and requires `ALLOW_MANUAL_CRON=true`.

### Rate limiting

| Route | Limit |
|---|---|
| `/api/ai/*`, `/api/cron/*` | 300 / 60 s per IP |
| `/api/subscribe` POST | 5 / 60 s per IP |
| `/api/local/meetings/submit` | 5 / 3600 s per IP |
| `/api/local/template` | 5 / 3600 s per IP |
| All other `/api/*` | 60 / 60 s per IP |

Redis fixed windows. Fails open if Redis is down (documented trade-off).

### Input handling

- Every route validates type, enum membership, and length.
- Public writes require same-origin, `application/json`, and a body-size cap.
- A hidden `website` field acts as a honeypot.
- `sanitize-html` allowlist for external HTML; JSON-LD escapes `<`.

### Headers (production)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  'unsafe-eval' https://analytics.knowyourgov.us https://static.cloudflareinsights.com;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()
```

No `X-Powered-By`.

### Infrastructure

- App container runs as `nextjs` (uid 1001), not root.
- Postgres and Redis bind only to `10.39.112.20` (VPC).
- App port binds to `127.0.0.1:3000`.
- Origin DNAT is source-locked to Cloudflare ranges.
- Nightly `pg_dump` with 14-day rotation; restore drills performed.

## Accepted risks

| Risk | Rationale |
|---|---|
| Rate limiter fails open without Redis | Availability for a civic site |
| `cf-connecting-ip` trusted | Origin only reachable via Cloudflare |
| CSP `'unsafe-inline'` / `'unsafe-eval'` | Next.js runtime requirement; nonce CSP planned |
| Shared `CRON_SECRET` (not per-job) | Small number of trusted callers; rotation is simple |

## Secret inventory

| Secret | Location | Rotation |
|---|---|---|
| `DATABASE_URL` password | `iv-app` `.env`, `iv-data` `.env` | `ALTER ROLE` + both envs |
| `REDIS_URL` password | same | `requirepass` + both envs |
| `CRON_SECRET` | `iv-app` `.env` + crontab | see runbook |
| API keys | `iv-app` `.env` | provider dashboard |
| Origin CA cert/key | `iv-app` `docker/certs/` | Cloudflare dashboard |

## Review history

- **2026-11-03** — full review and remediation:
  [`security/2026-11-03/`](./security/2026-11-03/). Fixed a dead cron pipeline,
  missing backups, critical dependency advisories, an exposed secret, missing
  challenger data, and public-write abuse controls.
