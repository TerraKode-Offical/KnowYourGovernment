// ─────────────────────────────────────────────
// GET /api/cron/sync-campaign-finance
// Cron Job — sync campaign finance data from the OpenFEC API
// Schedule: weekly (configure in vercel.json)
//
// Accepts ?manual=true to bypass the CRON_SECRET check in development.
// Accepts ?limit=N  to override how many candidates to process (default: 50).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { OfficeType, ContributionSizeRange, DonorType, ExpenditureCategory } from "@prisma/client";
import { withCronErrorHandler, ValidationError, NotFoundError, ExternalAPIError } from "@/lib/api-error-handler";

const FEC_API_BASE = "https://api.open.fec.gov/v1";

// FEC throttles bursts (~120 req/min per key). Keep a slow, steady cadence.
const FEC_REQUEST_DELAY_MS = 550;
const FEC_VARIANT_DELAY_MS = 250;

// Process at most this many candidates per run to stay within the
// OpenFEC rate limit of 1000 requests/hour (~3–4 calls per candidate).
const DEFAULT_CANDIDATES_PER_RUN = 50;

// Current election cycle: FEC uses even years.
// In an odd year we use the upcoming even year; in an even year we use the current one.
const now = new Date();
const CURRENT_CYCLE =
  now.getFullYear() % 2 === 0 ? now.getFullYear() : now.getFullYear() + 1;

// ─────────────────────────────────────────────
// OpenFEC API response types
// ─────────────────────────────────────────────

interface FecPagination {
  count: number;
  pages: number;
  per_page: number;
  page: number;
}

interface FecCandidateSearchResult {
  candidate_id: string;       // e.g. "H8TX22123"
  name: string;
  office: string;             // "H" | "S" | "P"
  state: string;              // two-letter abbreviation
  party: string;
  election_years?: number[];
  cycles?: number[];
}

interface FecCandidateSearchResponse {
  results: FecCandidateSearchResult[];
  pagination: FecPagination;
}

interface FecTotalsResult {
  candidate_id: string;
  cycle: number;
  receipts?: number;           // total raised
  disbursements?: number;      // total spent
  cash_on_hand_end_period?: number;
  last_cash_on_hand_end_period?: number;
  debts_owed_by_committee?: number;
  last_debts_owed_by_committee?: number;
  individual_itemized_contributions?: number;
  political_party_committee_contributions?: number;
  other_political_committee_contributions?: number;
  candidate_contribution?: number;  // self-funding
}

interface FecTotalsResponse {
  results: FecTotalsResult[];
  pagination: FecPagination;
}

interface FecContributionBySizeResult {
  candidate_id: string;
  cycle: number;
  size: number;  // 0=under200, 200, 500, 1000, 2000
  total: number;
  count: number;
}

interface FecContributionBySizeResponse {
  results: FecContributionBySizeResult[];
  pagination: FecPagination;
}

interface FecContributionByStateResult {
  candidate_id: string;
  cycle: number;
  state: string;
  state_full: string;
  total: number;
  count: number;
}

interface FecContributionByStateResponse {
  results: FecContributionByStateResult[];
  pagination: FecPagination;
}

interface FecCommitteeResult {
  committee_id: string;
  designation: string;       // "P" = principal campaign committee
  name: string;
}

interface FecCommitteeResponse {
  results: FecCommitteeResult[];
  pagination: FecPagination;
}

interface FecScheduleAResult {
  contributor_name: string;
  contributor_employer: string | null;
  contributor_occupation: string | null;
  contributor_city: string | null;
  contributor_state: string | null;
  contribution_receipt_amount: number;
  entity_type: string | null;  // "IND", "COM", "ORG", etc.
}

interface FecScheduleAResponse {
  results: FecScheduleAResult[];
  pagination: FecPagination;
}

interface FecScheduleBResult {
  recipient_name: string;
  disbursement_description: string | null;
  disbursement_amount: number;
  disbursement_type_description: string | null;
}

