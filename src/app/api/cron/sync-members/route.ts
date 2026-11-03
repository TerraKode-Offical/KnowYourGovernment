// ─────────────────────────────────────────────
// GET /api/cron/sync-members
// Cron Job — sync federal legislators from Congress.gov API v3
// Schedule: daily (configure in vercel.json)
//
// Accepts ?manual=true to bypass the CRON_SECRET check in development.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { OfficeType } from "@prisma/client";
import { withCronErrorHandler, ValidationError, NotFoundError, ExternalAPIError } from "@/lib/api-error-handler";

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const PAGE_LIMIT = 250;

// ─────────────────────────────────────────────
// Congress.gov API response types
// ─────────────────────────────────────────────

interface CongressMemberTerm {
  chamber: string;           // "Senate" | "House of Representatives"
  congress?: number;         // Present on detail endpoint, ABSENT on list endpoint
  startYear?: number;
  endYear?: number;
  district?: number | null;
  memberType?: string;
  stateCode?: string;
  stateName?: string;
}

interface CongressMemberDepiction {
  imageUrl?: string;
  attribution?: string;
}

/** Shape of each entry in the /member list endpoint */
interface CongressMemberListItem {
  bioguideId: string;
  name: string;
  /** Full display name (may differ from name) */
  directOrderName?: string;
  invertedOrderName?: string;
  honorificName?: string;
  /** Two-letter state abbreviation */
  state: string;
  party?: string;
  partyName?: string;
  district?: number | null;
  /** Array of term objects — newest last OR newest first depending on API version */
  terms?: {
    item?: CongressMemberTerm[];
  } | CongressMemberTerm[];
  depiction?: CongressMemberDepiction;
  /** URL to the member's Congress.gov detail page */
  url?: string;
  updateDate?: string;
}

interface CongressMemberListResponse {
  members: CongressMemberListItem[];
  pagination: {
    count: number;
    total?: number;
    next?: string;  // Full URL to next page, or absent if last page
  };
  request?: {
    contentType: string;
    format: string;
  };
}

