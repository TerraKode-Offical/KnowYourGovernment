# 07 — API Reference

All endpoints return JSON unless noted. Errors use:

```json
{ "success": false, "message": "Human-readable text", "code": "INVALID_REQUEST" }
```

Codes: `INVALID_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `RATE_LIMIT_EXCEEDED` (429), `INTERNAL_ERROR` (500),
`DATA_SOURCE_UNAVAILABLE` (502), `SERVICE_UNAVAILABLE` (503).

Rate limits: 60 req/min per IP for public routes; 5/min for `POST /api/subscribe`;
5/hour for `POST /api/local/meetings/submit` and `/api/local/template`;
300/min for authenticated routes.

## Public

| Method | Path | Params | Returns |
|---|---|---|---|
| GET | `/api/health` | `verbose=1` | `{status, database, jobs, datasets}` |
| GET | `/api/search` | `q` (2–200 chars) | `{bills[], candidates[]}` |
| GET | `/api/bills` | `stateAbbr`, `chamber`, `status`, `page`, `limit` (≤100) | `{bills[], pagination}` |
| GET | `/api/candidates` | `stateAbbr`, `officeType`, `party` | `{candidates[]}` (≤200) |
| GET | `/api/agencies` | — | `{agencies[]}` with live budgets |
| GET | `/api/pac-recipients` | — | PAC/committee data |
| GET | `/api/scotus/cases` | `term`, `status` | `{cases[]}` (≤50) |
| GET | `/api/scotus/justices` | — | `{justices[]}` |
| GET | `/api/district-lookup` | `address` (≤500) | `{districts[], normalizedAddress}` |
| GET | `/api/polling-places` | `address` (≤500) | `{election, pollingLocations[], earlyVoteSites[], dropOffLocations[]}` |
| GET | `/api/local/meetings` | `municipalityId`, `upcoming` | `{meetings[]}` |
| GET | `/api/local/meeting/[id]` | — | `{meeting}` |
| GET | `/api/local/municipality` | `city` or `zip`, `state` | `{municipality}` |

## Public writes

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/subscribe` | `{email, stateAbbr, website?}` | 503 if email unconfigured; 10-min per-address cooldown |
| GET | `/api/subscribe/verify` | `?token=` | HTML page; 48-hour expiry |
| POST | `/api/subscribe/demographics` | `{profileToken, ...}` | Optional survey fields |
| GET/POST | `/api/unsubscribe` | `?token=` | GET shows confirmation, POST deletes |
| POST | `/api/local/meetings/submit` | `{city, state, date, location, time?, agenda?, email?, website?}` | Queued for review |
| POST | `/api/local/template` | `{agendaItemTitle, tone, agendaItemDescription?}` | 503 if AI unconfigured; 5/hour |

All public writes require `Origin` (when sent) to match the site origin and
`Content-Type: application/json`.

## Authenticated

`Authorization: Bearer <CRON_SECRET>`

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/ai/analyze-bill` | `{billId}` | Analyse a bill and persist summary + riders |
| POST | `/api/ai/analyze-candidate` | `{candidateId}` | Analyse candidate policy positions |
| GET | `/api/cron/sync-members` | — | Congress.gov members |
| GET | `/api/cron/sync-bills` | — | Congress.gov bills (≤500/run) |
| GET | `/api/cron/sync-votes` | — | House roll-call votes |
| GET | `/api/cron/sync-elections` | — | Google Civic elections |
| GET | `/api/cron/sync-candidates` | `state`, `office`, `pages`, `dryRun` | OpenFEC 2026 candidates |
| GET | `/api/cron/sync-campaign-finance` | `limit` (≤200) | OpenFEC finance |
| GET | `/api/cron/sync-pac-contributions` | `limit` (≤200) | OpenFEC PACs |
| GET | `/api/cron/sync-scotus` | `force=true` | Oyez + CourtListener |
| GET | `/api/cron/sync-social` | — | Social handles |
| GET | `/api/cron/sync-voter-info` | — | Static voter info |
| GET | `/api/cron/sync-local-meetings` | — | Legistar |
| GET | `/api/cron/analyze-bills` | — | Claude bill summaries |
| GET | `/api/cron/analyze-candidates` | — | Claude candidate policies |
| GET | `/api/cron/analyze-cases` | — | Claude case summaries |
| GET | `/api/cron/send-digest` | — | Resend digest |

Cron jobs accept `?secret=<CRON_SECRET>` as an alternative to the header.
`?manual=true` is rejected outside development.

## Examples

```bash
curl "https://knowyourgov.us/api/bills?stateAbbr=MI&limit=5"
curl "https://knowyourgov.us/api/health?verbose=1"
curl -X POST https://knowyourgov.us/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","stateAbbr":"MI"}'
```
