# 05 â€” Security

## Threat model

| Actor | Capability | Primary controls |
|---|---|---|
| Anonymous internet user | Read pages, call public APIs | Rate limits, input validation, read-only surface |
| Abusive client | Flood, enumerate, scrape | Per-IP limits, result caps, no auth endpoints to brute force |
| Spam bot | Fill public forms | Honeypot, origin check, per-IP and per-address cooldowns |
| Network attacker | Intercept traffic | TLS at the CDN, HSTS preload |
| Compromised dependency | Supply chain | Pinned lockfile, `npm ci`, `npm audit` gate |
| Insider / host access | Read env, DB | Network-isolated DB, `600` env, rotated secrets, least-privilege containers |

There is no user account system, no admin panel, and no server actions â€” the
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
  'unsafe-eval' https://<analytics-host> https://<cdn-insights-host>;
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
- PostgreSQL and Redis bind only to a private interface.
- The app port is not published publicly; only the reverse proxy is exposed.
- Nightly `pg_dump` with 14-day rotation; restore drills performed.

## Accepted risks

| Risk | Rationale |
|---|---|
| Rate limiter fails open without Redis | Availability for a civic site |
| `cf-connecting-ip` trusted | The origin is only reachable through the CDN |
| CSP `'unsafe-inline'` / `'unsafe-eval'` | Next.js runtime requirement; nonce CSP planned |
| Shared `CRON_SECRET` (not per-job) | Small number of trusted callers; rotation is simple |

## Secret inventory

| Secret | Location | Rotation |
|---|---|---|
| `DATABASE_URL` password | app `.env`, data `.env` | `ALTER ROLE` + both envs |
| `REDIS_URL` password | same | `requirepass` + both envs |
| `CRON_SECRET` | app `.env` + crontab | see runbook |
| API keys | app `.env` | provider dashboard |
| TLS certificate/key | `docker/certs/` | certificate authority |

## Review history

- **2026-11-03** â€” full review and remediation:
  [`security/2026-11-03/`](./security/2026-11-03/). Fixed a dead cron pipeline,
  missing backups, critical dependency advisories, an exposed secret, missing
  challenger data, and public-write abuse controls.
