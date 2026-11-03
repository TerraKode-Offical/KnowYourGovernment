// ─────────────────────────────────────────────
// GET /api/cron/sync-bills
// Cron Job — sync federal bills from Congress.gov API v3
// Schedule: daily (configure in vercel.json)
//
// Accepts ?manual=true to bypass the CRON_SECRET check in development.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { Chamber, BillStatus } from "@prisma/client";
import { withCronErrorHandler, ValidationError, NotFoundError, ExternalAPIError } from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const CURRENT_CONGRESS = 119;
const PAGE_LIMIT = 250;
const MAX_BILLS_PER_RUN = 500;

// ─────────────────────────────────────────────
// Congress.gov API response types
// ─────────────────────────────────────────────

interface CongressBillLatestAction {
  actionDate: string;
  text: string;
}

/** Shape of each entry in the /bill list endpoint */
interface CongressBillListItem {
  congress: number;
  number: string;
  type: string;
  originChamber: string;       // "House" | "Senate"
  originChamberCode?: string;  // "H" | "S"
  title: string;
  latestAction?: CongressBillLatestAction;
  /** URL to the bill's Congress.gov API detail endpoint */
  url?: string;
  updateDate?: string;
  introducedDate?: string;
}

interface CongressBillListResponse {
  bills: CongressBillListItem[];
  pagination: {
    count: number;
    total?: number;
    next?: string;
  };
  request?: {
    contentType: string;
    format: string;
  };
}

/** Shape of a sponsor entry from the bill detail endpoint */
interface CongressBillSponsor {
  bioguideId: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  party?: string;
  state?: string;
  district?: number;
  isByRequest?: string;
}

/** Shape of a subject entry */
interface CongressBillSubject {
  name: string;
  updateDate?: string;
}

/** Shape returned by /bill/{congress}/{type}/{number} */
interface CongressBillDetailResponse {
  bill: {
    congress?: number;
    number?: string;
    type?: string;
    title?: string;
    originChamber?: string;
    introducedDate?: string;
    latestAction?: CongressBillLatestAction;
    sponsors?: CongressBillSponsor[];
    // The detail endpoint exposes policyArea at the top level of bill.
    // `subjects` on the detail is just {count, url} — actual subject names
    // require a separate call to /bill/.../subjects.
    policyArea?: { name: string };
    subjects?: {
      count?: number;
      url?: string;
    };
    summaries?: {
      count?: number;
    };
    textVersions?: {
      count?: number;
    };
    cboCostEstimates?: Array<{ url?: string }>;
    constitutionalAuthorityStatementText?: string;
    updateDate?: string;
  };
}

