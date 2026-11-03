# 02 — Data Sources

Every dataset is pulled from a primary source and written idempotently. Jobs
record a `DataSyncLog` row; freshness is exposed at `/api/health?verbose=1`.

## Sources

| Dataset | Source | Endpoint | Auth | Schedule | Written to |
|---|---|---|---|---|---|
| Members | Congress.gov v3 | `/member`, `/member/{bioguideId}` | `CONGRESS_GOV_API_KEY` | Daily 06:00 | `Candidate`, `State` |
| Bills | Congress.gov v3 | `/bill/{congress}`, `/bill/{c}/{t}/{n}` | `CONGRESS_GOV_API_KEY` | Daily 07:00 | `Bill`, `BillCosponsor` |
| Votes | Congress.gov v3 | `/house-vote/{congress}` | `CONGRESS_GOV_API_KEY` | Daily 08:00 | `BillVote` |
| Candidates | OpenFEC | `/candidates/` | `FEC_API_KEY` | Mon 10:45 | `Candidate` |
| Campaign finance | OpenFEC | `/candidate/{id}`, `/committee/{id}`, `/schedules/schedule_a` | `FEC_API_KEY` | Mon 09:00 | `CandidateFinance`, donors, industries |
| PAC contributions | OpenFEC | Schedule A by committee | `FEC_API_KEY` | Wed 10:00 | `Committee`, `PacContribution` |
| Elections | Google Civic | `/elections` | `GOOGLE_CIVIC_API_KEY` | Mon 10:00 | `Election` |
| Polling places | Google Civic | `/voterinfo` | `GOOGLE_CIVIC_API_KEY` | On demand (1 h cache) | response only |
| District lookup | Google Civic | `/representatives` | `GOOGLE_CIVIC_API_KEY` | On demand (1 h cache) | response only |
| SCOTUS cases | Oyez | `/cases`, `/cases/{id}` | none | Daily 05:00 | `CourtCase`, `CaseVote` |
| Disclosures | CourtListener | `/api/rest/v4/...` | `COURTLISTENER_API_TOKEN` | Daily 05:00 | `JusticeFinancialDisclosure` etc. |
| Social handles | congress-legislators | `legislators-social-media.yaml` | none | Fri 10:30 | `Candidate.socialMedia` |
| Local meetings | Legistar | `webapi.legistar.com` | none | Daily 04:00 | `LocalMeeting`, `MeetingAgendaItem` |
| Agency budgets | USAspending | `/references/toptier_agencies/` | none | 24 h cache | response only |
| Voter info | **static table** | — | — | 1st of month | `VoterInfo` |

## Coverage snapshot (2026-11-03)

| Dataset | Rows | Notes |
|---|---|---|
| Bills | 7,481 | Newest action 2026-11-02 |
| Candidates | 2,672 | 600 incumbents + 2,072 FEC challengers |
| Campaign finance | 193 rows / 190 candidates | Weekly cron continues coverage |
| SCOTUS cases | 160 | 31 in OT2026 |
| Voter info | 51 | Static; dates null |
| Elections | 123 | 53 dated 2026-11-03 |
| Cosponsors | 0 | Not implemented |
| PAC contributions | 0 | Sync runs; query returns no rows (open) |
| Local municipalities | 0 | Nothing seeded (open) |

## Known gaps

1. **Voter information is static.** `sync-voter-info` upserts a hardcoded table;
   registration/early-voting/absentee dates are `null`. Verify each row against
   the official state election site and add `sourceUrl`/`verifiedAt`.
2. **No state-level bills.** LegiScan is not integrated and is Cloudflare-blocked
   from `iv-app`. State bill pages show federal bills sponsored by that state's
   delegation.
3. **CourtListener token invalid** (`401`) → disclosures stay empty.
4. **PAC contributions** return zero rows despite a successful job.
5. **Cosponsors** are not ingested.
6. **Local government** has no municipalities.
7. **Governors** have no challenger source (FEC covers Congress only).
8. **AI summaries** cover a fraction of bills when `ANTHROPIC_API_KEY` is absent.

## FEC candidate filter

`sync-candidates` imports `cycle=2026`, `candidate_status=C` (statutory
candidate) and `has_raised_funds=true`. This excludes paper candidates and
perennial filers but is **not** a ballot-qualified list — that lives with each
state. Matching order: `fecCandidateId` → normalized full name → incumbent
district/surname. New records use the Congress.gov `"Last, First"` format.

## Verification

```sql
-- newest row per dataset
select 'Bill' t, max("updatedAt") from "Bill"
union all select 'Candidate', max("updatedAt") from "Candidate"
union all select 'CourtCase', max("updatedAt") from "CourtCase"
union all select 'VoterInfo', max("lastUpdated") from "VoterInfo"
union all select 'CandidateFinance', max("lastUpdated") from "CandidateFinance";

-- last run per job
select distinct on ("syncType") "syncType", status, "recordsSynced", "createdAt"
from "DataSyncLog" order by "syncType", "createdAt" desc;
```

HTTP equivalent: `GET /api/health?verbose=1` (aggregates only, no PII).

## Adding a source

1. Add a route at `src/app/api/cron/sync-<name>/route.ts`.
2. Verify the secret with `verifyCronSecret(request)`.
3. Wrap with `withCronErrorHandler`.
4. Upsert by an external identifier (never insert blindly).
5. Call `logSync({ syncType, status, recordsTotal, recordsSynced, recordsFailed, durationMs })`.
6. Add the job to `scripts/cron-setup.sh` and to the table in `AGENTS.md`.
7. Add the source and its known limits to this document.
