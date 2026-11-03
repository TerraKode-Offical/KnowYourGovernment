# Test Report — 2026-11-03

Environment: Windows workstation (Node 22) for build/test; `iv-app`
(`10.10.10.130`) for deployment and live probes; `iv-data`
(`10.10.10.131`) for database assertions.

---

## 1. Static checks

| Command | Result |
|---|---|
| `npm install` | 26 added, 19 removed, 72 changed; `prisma generate` OK |
| `npx tsc --noEmit` | **clean** (0 errors) |
| `npm run lint` | **0 errors**, 97 pre-existing warnings |
| `npm audit --omit=dev` | **found 0 vulnerabilities** |
| Resolved versions | `next 16.4.5`, `zod 4.6.7`, `sanitize-html 2.18.1`, `deepmerge` absent |

## 2. Unit tests (Vitest)

```
npm test
Test Files  5 passed (5)
Tests       53 passed (53)
```

Includes 15 new tests covering `assertSameOrigin`, `assertJsonContentType`,
`readJsonBody` size cap, honeypot, and `apiErrorMessage` shapes.

## 3. Live API contract suite (Playwright, `--project=api`)

```
23 passed (31.6s)
```

Covers: health, bills limit cap, invalid chamber → 400, unknown state → 404,
invalid officeType → 400, search validation, SCOTUS term validation,
district-lookup/polling-places missing address → 400, subscribe invalid email →
400, local endpoints structured 400s, AI/cron auth 401s, `?manual=true` → 403,
congress.gov image proxy, CSP analytics beacon, sitemap, subscribe rate limit.

## 4. Live UI suite (Playwright, Chromium)

```
49 passed, 2 skipped (16.1s)
```

Smoke across 25 routes, deep-link navigation, real 404, responsive overflow,
image integrity.

## 5. Manual cron execution (post-fix)

All run against `http://localhost:3000` with the rotated Bearer secret.

| Job | HTTP | Result |
|---|---|---|
| `sync-members` | 200 | 539/539 updated, 79 s |
| `sync-bills` | 200 | 500 processed (295 created, 205 updated), 75 s |
| `sync-votes` | 200 | 20 roll calls, 14 skipped (bill not in DB), 0 new votes |
| `sync-elections` | 200 | 1 created, 1 updated, 1 skipped |
| `sync-campaign-finance?limit=150` | 200 | 94 synced, 31 no FEC id, 25 no data, 583 s |
| `sync-scotus` | 200 | 160 cases synced, 30 justices skipped, 0 disclosures |
| `sync-social` | 200 | 517 updated of 518 |
| `sync-voter-info` | 200 | 50 upserted |
| `sync-local-meetings` | 200 | 0 (no municipalities) |
| `sync-pac-contributions` | 200 | 0 contributions, 30 candidates, 403 s |
| `analyze-bills` | 200 | 0 analyzed, 10 errors (no API key) → now skips cleanly |
| `analyze-candidates` | 200 | 0 analyzed, 50 errors (no API key) → now skips cleanly |
| `analyze-cases` | 200 | no cases needed |
| `sync-candidates` (new) | 200 | 2,660 seen → 2,076 created, 574 updated, 10 skipped, 0 errors, 44 s |

## 6. Live security probes (production)

| Probe | Expected | Observed |
|---|---|---|
| `GET /api/cron/sync-members` (no auth) | 401 | **401** |
| `POST /api/ai/analyze-bill` (no token) | 401 | **401** |
| `POST /api/subscribe` with `Origin: https://evil.example` | 403 | **403** |
| `POST /api/subscribe` same-origin, email unconfigured | 503 | **503** |
| `POST /api/local/meetings/submit` with honeypot filled | 400 | **400** |
| `POST /api/local/meetings/submit` same-origin, valid body | 200 | **200** (row removed after test) |
| `POST /api/local/template` (no Anthropic key) | 503 | **503** |
| `GET /api/candidates?officeType=NOPE` | 400 | **400** |
| `GET /api/bills?stateAbbr=ZZ` | 404 | **404** |
| `GET /api/search?q=a` | 400 | **400** |
| `GET /_next/image?...svg` | 400 (SVG blocked) | **400** |

## 6a. Cron end-to-end (real cron, not manual curl)

A temporary `* * * * *` job was installed, allowed to fire, then removed:

```
$ tail -3 /var/log/informedvoter-cron.log
cron-heartbeat-ok
cron-heartbeat-ok
$ crontab -l | grep -c api/cron
15
```

Syslog confirms the scheduler executing as the right user:

```
iv-app CRON[459125]: (smsadmin) CMD (echo cron-heartbeat-ok >> /var/log/informedvoter-cron.log 2>&1)
```

This proves the original failure mode (redirect denied) is gone and that cron
can write the log as `smsadmin`.

## 7. Headers (production)

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' …
  img-src 'self' data: https://theunitedstates.io https://bioguide.congress.gov https://www.congress.gov https://congress.gov https://*.oyez.org …
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()
```

No `x-powered-by`.

## 8. Database assertions

```
bills 7481 | candidates 2672 | incumbents 600 | fec-linked 2604
finance_rows 193 | finance_candidates 190 | cases 160 | voterinfo 51
elections 123 | votes 2147 | sync_logs 66
```

`DataSyncLog` after the post-deploy run (all jobs now record themselves):

```
social             success  517   2026-11-03 21:19:36
voter-info         success   50   2026-11-03 21:19:33
elections          success    2   2026-11-03 21:19:33
bills              success  500   2026-11-03 21:19:33
candidates         success 2650   2026-11-03 20:58:34
pac-contributions  success    0   2026-11-03 20:11:02
local-meetings     success    0   2026-11-03 20:02:55
members            success  539   2026-11-03 20:02:52
```

- No duplicate `fecCandidateId` values (0).
- No duplicate surname+district pairs (0).
- Spot check MI-07: Barrett (incumbent) + 4 FEC challengers.

## 9. Backup / restore drill

```
[backup] Dumping informedvoter → /var/backups/informedvoter/informedvoter-20261103-202529.dump.gz
[backup] OK (1.6M)
→ restored into iv_restore_test: Bill 7476, Candidate 596
→ restore-verified
```

## 10. Regression risks checked

- New FEC candidates render: `GET /candidate/3234` → **200** (55 KB).
- State representatives page with 2,672 candidates: `GET /state/MI/representatives` → **200** (272 KB).
- Subscribe form hidden when email is unconfigured (server-rendered layout).
- Cron auth still enforced after secret rotation (old secret rejected).