/** Shape returned by /bill/{congress}/{type}/{number}/subjects */
interface CongressBillSubjectsResponse {
  subjects?: {
    legislativeSubjects?: CongressBillSubject[];
    policyArea?: { name: string };
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildApiUrl(path: string, extraParams?: Record<string, string>): string {
  const url = new URL(`${CONGRESS_API_BASE}${path}`);
  url.searchParams.set("api_key", process.env.CONGRESS_GOV_API_KEY ?? "");
  url.searchParams.set("format", "json");
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function congressFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    // No Next.js cache — this is a sync job that must always get fresh data
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
    throw new ExternalAPIError("Unable to fetch bill data. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }

  return res.json() as Promise<T>;
}

/**
 * Map an originChamber string from the API to the Chamber enum.
 * "House" → HOUSE, "Senate" → SENATE
 */
function mapChamber(originChamber: string): Chamber {
  const normalized = originChamber.trim().toLowerCase();
  if (normalized === "senate") return Chamber.SENATE;
  // "house", "house of representatives", etc.
  return Chamber.HOUSE;
}

/**
 * Derive a BillStatus from the free-text of the latest action.
 * Priority order matters — check most specific phrases first.
 */
function mapStatus(latestActionText: string | undefined): BillStatus {
  if (!latestActionText) return BillStatus.INTRODUCED;

  const text = latestActionText.toLowerCase();

  if (text.includes("became public law") || text.includes("signed by president")) {
    return BillStatus.SIGNED;
  }
  if (text.includes("vetoed")) {
    return BillStatus.VETOED;
  }
  if (
    text.includes("failed") ||
    text.includes("defeated") ||
    text.includes("motion to proceed rejected")
  ) {
    return BillStatus.FAILED;
  }
  if (text.includes("passed senate") || text.includes("passed the senate")) {
    return BillStatus.PASSED_SENATE;
  }
  if (text.includes("passed house") || text.includes("passed the house")) {
    return BillStatus.PASSED_HOUSE;
  }
  if (
    text.includes("committee") ||
    text.includes("referred to") ||
    text.includes("reported by") ||
    text.includes("subcommittee")
  ) {
    return BillStatus.IN_COMMITTEE;
  }

  return BillStatus.INTRODUCED;
}

/**
 * Build the externalId for a bill: "{congress}-{type}-{number}"
 * e.g. "119-hr-1234"
 * The type is lowercased to ensure consistency (API returns "hr", "s", "hjres", etc.)
 */
function buildExternalId(congress: number, type: string, number: string): string {
  return `${congress}-${type.toLowerCase()}-${number}`;
}

// ─────────────────────────────────────────────
// Paginated bill list fetcher
// ─────────────────────────────────────────────

async function fetchRecentBills(maxBills: number): Promise<CongressBillListItem[]> {
  const all: CongressBillListItem[] = [];

  let nextUrl: string | null = buildApiUrl(`/bill/${CURRENT_CONGRESS}`, {
    limit: String(PAGE_LIMIT),
    sort: "updateDate desc",
  });

  let pageNum = 0;

  while (nextUrl && all.length < maxBills) {
    pageNum++;
    const logUrl = new URL(nextUrl);
    logUrl.searchParams.delete("api_key");
    console.log(`[sync-bills] Fetching bill list page ${pageNum}: ${logUrl.toString()}`);

    const data: CongressBillListResponse = await congressFetch<CongressBillListResponse>(nextUrl);
    const bills = data.bills ?? [];
    all.push(...bills);

    console.log(
      `[sync-bills] Page ${pageNum}: got ${bills.length} bills (total so far: ${all.length})`
    );

    const rawNext = data.pagination?.next;
    if (rawNext && bills.length === PAGE_LIMIT && all.length < maxBills) {
      const parsedNext = new URL(rawNext);
      if (!parsedNext.searchParams.has("api_key")) {
        parsedNext.searchParams.set(
          "api_key",
          process.env.CONGRESS_GOV_API_KEY ?? ""
        );
      }
      parsedNext.searchParams.set("format", "json");
      nextUrl = parsedNext.toString();
    } else {
      nextUrl = null;
    }
  }

  // Trim to exact max in case the last page pushed us slightly over
  return all.slice(0, maxBills);
}

// ─────────────────────────────────────────────
// Bill detail fetcher
// ─────────────────────────────────────────────

async function fetchBillDetail(
  congress: number,
  type: string,
  number: string
): Promise<CongressBillDetailResponse["bill"] | null> {
  try {
    const url = buildApiUrl(`/bill/${congress}/${type.toLowerCase()}/${number}`);
    const data = await congressFetch<CongressBillDetailResponse>(url);
    return data.bill ?? null;
  } catch (err) {
    console.warn(
      `[sync-bills] Could not fetch detail for ${congress}-${type}-${number}:`,
      err
    );
    return null;
  }
}

// Separate endpoint — returns up to ~20 detailed legislative subjects.
// Costs one extra API call per bill, so we only call it for bills that
// advance past "In Committee" (the ones most likely to matter for analysis).
async function fetchBillSubjects(
  congress: number,
  type: string,
  number: string
): Promise<string[]> {
  try {
    const url = buildApiUrl(`/bill/${congress}/${type.toLowerCase()}/${number}/subjects`);
    const data = await congressFetch<CongressBillSubjectsResponse>(url);
    return (data.subjects?.legislativeSubjects ?? [])
      .map((s) => s.name)
      .filter(Boolean);
  } catch (err) {
    console.warn(
      `[sync-bills] Could not fetch subjects for ${congress}-${type}-${number}:`,
      err
    );
    return [];
  }
}

// ─────────────────────────────────────────────
// Sponsor lookup — cached to avoid redundant DB hits
// ─────────────────────────────────────────────

type SponsorCache = Map<string, number | null>; // bioguideId → Candidate.id | null

async function lookupSponsorId(
  bioguideId: string,
  cache: SponsorCache
): Promise<number | null> {
  if (cache.has(bioguideId)) {
    return cache.get(bioguideId) ?? null;
  }

  // The Candidate model stores { bioguideId: "X123" } in its contactInfo JSON field.
  // Prisma supports JSON path filters on PostgreSQL via path + equals.
  const candidate = await prisma.candidate.findFirst({
    where: {
      contactInfo: {
        path: ["bioguideId"],
        equals: bioguideId,
      },
    },
    select: { id: true },
  });

  const id = candidate?.id ?? null;
  cache.set(bioguideId, id);
  return id;
}

// ─────────────────────────────────────────────
// Upsert a single bill
// ─────────────────────────────────────────────

async function upsertBill(
  listItem: CongressBillListItem,
  detail: CongressBillDetailResponse["bill"] | null,
  sponsorCache: SponsorCache
): Promise<"created" | "updated"> {
  const { congress, type, number } = listItem;
  const externalId = buildExternalId(congress, type, number);

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = detail?.title ?? listItem.title ?? "(Untitled)";

  // ── Chamber ───────────────────────────────────────────────────────────────
  const chamberRaw = detail?.originChamber ?? listItem.originChamber ?? "House";
  const chamber = mapChamber(chamberRaw);

  // ── Status ────────────────────────────────────────────────────────────────
  const latestActionText =
    detail?.latestAction?.text ?? listItem.latestAction?.text;
  const status = mapStatus(latestActionText);

  // ── Dates ─────────────────────────────────────────────────────────────────
  const introducedRaw = detail?.introducedDate ?? listItem.introducedDate;
  // introducedDate is non-nullable in the schema; fall back to today if absent
  const introducedDate = introducedRaw
    ? new Date(introducedRaw)
    : new Date();

  const lastActionRaw = detail?.latestAction?.actionDate ?? listItem.latestAction?.actionDate;
  const lastActionDate = lastActionRaw ? new Date(lastActionRaw) : null;

  // ── Congress.gov URL ───────────────────────────────────────────────────────
  // The list item's `url` points to the API endpoint, not the human-readable page.
  // Build the human-readable URL pattern instead.
  const congressGovUrl =
    `https://www.congress.gov/bill/${CURRENT_CONGRESS}th-congress/${
      chamber === Chamber.HOUSE ? "house" : "senate"
    }-bill/${number}`;

  // ── Subjects ──────────────────────────────────────────────────────────────
  // policyArea (single top-level category) is returned inline by the bill detail.
  // legislativeSubjects (detailed tags) require a separate /subjects call —
  // only worth spending an API call on bills that are actually moving.
  const policyArea = detail?.policyArea?.name;
  const legislativeSubjects =
    status !== BillStatus.INTRODUCED && status !== BillStatus.IN_COMMITTEE
      ? await fetchBillSubjects(CURRENT_CONGRESS, type, number)
      : [];
  const subjects: string[] = policyArea
    ? [policyArea, ...legislativeSubjects]
    : legislativeSubjects;

  // ── Sponsor ───────────────────────────────────────────────────────────────
  let sponsorId: number | null = null;
  const primarySponsor = detail?.sponsors?.[0];
  if (primarySponsor?.bioguideId) {
    sponsorId = await lookupSponsorId(primarySponsor.bioguideId, sponsorCache);
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  const existing = await prisma.bill.findUnique({
    where: { externalId },
    select: { id: true },
  });

  if (existing) {
    await prisma.bill.update({
      where: { externalId },
      data: {
        title,
        chamber,
        status,
        lastActionDate,
        congressGovUrl,
        subjects,
        ...(sponsorId !== null && { sponsorId }),
        updatedAt: new Date(),
      },
    });
    return "updated";
  } else {
    await prisma.bill.create({
      data: {
        externalId,
        title,
        chamber,
        status,
        introducedDate,
        lastActionDate,
        congressGovUrl,
        subjects,
        sponsorId,
      },
    });
    return "created";
  }
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
    console.log("[sync-bills] Manual trigger in development mode — skipping auth");
  } else if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "CONGRESS_GOV_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  const startTime = Date.now();
  console.log(
    `[sync-bills] Starting Congress.gov bill sync (congress: ${CURRENT_CONGRESS}, max: ${MAX_BILLS_PER_RUN})...`
  );

  try {
    // 1. Fetch the list of recently-updated bills (paginated, capped at MAX_BILLS_PER_RUN)
    const billList = await fetchRecentBills(MAX_BILLS_PER_RUN);
    console.log(`[sync-bills] Fetched ${billList.length} bills from Congress.gov list endpoint`);

    if (billList.length === 0) {
      return Response.json({
        synced: 0,
        created: 0,
        updated: 0,
        errors: 0,
        message: "No bills returned from Congress.gov API",
      });
    }

    // 2. Process bills sequentially — fetch detail + upsert one at a time
    //    to stay well within Congress.gov rate limits (default ~1000 req/hr).
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Shared sponsor lookup cache across all bills to avoid redundant DB queries
    const sponsorCache: SponsorCache = new Map();

    for (let i = 0; i < billList.length; i++) {
      const listItem = billList[i];
      const label = buildExternalId(listItem.congress, listItem.type, listItem.number);

      try {
        // Fetch the detail endpoint for sponsor bioguideId, subjects, etc.
        const detail = await fetchBillDetail(
          listItem.congress,
          listItem.type,
          listItem.number
        );

        const result = await upsertBill(listItem, detail, sponsorCache);
        if (result === "created") created++;
        else updated++;
      } catch (err) {
        errors++;
        console.error(`[sync-bills] Error processing bill ${label}:`, err);
      }

      // Log progress every 50 bills
      if ((i + 1) % 50 === 0 || i + 1 === billList.length) {
        console.log(
          `[sync-bills] Progress: ${i + 1}/${billList.length} processed ` +
            `(created: ${created}, updated: ${updated}, errors: ${errors})`
        );
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const synced = created + updated;

    console.log(
      `[sync-bills] Sync complete in ${elapsed}s — ` +
        `synced: ${synced}, created: ${created}, updated: ${updated}, errors: ${errors}`
    );

    await logSync({
      syncType: "bills",
      status: errors > 0 ? "partial" : "success",
      recordsTotal: billList.length,
      recordsSynced: synced,
      recordsFailed: errors,
      durationMs: Date.now() - startTime,
      metadata: { created, updated, congress: CURRENT_CONGRESS },
    });

    return Response.json({
      synced,
      created,
      updated,
      errors,
      total: billList.length,
      congress: CURRENT_CONGRESS,
      elapsedSeconds: parseFloat(elapsed),
      message: `Successfully synced ${synced} of ${billList.length} bills`,
    });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[sync-bills] Fatal error after ${elapsed}s:`, error);
    return Response.json(
      {
        error: "Sync failed",
        detail: "Check server logs for details",
        elapsedSeconds: parseFloat(elapsed),
      },
      { status: 500 }
    );
  }
}, { route: "GET /api/cron/sync-bills", jobName: "sync-bills" });
