# Security Policy

## Reporting a vulnerability

Please email **security@knowyourgov.us** with:

- a description of the issue and its impact,
- steps to reproduce (URL, request, or payload),
- any relevant logs or screenshots.

Do **not** open a public issue for a suspected vulnerability. We aim to
acknowledge reports within 72 hours and to ship a fix or mitigation within 14
days for confirmed high-severity issues.

We will credit reporters on request. We do not pursue legal action against
good-faith research that respects user privacy and avoids service disruption.

## Scope

In scope: `https://knowyourgov.us`, its API routes, and this repository.

Out of scope: denial-of-service testing against production, social engineering,
physical access, and third-party services (Cloudflare, GitHub, government APIs).

## Current controls

| Control | Implementation |
|---|---|
| Authentication (cron/AI) | Constant-time Bearer check in middleware **and** route handlers |
| Rate limiting | Redis fixed-window per IP; stricter tiers for subscribe and AI |
| CSRF / write abuse | Same-origin + `application/json` + body-size cap + honeypot |
| Email abuse | Per-address Redis cooldown; 48-hour verification expiry |
| XSS | `sanitize-html` allowlist, JSON-LD escaping, strict CSP |
| SQL injection | Prisma parameterisation only |
| Headers | HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `frame-ancestors 'none'` |
| Secrets | `.env` untracked and `600`; no secrets in git history |
| Infrastructure | Containers run non-root; DB/Redis bind to the VPC only |
| Backups | Nightly `pg_dump`, 14-day rotation, restore drills |
| Error exposure | Typed errors mapped to safe messages; no stack traces to clients |

## Known accepted risks

- The rate limiter **fails open** if Redis is unavailable (availability choice).
- `cf-connecting-ip` is trusted because the origin is only reachable through
  Cloudflare (DNAT source-locked).
- CSP allows `'unsafe-inline'`/`'unsafe-eval'` for scripts (Next.js runtime);
  nonce-based CSP is a planned follow-up.

## Review history

| Date | Report |
|---|---|
| 2026-11-03 | [`documentation/security/2026-11-03/`](./documentation/security/2026-11-03/) — full review, remediation, and test report |
