// ─────────────────────────────────────────────
// GET /api/cron/sync-candidates
//
// Imports 2026-cycle congressional candidates from the FEC so that
// challengers appear alongside incumbents. Previously the site only
// ingested sitting members (sync-members), which made every race look
// uncontested.
//
// Inclusion filter (deliberately conservative):
//   cycle=2026, candidate_status=C (statutory candidate),
//   has_raised_funds=true
// This excludes paper candidates and perennial filers while covering
// everyone who has reported raising money.
//
// Query params:
//   state=MI      limit to one state (2-letter)
//   office=H|S    limit to one chamber
//   pages=N       max list pages per office (default 30, max 60)
//   dryRun=true   report what would change without writing
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { OfficeType } from "@prisma/client";
import { verifyCronSecret } from "@/lib/auth";
import {
  withCronErrorHandler,
  AuthenticationError,
  ExternalAPIError,
} from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

const FEC_BASE = "https://api.open.fec.gov/v1";
const CYCLE = 2026;
const PER_PAGE = 100;
const REQUEST_DELAY_MS = 550;

interface FecCandidate {
  candidate_id: string;
  name: string;
  party: string | null;
  state: string | null;
  district: string | null;
  office: string | null;
  incumbent_challenge: string | null;
  candidate_status: string | null;
}

