# Data Freshness Review — KnowYourGov (2026-11-03)

All figures were read directly from the production database on the data host
and from live API probes, not from documentation.

---

## 1. Root cause of the outage

Every host cron job was written as:

```
0 7 * * * curl ... >> /var/log/KnowYourGov-cron.log 2>&1
```

`/var/log/KnowYourGov-cron.log` was `root:root 0644`, but cron runs as
`cronuser`. Bash performs redirections **before** executing the command, so the
redirect failed and `curl` never started. Cron logged the attempt and discarded
the error because no MTA is installed.

Proof:

```
$ echo probe >> /var/log/KnowYourGov-cron.log
bash: line 1: /var/log/KnowYourGov-cron.log: Permission denied
$ ls -la /var/log/KnowYourGov-cron.log
-rw-r--r-- 1 root root 0 Oct  8 11:46 /var/log/KnowYourGov-cron.log
```

`DataSyncLog` last successful run: **2026-10-10 11:59** (a manual run during the
previous assessment). Daily jobs had not executed since the Oct 8 migration.

---

## 2. Before → after

| Dataset | Source | Before (2026-11-03 18:00 UTC) | After (2026-11-03 21:00 UTC) |
|---|---|---|---|
| Bills | Congress.gov v3 | 7,181; newest action **2026-10-09**; 0 actioned in 7 days | **7,476**; newest action **2026-11-02** (295 created, 205 updated) |
| Members | Congress.gov v3 | 539, last synced Oct 10 | **539 updated** (80 s) |
| Candidates | Congress.gov + **FEC (new)** | 596 — **100% incumbents** | **2,672** (2,604 FEC-linked): 600 incumbents + **2,072 challengers** |
| Campaign finance | OpenFEC | 96 candidates | **190 candidates / 193 finance rows** (+94 synced this run) |
| Elections | Google Civic | 122 rows, created Oct 10 | 123 rows (1 created, 1 updated); **53 elections dated 2026-11-03** |
| Voter info | static table | 51 rows, updated Oct 8 | 51 rows re-upserted; still static (see gaps) |
| SCOTUS cases | Oyez | 155 | **160** (160 synced; 31 OT2026 cases present) |
| Justice disclosures | CourtListener | 0 | **0 — token invalid (401)** |
| Bill votes | Congress.gov | 2,147 | 2,147 (no new roll calls; 14 skipped with no matching bill) |
| Cosponsors | — | 0 | 0 (not implemented) |
| PAC contributions | OpenFEC | 0 | 0 (query returns no rows — follow-up) |
| Local meetings | Legistar | 0 municipalities, 0 meetings | 0 (no municipalities configured) |
| Social handles | unitedstates/congress-legislators | 517 | **517 updated** |
| AI summaries | Claude | 690 bills | 690 (no API key — jobs now skip cleanly) |

Live check of today's election data:

```
GET /api/polling-places?address=1600 Pennsylvania Ave NW, Washington, DC
→ election: "2026 General Midterm Election", electionDay: 2026-11-03
→ pollingLocations: M.L.K. JR. MEMORIAL LIBRARY, STEAD RECREATION CENTER, …
   pollingHours: "Tue, Nov 3: 7 am - 8 pm"
```

---

## 3. What was repaired

1. Log file re-owned `cronuser:crontab 0640`; logrotate policy added.
2. Crontab rewritten: `--max-time 900` on every job (no hung syncs), secret
   rotated, `sync-candidates` added (weekly, Monday 10:45).
3. All 15 jobs exercised manually and verified (see `TEST_REPORT.md`).
4. `DataSyncLog` coverage extended from 2 jobs to all sync/analysis jobs.
5. `/api/health?verbose=1` exposes last run per job plus dataset age.

Current health snapshot:

```json
{"status":"ok","database":true,
 "jobs":{"candidates":{"status":"success","recordsSynced":2650,...},
         "members":{"status":"success","recordsSynced":539,...}, ...},
 "datasets":{"bills":{"count":7476,"newestAction":"2026-11-02",...},
             "candidates":{"count":2672},
             "voterInfo":{"ageHours":1},
             "courtCases":{"ageHours":0.9},
             "campaignFinance":{"ageHours":0.6}}}
```

---

## 4. Verification queries

```sql
-- Freshness of each dataset
select 'Bill' t, max("updatedAt") from "Bill"
union all select 'Candidate', max("updatedAt") from "Candidate"
union all select 'Election', max(date) from "Election"
union all select 'CourtCase', max("updatedAt") from "CourtCase"
union all select 'VoterInfo', max("lastUpdated") from "VoterInfo"
union all select 'CandidateFinance', max("lastUpdated") from "CandidateFinance";

-- Per-job last run
select distinct on ("syncType") "syncType", status, "recordsSynced", "createdAt"
from "DataSyncLog" order by "syncType", "createdAt" desc;

-- Coverage
select count(*) filter (where "isIncumbent") incumbents,
       count(*) filter (where "fecCandidateId" is not null) fec_linked,
       count(*) total from "Candidate";
```

One-shot HTTP equivalent (safe publicly, aggregate only):

```
GET https://knowyourgov.us/api/health?verbose=1
```

---

## 5. Remaining data gaps (honest list)

| Gap | Impact | Recommendation |
|---|---|---|
| Voter info is a **hardcoded table**, not scraped; date fields are `null`; registration links point at vote.org | Pages say "Check your state website" for deadlines; cannot prove accuracy for 2026 | Verify all 51 rows against official state election sites; store `sourceUrl` + `verifiedAt` per row |
| Justice financial disclosures | 0 rows; CourtListener returns 401 | Issue a new `COURTLISTENER_API_TOKEN` |
| PAC contributions | 0 rows although the sync reports success | Investigate the Schedule A query (committee id vs candidate id) |
| Cosponsors | 0 rows; not implemented | Add `/bill/{congress}/{type}/{number}/cosponsors` ingestion |
| State-level bills | 0; LegiScan not implemented and blocked from the server | Implement via a different egress or relabel the page |
| Local government | 0 municipalities / 0 meetings | Seed a starter set or mark `/local` as beta |
| AI summaries | 690 / 7,476 bills; no API key | Provision `ANTHROPIC_API_KEY`; batch is now 25/run, newest-first |
| Governor challengers | Only sitting governors (no federal source) | Add state SOS/Ballotpedia ingestion |

**Note on the FEC import filter:** challengers are limited to
`cycle=2026`, `candidate_status=C`, `has_raised_funds=true` (2,660 records).
This excludes paper candidates and perennial filers. It is a defensible
"serious candidates" threshold, not a full ballot list — ballot-qualified
candidate lists live with each state, not the FEC.