interface FecScheduleBResponse {
  results: FecScheduleBResult[];
  pagination: FecPagination;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildFecUrl(path: string, extraParams?: Record<string, string>): string {
  const url = new URL(`${FEC_API_BASE}${path}`);
  url.searchParams.set("api_key", process.env.FEC_API_KEY ?? "");
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function fecFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    throw new ExternalAPIError("Rate limit exceeded. Please try again later.", {
      context: { status: res.status },
    });
  }
  if (!res.ok) {
    // NEVER include the raw URL in error messages — it contains the API key
    throw new ExternalAPIError("Unable to fetch campaign finance data. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }

  return res.json() as Promise<T>;
}

/**
 * Map the FEC `size` bucket (0, 200, 500, 1000, 2000) to our enum.
 * FEC size codes: 0 = under $200, 200 = $200–499, 500 = $500–999,
 * 1000 = $1000–1999, 2000 = $2000+
 */
function fecSizeToEnum(size: number): ContributionSizeRange | null {
  switch (size) {
    case 0:    return ContributionSizeRange.UNDER_200;
    case 200:  return ContributionSizeRange.R200_TO_499;
    case 500:  return ContributionSizeRange.R500_TO_999;
    case 1000: return ContributionSizeRange.R1000_TO_2999;
    case 2000: return ContributionSizeRange.R3000_PLUS;
    default:   return null;
  }
}

// ─────────────────────────────────────────────
// Step 1 — Find the FEC candidate_id by name + state + office
// ─────────────────────────────────────────────

/**
 * Search the OpenFEC /candidates/search/ endpoint for a matching candidate.
 * Tries multiple name formats to maximize match rate.
 * Returns the FEC candidate_id string (e.g. "H8TX22123") or null if not found.
 */
async function findFecCandidateId(
  name: string,
  state: string,
  officeType: OfficeType
): Promise<string | null> {
  const officeCode = officeType === OfficeType.US_SENATOR ? "S" : "H";
  const stateUpper = state.toUpperCase();

  // Build multiple search queries from the Congress.gov name format "LastName, FirstName M."
  const nameVariants = buildNameVariants(name);

  for (const queryName of nameVariants) {
    await delay(FEC_VARIANT_DELAY_MS);
    const result = await searchFecCandidate(queryName, officeCode, stateUpper);
    if (result) return result;
  }

  return null;
}

/** Generate multiple name formats to try against FEC search */
function buildNameVariants(name: string): string[] {
  const variants: string[] = [];

  // Original name: "Reed, Jack" or "Cortez Masto, Catherine"
  variants.push(name);

  // If it's "LastName, FirstName Middle" format, extract parts
  if (name.includes(",")) {
    const [lastName, rest] = name.split(",", 2);
    const firstName = (rest ?? "").trim().split(/\s+/)[0]; // First word only, no middle initial

    if (lastName && firstName) {
      // "Jack Reed" (first last)
      variants.push(`${firstName} ${lastName.trim()}`);
      // Just last name - FEC will filter by state+office
      variants.push(lastName.trim());
    }
  } else {
    // Names without a comma (e.g. "Markwayne Mullin"): also try the last
    // word alone — FEC matches on surname and ignores case.
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      variants.push(parts[parts.length - 1]);
    }
  }

  // Deduplicate
  return [...new Set(variants)];
}

/** Single FEC search attempt — tries with and without cycle filter */
async function searchFecCandidate(
  query: string,
  officeCode: string,
  state: string
): Promise<string | null> {
  // Broad search first. An election_year filter here excluded mid-term
  // senators (their next election is in a different cycle), returning 0.
  const baseParams = {
    q: query,
    office: officeCode,
    state,
    per_page: "5",
    page: "1",
  };

  try {
    const broad = await fecFetch<FecCandidateSearchResponse>(
      buildFecUrl("/candidates/search/", baseParams)
    );
    const broadResults = broad.results ?? [];
    if (broadResults.length > 0) {
      // Prefer a candidate actively in the current cycle
      const active = broadResults.find(
        (r) =>
          r.candidate_id &&
          Array.isArray(r.cycles) &&
          r.cycles.includes(CURRENT_CYCLE)
      );
      const pick = active ?? broadResults.find((r) => r.candidate_id);
      return pick?.candidate_id ?? broadResults[0].candidate_id;
    }

    // Retry with the cycle filter (matches candidates running this cycle)
    const data = await fecFetch<FecCandidateSearchResponse>(
      buildFecUrl("/candidates/search/", {
        ...baseParams,
        election_year: String(CURRENT_CYCLE),
      })
    );

    const results = data.results ?? [];
    if (results.length > 0) {
      // Prefer incumbent or active candidate
      const incumbent = results.find((r) => r.candidate_id);
      return incumbent?.candidate_id ?? results[0].candidate_id;
    }
  } catch {
    // Non-fatal — try next variant
  }

  return null;
}

// ─────────────────────────────────────────────
// Step 2 — Fetch candidate totals
// ─────────────────────────────────────────────

async function fetchCandidateTotals(
  fecCandidateId: string,
  cycle: number
): Promise<FecTotalsResult | null> {
  // The /candidate/{id}/totals/ endpoint returns per-cycle fundraising summaries.
  const url = buildFecUrl(`/candidate/${fecCandidateId}/totals/`, {
    cycle: String(cycle),
    per_page: "5",
    page: "1",
  });

  try {
    const data = await fecFetch<FecTotalsResponse>(url);
    const results = data.results ?? [];
    // Return the record matching our target cycle (there may be multiple cycles returned)
    return results.find((r) => r.cycle === cycle) ?? results[0] ?? null;
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Totals fetch failed for ${fecCandidateId}:`, err
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// Step 3 — Fetch contributions by size
// ─────────────────────────────────────────────

async function fetchContributionsBySize(
  fecCandidateId: string,
  cycle: number
): Promise<FecContributionBySizeResult[]> {
  const url = buildFecUrl("/schedules/schedule_a/by_size/by_candidate/", {
    candidate_id: fecCandidateId,
    cycle: String(cycle),
    per_page: "20",
    page: "1",
  });

  try {
    const data = await fecFetch<FecContributionBySizeResponse>(url);
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Contributions-by-size fetch failed for ${fecCandidateId}:`, err
    );
    return [];
  }
}