interface FecCandidateList {
  results?: FecCandidate[];
  pagination?: { count?: number; pages?: number };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const NAME_SUFFIX = /\b(mr|mrs|ms|dr|rep|sen|jr|sr|ii|iii|iv)\.?\b/gi;

/** "SMITH, JOHN A" → "Smith, John A" (matches the site's Congress.gov format). */
function normalizeFecName(raw: string): string {
  const cleaned = raw.replace(NAME_SUFFIX, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  if (!cleaned.includes(",")) return titleCase(cleaned);

  const [lastPart, firstPart] = cleaned.split(",", 2);
  const last = titleCase(lastPart.trim());
  const first = titleCase(firstPart.trim());
  const name = first ? `${last}, ${first}` : last;
  return name.length > 2 ? name : titleCase(cleaned);
}

function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

/** "Barrett, Tom" → "barrett"; "Thomas More Barrett" → "barrett". */
function surnameKey(value: string): string {
  const cleaned = value.replace(NAME_SUFFIX, "").trim();
  if (cleaned.includes(",")) {
    return nameKey(cleaned.split(",", 1)[0]);
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return nameKey(parts[parts.length - 1] ?? "");
}

function mapParty(party: string | null): string {
  switch ((party ?? "").toUpperCase()) {
    case "DEM":
      return "Democrat";
    case "REP":
      return "Republican";
    case "IND":
      return "Independent";
    case "LIB":
      return "Libertarian";
    case "GRE":
      return "Green Party";
    case "NON":
    case "UNK":
      return "No Party Preference";
    default:
      return "Other";
  }
}

function mapOffice(office: string | null): OfficeType | null {
  if (office === "H") return OfficeType.US_REPRESENTATIVE;
  if (office === "S") return OfficeType.US_SENATOR;
  return null;
}

/** FEC districts are zero-padded ("04"); the site stores "4". */
function mapDistrict(office: string | null, district: string | null): string | null {
  if (office !== "H") return null;
  if (!district) return null;
  const n = Number(district);
  if (!Number.isFinite(n) || n === 0) return null;
  return String(n);
}

async function fetchFecPage(
  apiKey: string,
  office: "H" | "S",
  page: number,
  state: string | undefined
): Promise<FecCandidateList> {
  const url = new URL(`${FEC_BASE}/candidates/`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("cycle", String(CYCLE));
  url.searchParams.set("office", office);
  url.searchParams.set("candidate_status", "C");
  url.searchParams.set("has_raised_funds", "true");
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "name");
  if (state) url.searchParams.set("state", state);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 429) {
    throw new ExternalAPIError("FEC rate limit reached. Please try again later.");
  }
  if (!res.ok) {
    throw new ExternalAPIError(`FEC request failed with status ${res.status}`);
  }
  return (await res.json()) as FecCandidateList;
}

export const GET = withCronErrorHandler(async (request: Request) => {
  if (!verifyCronSecret(request)) {
    throw new AuthenticationError("Unauthorized");
  }

  const apiKey = process.env.FEC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { skipped: true, reason: "FEC_API_KEY is not configured" },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const stateParam = searchParams.get("state")?.trim().toUpperCase();
  const officeParam = searchParams.get("office")?.trim().toUpperCase();
  const dryRun = searchParams.get("dryRun") === "true";
  const pagesParam = Number(searchParams.get("pages") ?? "30");
  const maxPages = Number.isFinite(pagesParam)
    ? Math.min(Math.max(1, Math.floor(pagesParam)), 60)
    : 30;

  const offices: Array<"H" | "S"> =
    officeParam === "H" || officeParam === "S"
      ? [officeParam]
      : ["H", "S"];

  const startedAt = Date.now();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let seen = 0;

  const states = await prisma.state.findMany({
    select: { id: true, abbreviation: true },
  });
  const stateIdByAbbr = new Map(
    states.map((s) => [s.abbreviation.toUpperCase(), s.id])
  );

  for (const office of offices) {
    // Cache existing candidates per state+office for duplicate detection.
    const existingByScope = new Map<
      string,
      Array<{
        id: number;
        name: string;
        fecCandidateId: string | null;
        district: string | null;
        isIncumbent: boolean;
      }>
    >();

    for (let page = 1; page <= maxPages; page++) {
      const data = await fetchFecPage(apiKey, office, page, stateParam);
      const results = data.results ?? [];
      if (results.length === 0) break;

      for (const fec of results) {
        seen++;
        const abbr = (fec.state ?? "").toUpperCase();
        const stateId = stateIdByAbbr.get(abbr);
        const officeType = mapOffice(office);
        const name = normalizeFecName(fec.name ?? "");

        if (!stateId || !officeType || !fec.candidate_id || name.length < 3) {
          skipped++;
          continue;
        }

        try {
          const scope = `${stateId}:${officeType}`;
          let scopeList = existingByScope.get(scope);
          if (!scopeList) {
            scopeList = await prisma.candidate.findMany({
              where: { stateId, officeType },
              select: { id: true, name: true, fecCandidateId: true, district: true, isIncumbent: true },
            });
            existingByScope.set(scope, scopeList);
          }

          const district = mapDistrict(office, fec.district);
          const isIncumbent = fec.incumbent_challenge === "I";
          const surname = surnameKey(name);

          const byFecId = scopeList.find(
            (c) => c.fecCandidateId === fec.candidate_id
          );
          let existing =
            byFecId ??
            scopeList.find((c) => nameKey(c.name) === nameKey(name));

          if (!existing && isIncumbent) {
            // House incumbents are unique per district; senators are matched
            // by surname within the state (FEC first names vary: Bill/William).
            existing =
              office === "H"
                ? scopeList.find((c) => c.isIncumbent && c.district === district)
                : scopeList.find(
                    (c) => c.isIncumbent && surnameKey(c.name) === surname
                  );
          }

          if (!existing && district) {
            // Same surname in the same district is almost certainly the same
            // person even when the first name differs.
            existing = scopeList.find(
              (c) => c.district === district && surnameKey(c.name) === surname
            );
          }

          if (existing) {
            if (!dryRun) {
              await prisma.candidate.update({
                where: { id: existing.id },
                data: {
                  fecCandidateId: fec.candidate_id,
                  party: mapParty(fec.party),
                  district: existing.district ?? district,
                  isIncumbent: isIncumbent || undefined,
                  lastVerifiedAt: new Date(),
                },
              });
            }
            existing.fecCandidateId = fec.candidate_id;
            updated++;
          } else {
            if (!dryRun) {
              const createdRow = await prisma.candidate.create({
                data: {
                  name,
                  party: mapParty(fec.party),
                  officeType,
                  district,
                  stateId,
                  isIncumbent,
                  fecCandidateId: fec.candidate_id,
                  lastVerifiedAt: new Date(),
                  contactInfo: {},
                  socialMedia: {},
                },
                select: { id: true },
              });
              scopeList.push({
                id: createdRow.id,
                name,
                fecCandidateId: fec.candidate_id,
                district,
                isIncumbent,
              });
            }
            created++;
          }
        } catch {
          errors++;
        }
      }

      const totalPages = data.pagination?.pages ?? 1;
      if (page >= totalPages) break;
      await delay(REQUEST_DELAY_MS);
    }
  }

  const durationMs = Date.now() - startedAt;

  if (!dryRun) {
    await logSync({
      syncType: "candidates",
      status: errors > 0 ? "partial" : "success",
      recordsTotal: seen,
      recordsSynced: created + updated,
      recordsFailed: errors,
      durationMs,
      metadata: { created, updated, skipped, cycle: CYCLE, dryRun },
    });
  }

  return Response.json({
    success: true,
    dryRun,
    seen,
    created,
    updated,
    skipped,
    errors,
    cycle: CYCLE,
    elapsedSeconds: Math.round(durationMs / 100) / 10,
  });
}, { route: "GET /api/cron/sync-candidates", jobName: "sync-candidates" });