/** Shape returned by the /member/{bioguideId} detail endpoint */
interface CongressMemberDetailResponse {
  member: {
    bioguideId: string;
    directOrderName?: string;
    invertedOrderName?: string;
    officialWebsiteUrl?: string;
    depiction?: CongressMemberDepiction;
    terms?: CongressMemberTerm[];
    addressInformation?: {
      officeAddress?: string;
      city?: string;
      district?: string;
      zipCode?: number;
      phoneNumber?: string;
    };
    leadership?: Array<{ congress: number; type: string }>;
    partyHistory?: Array<{ partyName: string; partyAbbreviation: string; startYear: number }>;
    birthYear?: string;
    updateDate?: string;
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
    throw new ExternalAPIError("Unable to fetch member data. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }

  return res.json() as Promise<T>;
}

/**
 * Resolve the latest/current term from the `terms` field,
 * which can be either an object-with-item-array or a plain array
 * (the API has returned both shapes in different contexts).
 */
function resolveLatestTerm(
  terms: CongressMemberListItem["terms"]
): CongressMemberTerm | null {
  let list: CongressMemberTerm[] = [];

  if (!terms) return null;

  if (Array.isArray(terms)) {
    list = terms;
  } else if (terms.item && Array.isArray(terms.item)) {
    list = terms.item;
  }

  if (list.length === 0) return null;

  // Sort descending by start year (primary) and congress number (tiebreaker).
  // The list endpoint omits `congress`, so sorting by congress alone becomes
  // a no-op and the API-provided order wins — which for senators who were
  // previously representatives puts their old House term first, misclassifying
  // them. startYear is always present and correctly orders chronologically.
  const sorted = [...list].sort((a, b) => {
    const yearDelta = (b.startYear ?? 0) - (a.startYear ?? 0);
    if (yearDelta !== 0) return yearDelta;
    return (b.congress ?? 0) - (a.congress ?? 0);
  });
  return sorted[0];
}

/** Map Congress.gov chamber string → OfficeType enum value */
function chamberToOfficeType(chamber: string): OfficeType {
  const normalized = chamber.trim().toLowerCase();
  if (normalized === "senate") return OfficeType.US_SENATOR;
  if (normalized.includes("house")) return OfficeType.US_REPRESENTATIVE;
  return OfficeType.OTHER;
}

/** Normalize party names from Congress.gov to simple labels */
function normalizeParty(raw: string | undefined): string {
  if (!raw) return "Unknown";
  const p = raw.trim();
  if (p === "R" || p === "Republican") return "Republican";
  if (p === "D" || p === "Democrat" || p === "Democratic") return "Democrat";
  if (p === "I" || p === "Independent") return "Independent";
  return p;
}

// ─────────────────────────────────────────────
// Main fetcher — pages through the full member list
// ─────────────────────────────────────────────

async function fetchAllCurrentMembers(): Promise<CongressMemberListItem[]> {
  const all: CongressMemberListItem[] = [];

  // First page — build URL manually so we control the params
  let nextUrl: string | null = buildApiUrl("/member", {
    limit: String(PAGE_LIMIT),
    currentMember: "true",
  });

  let pageNum = 0;

  while (nextUrl) {
    pageNum++;
    const logUrl = new URL(nextUrl);
    logUrl.searchParams.delete("api_key");
    console.log(`[sync-members] Fetching page ${pageNum}: ${logUrl.toString()}`);

    const data: CongressMemberListResponse = await congressFetch<CongressMemberListResponse>(nextUrl);

    const members: CongressMemberListItem[] = data.members ?? [];
    all.push(...members);

    console.log(
      `[sync-members] Page ${pageNum}: got ${members.length} members (total so far: ${all.length})`
    );

    // The API provides the full next-page URL in pagination.next
    // but we need to ensure our api_key is still present (it usually is).
    const rawNext: string | undefined = data.pagination?.next;
    if (rawNext && members.length === PAGE_LIMIT) {
      // Append our api_key if missing (the "next" URL may omit it)
      const parsedNext: URL = new URL(rawNext);
      if (!parsedNext.searchParams.has("api_key")) {
        parsedNext.searchParams.set(
          "api_key",
          process.env.CONGRESS_GOV_API_KEY ?? ""
        );
      }
      parsedNext.searchParams.set("format", "json");
      nextUrl = parsedNext.toString();
    } else {
      nextUrl = null; // No more pages
    }
  }

  return all;
}

// ─────────────────────────────────────────────
// Optional: fetch member detail for website URL
// Only called when the list endpoint doesn't include officialWebsiteUrl
// ─────────────────────────────────────────────

async function fetchMemberWebsite(bioguideId: string): Promise<string | null> {
  try {
    const url = buildApiUrl(`/member/${bioguideId}`);
    const data =
      await congressFetch<CongressMemberDetailResponse>(url);
    return data.member?.officialWebsiteUrl ?? null;
  } catch (err) {
    // Non-fatal — website is optional
    console.warn(
      `[sync-members] Could not fetch detail for ${bioguideId}:`,
      err
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// State lookup cache (avoid repeated DB calls)
// ─────────────────────────────────────────────

type StateMap = Map<string, number>; // abbreviation (upper) → state.id

async function buildStateMap(): Promise<StateMap> {
  const states = await prisma.state.findMany({
    select: { id: true, name: true, abbreviation: true },
  });
  const map: StateMap = new Map();
  for (const s of states) {
    // Map by both abbreviation ("CA") and full name ("California")
    map.set(s.abbreviation.toUpperCase(), s.id);
    map.set(s.name.toUpperCase(), s.id);
  }
  return map;
}

// ─────────────────────────────────────────────
// Upsert a single member record
// ─────────────────────────────────────────────

async function upsertMember(
  member: CongressMemberListItem,
  stateMap: StateMap
): Promise<"created" | "updated" | "skipped"> {
  const latestTerm = resolveLatestTerm(member.terms);

  // Determine chamber from the term; fall back to district presence
  let officeType: OfficeType;
  if (latestTerm) {
    officeType = chamberToOfficeType(latestTerm.chamber ?? "");
  } else if (member.district != null) {
    officeType = OfficeType.US_REPRESENTATIVE;
  } else {
    // Cannot determine chamber — skip
    console.warn(
      `[sync-members] Skipping ${member.name} (${member.bioguideId}): cannot determine chamber`
    );
    return "skipped";
  }

  const stateAbbr = (member.state ?? "").toUpperCase();
  const stateId = stateMap.get(stateAbbr) ?? null;

  // District: only meaningful for House members
  let district: string | null = null;
  if (officeType === OfficeType.US_REPRESENTATIVE) {
    const rawDistrict =
      latestTerm?.district ?? member.district ?? null;
    district = rawDistrict != null ? String(rawDistrict) : null;
  }

  const party = normalizeParty(member.party ?? member.partyName);
  const photoUrl = member.depiction?.imageUrl ?? null;
  // Fetch the real official website from the member detail endpoint
  const officialWebsite = await fetchMemberWebsite(member.bioguideId);
  const websiteUrl = officialWebsite ?? null;

  // Build a canonical display name. directOrderName is "First Last" — what users
  // expect to see. invertedOrderName is "Last, First" (sort order).
  const name =
    member.directOrderName ??
    member.name ??
    member.invertedOrderName;

  // Determine incumbentSince from term start
  let incumbentSince: Date | null = null;
  if (latestTerm?.startYear) {
    incumbentSince = new Date(`${latestTerm.startYear}-01-03`);
  }

  // Determine term end from term endYear (senators serve 6-year terms; representatives 2)
  let termEnds: Date | null = null;
  if (latestTerm?.endYear) {
    termEnds = new Date(`${latestTerm.endYear}-01-03`);
  }

  // Store the bioguideId in contactInfo for future cross-referencing
  const contactInfo = { bioguideId: member.bioguideId };

  // Look up by bioguideId ONLY — not scoped by officeType. bioguideId is
  // globally unique per member, and if a member was previously misclassified
  // (e.g. senator stored as representative) we want to update the existing
  // row in place, not create a duplicate under the new officeType.
  const existingByBioguide = await prisma.candidate.findFirst({
    where: {
      contactInfo: { path: ["bioguideId"], equals: member.bioguideId },
    },
    select: { id: true },
  });
  // Legacy-seed fallback: rows without bioguideId, match by name + state + office
  const existing = existingByBioguide ?? await prisma.candidate.findFirst({
    where: {
      name,
      stateId,
      officeType,
      contactInfo: { equals: {} },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.candidate.update({
      where: { id: existing.id },
      data: {
        name,
        party,
        photoUrl,
        websiteUrl,
        stateId,
        officeType,
        district,
        isIncumbent: true,
        incumbentSince: incumbentSince ?? undefined,
        termEnds: termEnds ?? undefined,
        contactInfo,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return "updated";
  } else {
    await prisma.candidate.create({
      data: {
        name,
        party,
        photoUrl,
        websiteUrl,
        stateId,
        officeType,
        district,
        isIncumbent: true,
        incumbentSince,
        termEnds,
        contactInfo,
        lastVerifiedAt: new Date(),
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
    console.log("[sync-members] Manual trigger in development mode — skipping auth");
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
  console.log("[sync-members] Starting Congress.gov member sync...");

  try {
    // 1. Load all US states from DB into a lookup map
    const stateMap = await buildStateMap();
    console.log(`[sync-members] Loaded ${stateMap.size} states from database`);

    // 2. Fetch every current member from the Congress.gov API (paginated)
    const allMembers = await fetchAllCurrentMembers();
    console.log(
      `[sync-members] Fetched ${allMembers.length} current members from Congress.gov`
    );

    if (allMembers.length === 0) {
      return Response.json({
        synced: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: "No members returned from Congress.gov API",
      });
    }

    // 3. Upsert each member — process sequentially to be DB-friendly
    //    and to avoid hammering the DB with hundreds of parallel writes.
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < allMembers.length; i++) {
      const member = allMembers[i];

      try {
        const result = await upsertMember(member, stateMap);
        if (result === "created") created++;
        else if (result === "updated") updated++;
        else skipped++;
      } catch (err) {
        errors++;
        console.error(
          `[sync-members] Error upserting member ${member.name} (${member.bioguideId}):`,
          err
        );
      }

      // Log progress every 50 members
      if ((i + 1) % 50 === 0 || i + 1 === allMembers.length) {
        console.log(
          `[sync-members] Progress: ${i + 1}/${allMembers.length} processed ` +
            `(created: ${created}, updated: ${updated}, skipped: ${skipped}, errors: ${errors})`
        );
      }
    }

    const durationMs = Date.now() - startTime;
    const elapsed = (durationMs / 1000).toFixed(1);
    const synced = created + updated;

    console.log(
      `[sync-members] Sync complete in ${elapsed}s — ` +
        `synced: ${synced}, created: ${created}, updated: ${updated}, ` +
        `skipped: ${skipped}, errors: ${errors}`
    );

    await prisma.dataSyncLog.create({
      data: {
        syncType: "members",
        status: errors === 0 ? "success" : "partial",
        recordsTotal: allMembers.length,
        recordsSynced: synced,
        recordsFailed: errors,
        durationMs,
        metadata: { created, updated, skipped },
      },
    });

    return Response.json({
      synced,
      created,
      updated,
      skipped,
      errors,
      total: allMembers.length,
      elapsedSeconds: parseFloat(elapsed),
      message: `Successfully synced ${synced} of ${allMembers.length} members`,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const elapsed = (durationMs / 1000).toFixed(1);
    console.error(`[sync-members] Fatal error after ${elapsed}s:`, error);

    await prisma.dataSyncLog.create({
      data: {
        syncType: "members",
        status: "failed",
        durationMs,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    }).catch(() => {}); // Don't fail the response if logging fails

    return Response.json(
      {
        error: "Sync failed",
        detail: "Check server logs for details",
        elapsedSeconds: parseFloat(elapsed),
      },
      { status: 500 }
    );
  }
}, { route: "GET /api/cron/sync-members", jobName: "sync-members" });
