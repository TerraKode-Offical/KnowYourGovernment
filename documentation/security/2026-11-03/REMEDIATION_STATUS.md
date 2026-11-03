# Remediation Status — 2026-11-03

| ID | Finding | Status | Verification |
|---|---|---|---|
| C-1 | Cron pipeline dead (log permissions) | **Fixed & deployed** | 15 jobs run manually; `DataSyncLog` rows created; log writable by `smsadmin` |
| C-2 | No database backups | **Fixed** | `informedvoter-20261103-202529.dump.gz` (1.6 MB) created; restore drill returned 7,476 bills / 596 candidates at the time |
| C-3 | Next.js 16.4.0 critical advisories | **Fixed & deployed** | Production reports `next 16.4.5`; `npm audit --omit=dev` → 0 |
| C-4 | `CRON_SECRET` exposure | **Fixed** | New 32-byte secret in `.env` + crontab; container recreated; old value rejected |
| H-1 | No challenger data | **Fixed** | FEC sync: 2,660 processed → 2,076 created, 574 matched, 10 skipped, 0 errors |
| H-2 | Public write abuse controls | **Fixed & deployed** | Live: cross-origin POST → 403; honeypot → 400; subscribe 503 when unconfigured; per-address cooldown |
| H-3 | Validation errors flattened to 500 | **Fixed & deployed** | Live: invalid `officeType` → 400; unknown state → 404; short search → 400 |
| H-4 | Rate limiter fail-open / CF header trust | **Accepted (compensating control)** | DNAT source-locked to Cloudflare; documented in `SECURITY_REVIEW.md` |
| M-1 | CSP `unsafe-inline`/`unsafe-eval` | **Accepted, follow-up** | Documented; nonce CSP planned |
| M-2 | CSP `img-src` missing congress.gov | **Fixed & deployed** | Header now includes `https://www.congress.gov https://congress.gov` |
| M-3 | Only 2 jobs logged to `DataSyncLog` | **Fixed & deployed** | `logSync()` added to 9 routes; `/api/health?verbose=1` live |
| M-4 | Unbounded `page` / body size | **Fixed** | Body caps on all POSTs; page param still uncapped (tracked) |
| M-5 | CourtListener token invalid | **Blocked** | Live probe returns 401; needs a new token |
| M-6 | AI/email keys absent | **Mitigated** | Cron AI jobs skip; `/api/local/template` → 503; subscribe → 503; UI hides forms |
| L-1 | Hygiene items | **Partly fixed** | Stray `are starti` removed; unused vars remain (warnings only) |

---

## Data-source status

| Source | Status | Last verified |
|---|---|---|
| Congress.gov v3 (members, bills, votes) | **Healthy** | 2026-11-03 |
| OpenFEC (candidates, finance) | **Healthy** | 2026-11-03 |
| Google Civic (elections, polling places, districts) | **Healthy** | 2026-11-03 |
| Oyez (justices, cases) | **Healthy** | 2026-11-03 |
| CourtListener (disclosures) | **Unauthorized** | 2026-11-03 |
| unitedstates/congress-legislators (social) | **Healthy** | 2026-11-03 |
| Legistar (local meetings) | **No data** | n/a — no municipalities |
| LegiScan (state bills) | **Not integrated / blocked** | n/a |
| State election sites (voter info) | **Static table** | 2026-11-03 (upsert only) |
| Anthropic (AI analysis) | **Not configured** | n/a |
| Resend (email) | **Not configured** | n/a |

---

## Operational changes on the hosts

**`iv-app`**
- `/var/log/informedvoter-cron.log` → `smsadmin:crontab 0640`
- `/etc/logrotate.d/informedvoter-cron` added (weekly, 8 rotations)
- crontab rewritten with rotated secret and `--max-time 900`; 15 jobs
- app + caddy rebuilt from `1a43c4b`

**`iv-data`**
- `/var/backups/informedvoter/` created
- `/etc/cron.d/informedvoter-backup` — nightly 02:15 UTC
- first backup created and restore-verified

**Secrets**
- `CRON_SECRET` rotated (32 random bytes) in `/opt/informedvoter/.env` and the
  crontab; app container recreated.
- Rotated a second time after the review transcript exposure; `.env` and the
  crontab were verified to hold the same value, the previous value returns
  `401`, the current value returns `200`, and the exact crontab command was
  executed successfully. Stale `.env.bak.*` files (which held the exposed
  value) were deleted. The value is never printed in logs or reports.

---

## Open actions for the operator

1. Provide `ANTHROPIC_API_KEY` (AI summaries + speaking templates).
2. Provide `RESEND_API_KEY` (subscriptions + digest) — the UI stays hidden until then.
3. Provide a valid `COURTLISTENER_API_TOKEN` (justice disclosures).
4. Decide on LegiScan for state bills.
5. Decide on seeding municipalities for `/local`.
6. Review the FEC "serious candidates" filter (raised funds + statutory status).
