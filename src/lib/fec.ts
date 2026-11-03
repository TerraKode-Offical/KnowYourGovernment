// ─────────────────────────────────────────────
// Shared FEC API utilities
// Extracted from sync-campaign-finance for reuse
// across PAC contribution sync, data verification, etc.
// ─────────────────────────────────────────────

import { ExternalAPIError } from "@/lib/errors";

export const FEC_API_BASE = "https://api.open.fec.gov/v1";

// Current election cycle: FEC uses even years.
const now = new Date();
export const CURRENT_CYCLE =
  now.getFullYear() % 2 === 0 ? now.getFullYear() : now.getFullYear() + 1;

// ─────────────────────────────────────────────
// Common types
// ─────────────────────────────────────────────

export interface FecPagination {
  count: number;
  pages: number;
  per_page: number;
  page: number;
}

export interface FecScheduleAResult {
  contributor_name: string;
  contributor_employer: string | null;
  contributor_occupation: string | null;
  contributor_city: string | null;
  contributor_state: string | null;
  contribution_receipt_amount: number;
  contribution_receipt_date: string | null;
  entity_type: string | null; // "IND", "COM", "ORG"
  committee_id?: string;
  sub_id?: string; // Unique transaction ID
  pdf_url?: string | null; // FEC filing PDF
  link?: string[]; // API self-links
}

export interface FecScheduleAResponse {
  results: FecScheduleAResult[];
  pagination: FecPagination;
}

export interface FecCommitteeDetailResult {
  committee_id: string;
  name: string;
  treasurer_name: string | null;
  committee_type: string | null;
  designation: string | null;
  party: string | null;
  connected_organization_name: string | null;
  website_url: string | null;
}

export interface FecCommitteeDetailResponse {
  results: FecCommitteeDetailResult[];
  pagination: FecPagination;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function buildFecUrl(
  path: string,
  extraParams?: Record<string, string>
): string {
  const url = new URL(`${FEC_API_BASE}${path}`);
  url.searchParams.set("api_key", process.env.FEC_API_KEY ?? "");
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export async function fecFetch<T>(url: string): Promise<T> {
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

/** Small delay helper to avoid hammering the FEC API */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build the FEC URL for a committee's public page */
export function fecCommitteeUrl(committeeId: string): string {
  return `https://www.fec.gov/data/committee/${committeeId}/`;
}

/** Build the FEC URL for a candidate's public page */
export function fecCandidateUrl(candidateId: string): string {
  return `https://www.fec.gov/data/candidate/${candidateId}/`;
}

// ─────────────────────────────────────────────
// Committee details
// ─────────────────────────────────────────────

export async function fetchCommitteeDetails(
  committeeId: string
): Promise<FecCommitteeDetailResult | null> {
  try {
    const url = buildFecUrl(`/committee/${committeeId}/`);
    const data = await fecFetch<FecCommitteeDetailResponse>(url);
    return data.results?.[0] ?? null;
  } catch (err) {
    console.warn(`[fec] Committee details fetch failed for ${committeeId}:`, err);
    return null;
  }
}

// ─────────────────────────────────────────────
// PAC-to-candidate contributions (Schedule A)
// ─────────────────────────────────────────────

/**
 * Fetch PAC-to-candidate contributions from Schedule A.
 * Filters by contributing committee ID and the candidate's principal committee.
 * Handles pagination to get all results.
 */
export async function fetchPacContributions(
  recipientCommitteeId: string,
  contributorCommitteeId: string,
  cycle: number,
  maxPages = 5
): Promise<FecScheduleAResult[]> {
  const allResults: FecScheduleAResult[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = buildFecUrl("/schedules/schedule_a/", {
        committee_id: recipientCommitteeId,
        contributor_committee_id: contributorCommitteeId,
        two_year_transaction_period: String(cycle),
        per_page: "100",
        page: String(page),
        sort: "-contribution_receipt_amount",
      });

      const data = await fecFetch<FecScheduleAResponse>(url);
      const results = data.results ?? [];
      allResults.push(...results);

      // Stop if we've fetched all pages
      if (page >= data.pagination.pages) break;

      await delay(300);
    } catch (err) {
      console.warn(
        `[fec] PAC contributions fetch failed (page ${page}) for ${contributorCommitteeId} → ${recipientCommitteeId}:`,
        err
      );
      break;
    }
  }

  return allResults;
}

/**
 * Fetch ALL PAC contributions TO a specific committee (from any PAC).
 * Filters by entity_type=COM to get only committee-to-committee contributions.
 * Handles pagination.
 */
export async function fetchAllPacContributionsToCommittee(
  recipientCommitteeId: string,
  cycle: number,
  maxPages = 10
): Promise<FecScheduleAResult[]> {
  const allResults: FecScheduleAResult[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = buildFecUrl("/schedules/schedule_a/", {
        committee_id: recipientCommitteeId,
        // FEC accepts "individual" or "committee" here — not "COM". The old
        // "COM" value silently matched nothing, causing every PAC sync to
        // return zero contributions.
        contributor_type: "committee",
        two_year_transaction_period: String(cycle),
        per_page: "100",
        page: String(page),
        sort: "-contribution_receipt_amount",
      });

      const data = await fecFetch<FecScheduleAResponse>(url);
      const results = data.results ?? [];
      allResults.push(...results);

      if (page >= data.pagination.pages) break;
      await delay(300);
    } catch (err) {
      console.warn(
        `[fec] All PAC contributions fetch failed (page ${page}) for ${recipientCommitteeId}:`,
        err
      );
      break;
    }
  }

  return allResults;
}

/**
 * Fetch contributions FROM a specific PAC to ANY candidate.
 * Used for AIPAC page — find all candidates who received money from a PAC.
 */
export async function fetchContributionsFromCommittee(
  contributorCommitteeId: string,
  cycle: number,
  maxPages = 20
): Promise<FecScheduleAResult[]> {
  const allResults: FecScheduleAResult[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = buildFecUrl("/schedules/schedule_a/", {
        contributor_committee_id: contributorCommitteeId,
        two_year_transaction_period: String(cycle),
        per_page: "100",
        page: String(page),
        sort: "-contribution_receipt_amount",
      });

      const data = await fecFetch<FecScheduleAResponse>(url);
      const results = data.results ?? [];
      allResults.push(...results);

      if (page >= data.pagination.pages) break;
      await delay(300);
    } catch (err) {
      console.warn(
        `[fec] Contributions from committee fetch failed (page ${page}) for ${contributorCommitteeId}:`,
        err
      );
      break;
    }
  }

  return allResults;
}
