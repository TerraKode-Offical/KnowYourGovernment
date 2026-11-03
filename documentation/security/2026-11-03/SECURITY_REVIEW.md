# Security Review — InformedVoter (2026-11-03)

Method: manual source review of every API route, middleware, auth helpers,
error handling, dependency tree, container/host configuration, and live probing
of production. No automated DAST beyond the existing Playwright suite.

---

## 1. Findings

Severity follows CVSS-style judgement for a public civic-information site.

| ID | Sev | Finding | Evidence | CWE / OWASP |
|---|---|---|---|---|
| **C-1** | Critical | **Cron pipeline dead since 2026-10-10.** Cron redirects to `/var/log/informedvoter-cron.log`, owned `root:root 0644`. Cron runs as `smsadmin`; bash fails the redirect before `curl` executes, so no sync job ever ran. | `bash: /var/log/informedvoter-cron.log: Permission denied`; `DataSyncLog` newest = 2026-10-10; 0-byte log since Oct 8 | CWE-732 (incorrect permission), availability |
| **C-2** | Critical | **No database backups.** `scripts/backup-db.sh` existed but was never scheduled; `/var/backups/informedvoter` did not exist; no crontab on `iv-data`. | `ls: cannot access '/var/backups/informedvoter'`; `no crontab for root` | CWE-693 (protection mechanism failure) |
| **C-3** | Critical | **Vulnerable Next.js 16.4.0 in production** — unauthenticated RCE in the Image Optimization API when SVG is used (GHSA-2464-fhr4-w9xw), plus App Router DoS (GHSA-p3m5-59mp-jv5r) and `use cache` RCE (GHSA-673q-mjm6-r5xr). Mitigated by `dangerouslyAllowSVG` being off (SVG requests return 400) but not fixed. | `npm audit --omit=dev`; `docker exec iv-app node -e "require('next/package.json').version"` → 16.4.0 | CWE-1395 (vulnerable dependency) |
| **C-4** | Critical | **`CRON_SECRET` exposed.** Stored in plaintext in the `smsadmin` crontab (readable by any shell on the host) and printed into this session's transcript during the review. | `crontab -l` output | CWE-522 (insufficiently protected credentials) |
| **H-1** | High | **No challenger data.** `sync-members` ingests only sitting members with `isIncumbent: true`; there was no FEC/state candidate source. Every race appeared uncontested. | `SELECT count(*) FROM "Candidate" WHERE "isIncumbent"` → 596/596 | Data integrity / civic accuracy |
| **H-2** | High | **Public write endpoints lacked abuse controls.** `/api/subscribe` re-sent mail to any address (5/min/IP only), no token expiry; `/api/local/meetings/submit` was an unauthenticated INSERT with no honeypot/origin check and unbounded `startTime`, and echoed the stored row (including the submitter's email); `/api/subscribe/demographics` accepted a bearer profile token with no throttle. | Source review | CWE-799 (improper control of interaction frequency), CWE-352 (CSRF) |
| **H-3** | High | **Error-handling regressions.** Local `try/catch` blocks in `ai/analyze-bill`, `ai/analyze-candidate`, `subscribe/demographics`, `candidates`, `bills` flattened `ValidationError`/`NotFoundError` into HTTP 500. | `/api/candidates?officeType=NOPE` returned 500 before; 400 after | CWE-755 (improper exception handling) |
| **H-4** | High | **Rate limiting fails open and trusts `cf-connecting-ip` unconditionally.** If the origin is ever reachable without Cloudflare, limits are bypassable. Non-API page routes are not limited. Compensating control: the DNAT is source-locked to Cloudflare ranges. | `src/middleware.ts`, `src/lib/rate-limit.ts` | CWE-770 (resource exhaustion) |
| **M-1** | Medium | **CSP requires `'unsafe-inline'` and `'unsafe-eval'`** for scripts. No nonce. Weakens XSS defence-in-depth. | Live header capture | CWE-1021 |
| **M-2** | Medium | **CSP `img-src` omitted `www.congress.gov`** while `next.config` allowed it, so member photos were blocked by CSP. | Header vs config comparison | CWE-1021 |
| **M-3** | Medium | **Only 2 of 13 cron jobs wrote `DataSyncLog`**, so the outage was invisible. | `sync-log` usage grep | CWE-778 (insufficient logging) |
| **M-4** | Medium | **No upper bound on `/api/bills?page=`** (large OFFSET scans); no request-body size cap on POST routes. | Source review | CWE-770 |
| **M-5** | Medium | **CourtListener token invalid** (`401`), so justice financial disclosures/gifts never populate (0 rows). | Live API probe | Data completeness |
| **M-6** | Medium | **AI and email keys absent in production** (empty `ANTHROPIC_API_KEY`, `RESEND_API_KEY`). AI jobs failed with errors; `/api/subscribe` told users "check your email" while sending nothing. | `docker exec iv-app printenv` length check | CWE-636 (failing open) |
| **L-1** | Low | Unused `errorMessage` variables in `district-lookup`/`polling-places`; `GET /api/subscribe/verify` mutates state (link scanners can auto-verify); no COOP/CORP headers; tracked `build*.log`/UAT artifacts; stray untracked file `are starti`. | Source review | Hygiene |

---

## 2. Controls verified as sound

- **Cron auth is defense-in-depth:** middleware checks Bearer/`?secret` with a
  constant-time compare; every handler re-verifies via `verifyCronSecret()`
  using `crypto.timingSafeEqual` with a dummy compare on length mismatch.
- **No SQL injection:** all queries go through Prisma parameterisation; the two
  `$queryRaw` usages interpolate only numeric constants.
- **No stored XSS path found:** external HTML is sanitised through
  `sanitize-html` with an explicit tag/attribute/scheme allowlist; the only
  `dangerouslySetInnerHTML` uses are sanitised content and JSON-LD with `<`
  escaped to `\u003c`.
- **No server actions / admin surface:** there is no authenticated UI, so no
  privilege-escalation path in the app layer.
- **Secrets hygiene:** `.env*` is untracked and `600`; git history contains no
  secrets (`git log --all -- .env*` empty).
- **Container posture:** app runs as `nextjs` (non-root), no privileged mode, no
  read-only-rootfs requirement; Postgres and Redis bind only to the VPC address
  `10.39.112.20` (not public); app port bound to `127.0.0.1:3000`.
- **Headers:** HSTS (preload), `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`, CORS
  restricted to the site origin with `Vary: Origin`.
- **Input validation:** every public route validates types, enum membership and
  lengths; search is capped at 200 chars and 10 results per type; list endpoints
  hard-cap result counts.

---

## 3. Changes made

### Dependencies
- `next` 16.4.0 → **16.4.5** (fixes all three advisories)
- `sanitize-html` 2.18.0 → **2.18.1** (drops vulnerable `deepmerge`)
- `zod` override → **4.6.7** (GHSA-mrhx-c7xc-m3w5)
- `npm ci` state rebuilt; `npm audit --omit=dev` → 0

### Authentication / credentials
- `CRON_SECRET` rotated (32 random bytes) in `/opt/informedvoter/.env` and the
  crontab; app container recreated.

### Request hardening (`src/lib/request-guard.ts`)
- `assertSameOrigin()` — rejects foreign `Origin` and `sec-fetch-site: cross-site`
- `assertJsonContentType()` — blocks HTML-form CSRF shapes
- `readJsonBody()` — hard body-size cap (4–16 KB by endpoint)
- `assertNoHoneypot()` — hidden `website` field
- `allowOnce()` — Redis per-address cooldown (fail-closed) for verification mail
- Applied to `/api/subscribe`, `/api/subscribe/demographics`,
  `/api/local/meetings/submit`, `/api/local/template`

### Email flow
- Verification links expire after 48 h (re-subscribe restarts the window)
- Per-address 10-minute resend cooldown (stops inbox bombing across IPs)
- No subscriber row is created when email is unconfigured; API returns 503
- UI hides the subscribe bar/forms when `RESEND_API_KEY` is absent

### Error handling
- Removed the 500-flattening `try/catch` behaviour in five routes
- Added `ForbiddenError` (403) and `ServiceUnavailableError` (503)
- Client helper `apiErrorMessage()` reads the standard `{message}` shape (the
  UI previously read `{error}` and always showed a generic fallback)

### Observability
- `src/lib/sync-log.ts` + `logSync()` now records every cron job
- `/api/health?verbose=1` returns per-job last run plus dataset freshness
  (aggregate counts/timestamps only — no PII)

### AI / optional integrations
- `src/lib/config.ts` feature flags; cron AI jobs skip cleanly when
  `ANTHROPIC_API_KEY` is absent; `/api/local/template` returns 503
- `analyze-bills` batch raised 10 → 25 and prioritises recent activity

### Headers
- CSP `img-src` now includes `www.congress.gov` and `congress.gov`

---

## 4. Accepted risks

| Risk | Rationale |
|---|---|
| Rate limiter fails open when Redis is down | Availability over strictness for a civic site; Redis is monitored and healthy |
| `cf-connecting-ip` trusted without verification | Origin is only reachable via Cloudflare (DNAT source-locked); revisit if that changes |
| CSP `'unsafe-inline'`/`'unsafe-eval'` | Required by the Next.js runtime without nonce plumbing; scheduled follow-up |
| AI/email features disabled | Operator has not provisioned keys; app now states this explicitly |

---

## 5. Recommended follow-ups (not blocking)

1. Nonce-based CSP via middleware with `strict-dynamic`.
2. Add `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`.
3. Caddy `trusted_proxies` + strip client-supplied CF headers at the edge.
4. Replace the static voter-info table with per-state verification against
   official election sites, storing `sourceUrl` + `verifiedAt` per row.
5. Investigate FEC Schedule A query for PAC contributions (currently 0).
6. Implement or remove the LegiScan integration; update `AGENTS.md` either way.
7. Seed municipalities for `/local` or label the hub as beta.
