# InformedVoter — Security & Data Remediation (2026-11-03)

**Trigger:** election-day traffic (2026 US midterms, Nov 3 2026) and a request to
verify that all security controls are sound and that every government data
source is current.

**Scope reviewed:** middleware/auth, all 40+ API routes, error handling,
dependency tree, container/host configuration, cron pipeline, backup posture,
and every synced dataset (Congress, FEC, Google Civic, Oyez/CourtListener,
Legistar, voter information).

**Result:** one critical operational defect (the entire data pipeline had been
silently dead for 24 days), one critical dependency advisory, one credential
exposure, and zero backups. All are remediated and verified in production.

---

## Executive summary

| Area | Before | After |
|---|---|---|
| Cron pipeline | Every job failed before `curl` (log file owned by root) — **no sync since 2026-10-10** | Log owned by `smsadmin`, `--max-time 900`, 15 jobs scheduled, all verified |
| Bill data | Frozen at 2026-10-09 | 7,476 bills; newest action **2026-11-02** |
| Candidates | 596, **all incumbents**, no challengers | 2,672 (2,604 FEC-linked), 600 incumbents + **2,072 challengers** |
| Campaign finance | 96 candidates | 190 candidates (193 finance rows) |
| SCOTUS | 155 cases, 0 disclosures | 160 cases synced; disclosures blocked by invalid token |
| Backups | **None** | Nightly cron + verified restore drill |
| Production deps | 1 critical / 1 high / 1 moderate / 1 low | **0 vulnerabilities** |
| `CRON_SECRET` | Plaintext in crontab, exposed in transcript | **Rotated** |
| Public write endpoints | No CSRF/origin/size/honeypot controls | Same-origin + JSON + size cap + honeypot + per-address cooldown |
| Error mapping | Validation errors returned as 500 | 400/404/503 as appropriate |
| Missing API keys | Silent 500s; subscribe claimed "check your email" with no mail sent | Explicit 503 + UI hides the form |

**Live verification:** 23/23 API contract tests, 49/49 Chromium UI tests
(2 skipped), 53/53 unit tests, `tsc --noEmit` clean, `eslint` 0 errors.

---

## Documents

| File | Contents |
|---|---|
| [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) | Findings, evidence, severity, CWE/OWASP mapping |
| [`DATA_FRESHNESS.md`](./DATA_FRESHNESS.md) | Per-source freshness before/after + verification SQL |
| [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) | Prioritised plan and rationale |
| [`REMEDIATION_STATUS.md`](./REMEDIATION_STATUS.md) | Finding-by-finding status |
| [`TEST_REPORT.md`](./TEST_REPORT.md) | Every command run and its result |
| [`artifacts/`](./artifacts) | Audit output, live probe results, dataset counts |

---

## Critical items you must action

1. **Anthropic, Resend and CourtListener keys are not configured** in
   `/opt/informedvoter/.env` (empty values). AI summaries, email subscriptions,
   the digest, and justice financial disclosures therefore do nothing. The app
   now degrades honestly (503 / hidden UI) instead of failing silently, but the
   features require keys from you.
2. **Rotate `COURTLISTENER_API_TOKEN`** if you intend to use disclosures — the
   current value returns `401`.
3. **LegiScan is not integrated** despite the `AGENTS.md` claim, and
   `api.legiscan.com` is Cloudflare-challenged from `iv-app`. State bill pages
   currently show federal bills sponsored by that state's delegation.
4. **`/local` is empty** (0 municipalities, 0 meetings). It is a shell until a
   municipality seed/import exists.
5. **PAC contributions remain 0.** The sync runs without error but the FEC
   Schedule A query returns nothing for these committees; needs a follow-up
   investigation (tracked as D-6).

---

## Evidence highlights

The cron defect, captured directly on `iv-app`:

```
$ echo probe >> /var/log/informedvoter-cron.log
bash: /var/log/informedvoter-cron.log: Permission denied
$ ls -la /var/log/informedvoter-cron.log
-rw-r--r-- 1 root root 0 Oct  8 11:46 /var/log/informedvoter-cron.log
```

Because bash performs the redirect before executing the command, `curl` never
ran — on any job, for 24 days. `DataSyncLog` confirmed the last successful sync
was `2026-10-10 11:59`.

Dependency state before remediation:

```
next  16.0.0 - 16.4.0
Severity: critical
Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used
  (GHSA-2464-fhr4-w9xw)
Next.js: Denial of Service in App Router using Server Actions (GHSA-p3m5-59mp-jv5r)
Next.js: Unauthenticated RCE in `use cache` functions returning typed arrays (GHSA-673q-mjm6-r5xr)
zod <4.6.6  Severity: high (GHSA-mrhx-c7xc-m3w5)
```

After remediation: `npm audit --omit=dev` → `found 0 vulnerabilities`.