// ─────────────────────────────────────────────
// Step 4 — Fetch contributions by state
// ─────────────────────────────────────────────

async function fetchContributionsByState(
  fecCandidateId: string,
  cycle: number
): Promise<FecContributionByStateResult[]> {
  const url = buildFecUrl("/schedules/schedule_a/by_state/by_candidate/", {
    candidate_id: fecCandidateId,
    cycle: String(cycle),
    per_page: "60",  // 50 states + DC + territories
    page: "1",
  });

  try {
    const data = await fecFetch<FecContributionByStateResponse>(url);
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Contributions-by-state fetch failed for ${fecCandidateId}:`, err
    );
    return [];
  }
}

// ─────────────────────────────────────────────
// Step 5 — Fetch the principal campaign committee ID
// ─────────────────────────────────────────────

async function fetchCommitteeId(
  fecCandidateId: string,
  cycle: number
): Promise<string | null> {
  const url = buildFecUrl(`/candidate/${fecCandidateId}/committees/`, {
    cycle: String(cycle),
    designation: "P",
  });

  try {
    const data = await fecFetch<FecCommitteeResponse>(url);
    const results = data.results ?? [];
    // Find the principal campaign committee (designation "P")
    const principal = results.find((r) => r.designation === "P");
    return principal?.committee_id ?? results[0]?.committee_id ?? null;
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Committee fetch failed for ${fecCandidateId}:`, err
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// Step 6 — Fetch top donors (Schedule A)
// ─────────────────────────────────────────────

async function fetchTopDonors(
  committeeId: string,
  cycle: number
): Promise<FecScheduleAResult[]> {
  const url = buildFecUrl("/schedules/schedule_a/", {
    committee_id: committeeId,
    sort_hide_null: "true",
    sort: "-contribution_receipt_amount",
    per_page: "20",
    two_year_transaction_period: String(cycle),
  });

  try {
    const data = await fecFetch<FecScheduleAResponse>(url);
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Top donors fetch failed for committee ${committeeId}:`, err
    );
    return [];
  }
}

/**
 * Map FEC entity_type to our DonorType enum.
 * "IND" → INDIVIDUAL, "COM" → PAC, "ORG" → COMMITTEE, default → INDIVIDUAL
 */
function mapEntityTypeToDonorType(entityType: string | null): DonorType {
  switch (entityType) {
    case "IND": return DonorType.INDIVIDUAL;
    case "COM": return DonorType.PAC;
    case "ORG": return DonorType.COMMITTEE;
    default:    return DonorType.INDIVIDUAL;
  }
}

// ─────────────────────────────────────────────
// Step 7 — Fetch expenditures (Schedule B)
// ─────────────────────────────────────────────

async function fetchExpenditures(
  committeeId: string,
  cycle: number
): Promise<FecScheduleBResult[]> {
  const url = buildFecUrl("/schedules/schedule_b/", {
    committee_id: committeeId,
    sort_hide_null: "true",
    sort: "-disbursement_amount",
    per_page: "20",
    two_year_transaction_period: String(cycle),
  });

  try {
    const data = await fecFetch<FecScheduleBResponse>(url);
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Expenditures fetch failed for committee ${committeeId}:`, err
    );
    return [];
  }
}

/**
 * Map FEC disbursement_type_description to our ExpenditureCategory enum.
 * Checks for keyword matches; defaults to OTHER.
 */
function mapDisbursementToCategory(description: string | null): ExpenditureCategory {
  if (!description) return ExpenditureCategory.OTHER;
  const upper = description.toUpperCase();
  if (upper.includes("MEDIA"))          return ExpenditureCategory.MEDIA;
  if (upper.includes("PAYROLL") || upper.includes("SALARY")) return ExpenditureCategory.PAYROLL;
  if (upper.includes("TRAVEL"))         return ExpenditureCategory.TRAVEL;
  if (upper.includes("CONSULT"))        return ExpenditureCategory.CONSULTING;
  if (upper.includes("FUNDRAIS"))       return ExpenditureCategory.FUNDRAISING;
  return ExpenditureCategory.OTHER;
}

/** Small delay helper to avoid hammering the FEC API */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// Upsert all finance data for a single candidate
// ─────────────────────────────────────────────

interface DbCandidate {
  id: number;
  name: string;
  officeType: OfficeType;
  contactInfo: unknown;
  state: { abbreviation: string } | null;
}

async function syncCandidateFinance(
  candidate: DbCandidate,
  cycle: number
): Promise<"synced" | "no_fec_id" | "no_data"> {
  const contactInfo = candidate.contactInfo as Record<string, unknown> | null;
  const stateAbbr = candidate.state?.abbreviation ?? "";

  // ── 1. Resolve the FEC candidate ID ────────────────────────────────────────
  // Check if we already have it stored from a previous run.
  const existingFinance = await prisma.candidateFinance.findFirst({
    where: { candidateId: candidate.id, cycle },
    select: { fecCandidateId: true },
  });

  let fecCandidateId = existingFinance?.fecCandidateId ?? null;

  if (!fecCandidateId) {
    fecCandidateId = await findFecCandidateId(
      candidate.name,
      stateAbbr,
      candidate.officeType
    );
  }

  if (!fecCandidateId) {
    console.warn(
      `[sync-campaign-finance] Could not find FEC ID for "${candidate.name}" (${stateAbbr})`
    );
    return "no_fec_id";
  }

  // ── 2. Fetch candidate totals (fall back to previous cycle if current has no data)
  let totals = await fetchCandidateTotals(fecCandidateId, cycle);
  let effectiveCycle = cycle;

  if (!totals && cycle > 2024) {
    // Try the previous election cycle
    effectiveCycle = cycle - 2;
    totals = await fetchCandidateTotals(fecCandidateId, effectiveCycle);
  }

  if (!totals) {
    console.warn(
      `[sync-campaign-finance] No totals data for ${fecCandidateId} (${candidate.name}) cycles ${cycle}/${effectiveCycle}`
    );
    return "no_data";
  }

  // ── 3. Upsert CandidateFinance ──────────────────────────────────────────────
  const financeData = {
    fecCandidateId,
    cycle: effectiveCycle,
    totalRaised:               totals.receipts                              ?? undefined,
    totalSpent:                totals.disbursements                         ?? undefined,
    cashOnHand:                totals.last_cash_on_hand_end_period ?? totals.cash_on_hand_end_period ?? undefined,
    totalDebt:                 totals.last_debts_owed_by_committee ?? totals.debts_owed_by_committee ?? undefined,
    individualContributions:   totals.individual_itemized_contributions     ?? undefined,
    pacContributions:          totals.other_political_committee_contributions ?? undefined,
    partyContributions:        totals.political_party_committee_contributions ?? undefined,
    selfFunding:               totals.candidate_contribution                ?? undefined,
    lastUpdated:               new Date(),
  };

  const financeRecord = await prisma.candidateFinance.upsert({
    where: { candidateId_cycle: { candidateId: candidate.id, cycle: effectiveCycle } },
    create: { candidateId: candidate.id, ...financeData },
    update: financeData,
    select: { id: true },
  });

  const financeId = financeRecord.id;

  // ── 4. Fetch and upsert contributions by size ───────────────────────────────
  const sizeResults = await fetchContributionsBySize(fecCandidateId, effectiveCycle);

  for (const row of sizeResults) {
    const sizeRange = fecSizeToEnum(row.size);
    if (!sizeRange) continue;

    await prisma.candidateContributionBySize.upsert({
      where: {
        candidateFinanceId_sizeRange_cycle: {
          candidateFinanceId: financeId,
          sizeRange,
          cycle: effectiveCycle,
        },
      },
      create: {
        candidateFinanceId: financeId,
        sizeRange,
        total: row.total,
        count: row.count ?? 0,
        cycle: effectiveCycle,
      },
      update: {
        total: row.total,
        count: row.count ?? 0,
      },
    });
  }

  // ── 5. Fetch and upsert contributions by state ──────────────────────────────
  const stateResults = await fetchContributionsByState(fecCandidateId, effectiveCycle);

  for (const row of stateResults) {
    if (!row.state) continue;

    await prisma.candidateContributionByState.upsert({
      where: {
        candidateFinanceId_contributorState_cycle: {
          candidateFinanceId: financeId,
          contributorState: row.state,
          cycle: effectiveCycle,
        },
      },
      create: {
        candidateFinanceId: financeId,
        contributorState: row.state,
        totalAmount: row.total,
        contributionCount: row.count ?? 1,
        cycle: effectiveCycle,
      },
      update: {
        totalAmount: row.total,
        contributionCount: row.count ?? 1,
      },
    });
  }

  // ── 6. Fetch committee ID, then top donors and expenditures ─────────────────
  let topDonorCount = 0;
  let expenditureCount = 0;

  try {
    await delay(500);
    const committeeId = await fetchCommitteeId(fecCandidateId, effectiveCycle);

    if (committeeId) {
      // ── 6a. Fetch and persist top donors (Schedule A) ─────────────────────
      try {
        await delay(500);
        const donorResults = await fetchTopDonors(committeeId, effectiveCycle);

        if (donorResults.length > 0) {
          // Delete existing top donors for this finance record (no unique constraint)
          await prisma.candidateTopDonor.deleteMany({
            where: { candidateFinanceId: financeId },
          });

          for (const donor of donorResults) {
            if (!donor.contributor_name) continue;

            await prisma.candidateTopDonor.create({
              data: {
                candidateFinanceId: financeId,
                donorName: donor.contributor_name,
                donorType: mapEntityTypeToDonorType(donor.entity_type),
                employerName: donor.contributor_employer ?? null,
                occupation: donor.contributor_occupation ?? null,
                city: donor.contributor_city ?? null,
                state: donor.contributor_state ?? null,
                totalAmount: donor.contribution_receipt_amount,
                contributionCount: 1,
                cycle: effectiveCycle,
              },
            });
            topDonorCount++;
          }
        }
      } catch (err) {
        console.warn(
          `[sync-campaign-finance] Top donors sync failed for ${fecCandidateId} (committee ${committeeId}):`,
          err
        );
      }

      // ── 6b. Fetch and persist expenditures (Schedule B) ───────────────────
      try {
        await delay(500);
        const expenditureResults = await fetchExpenditures(committeeId, effectiveCycle);

        if (expenditureResults.length > 0) {
          // Delete existing expenditures for this finance record (no unique constraint)
          await prisma.candidateExpenditure.deleteMany({
            where: { candidateFinanceId: financeId },
          });

          for (const exp of expenditureResults) {
            if (!exp.recipient_name) continue;

            await prisma.candidateExpenditure.create({
              data: {
                candidateFinanceId: financeId,
                recipientName: exp.recipient_name,
                purpose: exp.disbursement_description ?? null,
                totalAmount: exp.disbursement_amount,
                category: mapDisbursementToCategory(exp.disbursement_type_description),
                cycle: effectiveCycle,
              },
            });
            expenditureCount++;
          }
        }
      } catch (err) {
        console.warn(
          `[sync-campaign-finance] Expenditures sync failed for ${fecCandidateId} (committee ${committeeId}):`,
          err
        );
      }
    } else {
      console.warn(
        `[sync-campaign-finance] No committee ID found for ${fecCandidateId} — skipping top donors and expenditures`
      );
    }
  } catch (err) {
    console.warn(
      `[sync-campaign-finance] Committee/donors/expenditures sync failed for ${fecCandidateId}:`,
      err
    );
  }

  console.log(
    `[sync-campaign-finance] Synced ${candidate.name} (${fecCandidateId}) — ` +
      `raised: $${totals.receipts?.toLocaleString() ?? "n/a"}, ` +
      `size buckets: ${sizeResults.length}, states: ${stateResults.length}, ` +
      `top donors: ${topDonorCount}, expenditures: ${expenditureCount}`
  );

  return "synced";
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export const GET = withCronErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get("manual") === "true";

  // Auth check — bypass with ?manual=true in development only
  if (isManual) {
    if (process.env.NODE_ENV !== "development") {
      return Response.json(
        { error: "Manual trigger is only allowed in development" },
        { status: 403 }
      );
    }
    console.log("[sync-campaign-finance] Manual trigger in development mode — skipping auth");
  } else if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "FEC_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  // Allow caller to override how many candidates to process
  const limitParam = searchParams.get("limit");
  const limitParsed = limitParam ? parseInt(limitParam, 10) : NaN;
  const candidatesPerRun = !isNaN(limitParsed)
    ? Math.min(Math.max(1, limitParsed), 200)
    : DEFAULT_CANDIDATES_PER_RUN;

  const startTime = Date.now();
  console.log(
    `[sync-campaign-finance] Starting OpenFEC campaign finance sync ` +
      `(cycle: ${CURRENT_CYCLE}, max candidates: ${candidatesPerRun})...`
  );

  try {
    // ── 1. Load federal candidates that have a bioguideId in contactInfo ───────
    // Stale-first ordering: candidates with no finance data come first (NULL
    // sorts first in ASC), then the oldest finance rows rotate in. This means
    // every weekly run makes forward progress across all 535 members, and
    // eventually re-verifies everyone.
    const rows = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      officeType: OfficeType;
      contactInfo: unknown;
      stateAbbr: string | null;
    }>>`
      SELECT c.id,
             c.name,
             c."officeType",
             c."contactInfo",
             s.abbreviation AS "stateAbbr"
      FROM "Candidate" c
      LEFT JOIN "State" s ON s.id = c."stateId"
      WHERE c."officeType" IN ('US_SENATOR', 'US_REPRESENTATIVE')
        AND c."contactInfo" ? 'bioguideId'
      ORDER BY (
        SELECT MAX(f."lastUpdated") FROM "CandidateFinance" f WHERE f."candidateId" = c.id
      ) ASC NULLS FIRST, c.id ASC
      LIMIT ${candidatesPerRun}
    `;

    const filteredCandidates = rows.map((r) => ({
      id: r.id,
      name: r.name,
      officeType: r.officeType,
      contactInfo: r.contactInfo,
      state: { abbreviation: r.stateAbbr ?? "" },
    })).filter((c) => {
      const info = c.contactInfo as Record<string, unknown> | null;
      return info && typeof info === "object" && "bioguideId" in info && info.bioguideId;
    });

    console.log(
      `[sync-campaign-finance] Found ${filteredCandidates.length} federal candidates with bioguideId to process`
    );

    if (filteredCandidates.length === 0) {
      return Response.json({
        synced: 0,
        noFecId: 0,
        noData: 0,
        errors: 0,
        cycle: CURRENT_CYCLE,
        message: "No federal candidates with bioguideId found in database",
      });
    }

    // ── 2. Sync finance data for each candidate ─────────────────────────────
    let synced = 0;
    let noFecId = 0;
    let noData = 0;
    let errors = 0;

    for (let i = 0; i < filteredCandidates.length; i++) {
      const candidate = filteredCandidates[i];

      // Pace requests: FEC throttles bursts (~120 req/min) and a swallowed 429
      // surfaces as "no_fec_id", so keep the call rate comfortably below it.
      await delay(FEC_REQUEST_DELAY_MS);

      try {
        const result = await syncCandidateFinance(candidate, CURRENT_CYCLE);
        if (result === "synced")     synced++;
        else if (result === "no_fec_id") noFecId++;
        else if (result === "no_data")   noData++;
      } catch (err) {
        errors++;
        console.error(
          `[sync-campaign-finance] Error processing candidate "${candidate.name}" (id=${candidate.id}):`,
          err
        );
      }

      // Log progress every 10 candidates
      if ((i + 1) % 10 === 0 || i + 1 === filteredCandidates.length) {
        console.log(
          `[sync-campaign-finance] Progress: ${i + 1}/${filteredCandidates.length} ` +
            `(synced: ${synced}, no_fec_id: ${noFecId}, no_data: ${noData}, errors: ${errors})`
        );
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[sync-campaign-finance] Sync complete in ${elapsed}s — ` +
        `synced: ${synced}, no_fec_id: ${noFecId}, no_data: ${noData}, errors: ${errors}`
    );

    return Response.json({
      synced,
      noFecId,
      noData,
      errors,
      total: filteredCandidates.length,
      cycle: CURRENT_CYCLE,
      elapsedSeconds: parseFloat(elapsed),
      message: `Successfully synced finance data for ${synced} of ${filteredCandidates.length} candidates`,
    });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[sync-campaign-finance] Fatal error after ${elapsed}s:`, error);
    return Response.json(
      {
        error: "Sync failed",
        detail: "Check server logs for details",
        elapsedSeconds: parseFloat(elapsed),
      },
      { status: 500 }
    );
  }
}, { route: "GET /api/cron/sync-campaign-finance", jobName: "sync-campaign-finance" });
