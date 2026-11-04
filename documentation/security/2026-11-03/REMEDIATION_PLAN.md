# Remediation Plan — 2026-11-03

Ordered by risk to a live election-day audience. Every Phase 0–2 item is
complete; Phase 3 items are follow-ups that require operator credentials or
product decisions.

---

## Phase 0 — Stop the bleeding (complete)

| # | Action | Why first |
|---|---|---|
| 0.1 | Rotate `CRON_SECRET`; update `.env` + crontab; recreate container | Secret was in plaintext and in the review transcript |
| 0.2 | Fix cron log ownership; add `--max-time 900`; add logrotate | The pipeline had been dead 24 days |
| 0.3 | Run every sync manually and verify counts | Prove the pipeline works end-to-end |
| 0.4 | Take an immediate backup; install nightly cron; run a restore drill | Zero backups on election day |
| 0.5 | Upgrade `next` 16.4.5, `sanitize-html` 2.18.1, `zod` 4.6.7; rebuild | Critical RCE advisory in production |

## Phase 1 — Report (complete)

`documentation/security/2026-11-03/` — README, security review, freshness,
plan, status, test report, artifacts.

## Phase 2 — Code hardening (complete)

| # | Action | Files |
|---|---|---|
| 2.1 | Origin + JSON + size + honeypot guards | `src/lib/request-guard.ts`; subscribe, demographics, meetings/submit, template |
| 2.2 | Per-address email cooldown (fail-closed) | `src/lib/rate-limit.ts` (`allowOnce`), subscribe |
| 2.3 | 48 h verification-token expiry | subscribe, subscribe/verify |
| 2.4 | Stop flattening typed errors into 500s | bills, candidates, ai/analyze-bill, ai/analyze-candidate, demographics |
| 2.5 | Graceful degradation for missing keys | `src/lib/config.ts`; AI routes, subscribe, layout, subscribe forms |
| 2.6 | Full `DataSyncLog` coverage + freshness endpoint | `src/lib/sync-log.ts`, 9 cron routes, `/api/health` |
| 2.7 | Client error-message helper | `src/lib/api-client.ts` + 6 components |
| 2.8 | CSP `img-src` fix | `next.config.mjs` |

## Phase 3 — Data completeness (partly complete)

| # | Action | Status |
|---|---|---|
| 3.1 | FEC 2026 candidate ingestion (challengers) | **Done** — 2,076 created, 574 matched |
| 3.2 | Expand campaign-finance coverage | **Done** — 96 → 190 candidates (weekly cron continues) |
| 3.3 | Verify voter-info rows against official sources | **Open** — needs research time; schema already has `lastUpdated` |
| 3.4 | CourtListener disclosures | **Blocked** — invalid token |
| 3.5 | PAC contribution query | **Open** — returns 0 rows |
| 3.6 | Cosponsor ingestion | **Open** |
| 3.7 | State bills (LegiScan) | **Blocked** — upstream challenge from the server |
| 3.8 | Local municipalities seed | **Open** — product decision |
| 3.9 | AI backlog | **Blocked** — no Anthropic key |

## Phase 4 — Verification (complete)

Unit (Vitest), typecheck, lint, live API contract suite, Chromium UI suite,
manual cron runs, SQL freshness assertions, backup restore drill, audit.

## Phase 5 — Deploy (complete)

Pushed `0d6f52a` and `1a43c4b`; rebuilt the app + proxy containers; health green.

---

## Deferred with rationale

| Item | Why deferred |
|---|---|
| Nonce-based CSP | Requires middleware nonce plumbing across every page; current CSP is still strict on `default-src`/`frame-ancestors` |
| Caddy `trusted_proxies` | Would require enumerating Cloudflare ranges and risks breaking rate-limit keys; current DNAT is source-locked |
| Page-route rate limiting | Adds a Redis round-trip to every page view; CDN absorbs most abuse |
| Importing all FEC filings (7,424) | Would flood the site with paper candidates; conservative filter chosen |
