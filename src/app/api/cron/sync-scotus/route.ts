import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

// ─────────────────────────────────────────────
// GET /api/cron/sync-scotus
//
// Incremental sync — checks for changes before doing work:
//   1. Oyez API — justices (skip if recently synced), cases (skip terms with no new cases)
//   2. CourtListener API — financial disclosures (skip justices with no new disclosures)
//
// Schedule-aware (cron fires hourly, handler decides whether to work):
//   Oct–May:      Once daily (order lists, occasional opinions)
//   June 15–30:   Every invocation (opinion dump season)
//   June 1–14:    Every 6 hours
//   July–Sept:    Weekly (recess — almost nothing happens)
//
// Both APIs are free. CourtListener benefits from a token for higher rate limits.
// Set COURTLISTENER_API_TOKEN in .env (optional).
// ─────────────────────────────────────────────

const CURRENT_TERM = new Date().getFullYear();
const TERMS_TO_SYNC = [CURRENT_TERM, CURRENT_TERM - 1, CURRENT_TERM - 2];
const DELAY_MS = 400;
const JUSTICE_REFRESH_DAYS = 30;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────
// SCOTUS-calendar schedule gate
//
// Returns the minimum hours between syncs for the current date.
// The cron fires hourly; this function decides whether enough time
// has passed since the last successful sync.
// ─────────────────────────────────────────────

function getSyncIntervalHours(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1; // 1-12
  const day = now.getUTCDate();

  // June 15-30: opinion dump season — every hour
  if (month === 6 && day >= 15) return 1;

  // June 1-14: ramping up — every 6 hours
  if (month === 6) return 6;

  // July-September: recess — weekly
  if (month >= 7 && month <= 9) return 168; // 7 * 24

  // October-May: regular term — once daily
  return 24;
}

/**
 * Check whether enough time has passed since the last successful sync.
 * Uses the most recently updated CourtCase as a proxy for "last sync time".
 */
async function shouldRunNow(): Promise<boolean> {
  const intervalHours = getSyncIntervalHours();

  const lastSynced = await prisma.courtCase.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  if (!lastSynced) return true; // Never synced — always run

  const hoursSinceLast =
    (Date.now() - lastSynced.updatedAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceLast >= intervalHours;
}

// ─────────────────────────────────────────────
// Oyez types
// ─────────────────────────────────────────────

interface OyezCaseListItem {
  ID: number;
  href: string;
  name: string;
  docket_number: string;
  term: string;
  description: string;
  question: string;
  justia_url: string;
  timeline: Array<{ event: string; dates: Array<{ date: number }> }>;
}

interface OyezVote {
  member: { identifier: string; name: string };
  vote: string;
  opinion_type?: string;
  ideology?: number;
}

interface OyezDecision {
  votes: OyezVote[];
  majority_vote: number;
  minority_vote: number;
  decision_type: string;
}

interface OyezCaseDetail {
  ID: number;
  name: string;
  docket_number: string;
  term: string;
  first_party: string;
  second_party: string;
  facts_of_the_case: string;
  question: string;
  conclusion: string;
  justia_url: string;
  decisions: OyezDecision[];
  timeline: Array<{ event: string; dates: Array<{ date: number }> }>;
}

interface OyezJustice {
  identifier: string;
  name: string;
  last_name: string;
  roles: Array<{
    role_title: string;
    appointing_president: string;
    institution_name: string;
    date_start: number;
    date_end: number;
  }>;
  date_of_birth: number;
  place_of_birth: string;
  gender: string;
  thumbnail: { href: string } | null;
  length_of_service: number;
}

interface OyezJusticeDetail extends OyezJustice {
  biography: string;
  law_school: string;
  home_state: string;
}

// CourtListener types
interface CLGift {
  source: string;
  description: string;
  value: string;
  redacted: boolean;
}

interface CLReimbursement {
  source: string;
  location: string;
  purpose: string;
  items_paid_or_provided: string;
  redacted: boolean;
}

interface CLDisclosure {
  id: number;
  person: string;
  year: number;
  filepath: string;
  is_amended: boolean;
}

interface CLPaginatedResponse<T> {
  count: number;
  next: string | null;
  results: T[];
}

// ─────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────

async function fetchOyez<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.oyez.org${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function courtListenerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.COURTLISTENER_API_TOKEN?.trim();
  if (token) headers["Authorization"] = `Token ${token}`;
  return headers;
}

async function fetchCL<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(
      `https://www.courtlistener.com/api/rest/v4${path}`,
      { headers: courtListenerHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Phase 1: Incremental justice sync
// ─────────────────────────────────────────────

async function syncJustices(): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const justices = await fetchOyez<OyezJustice[]>("/justices");
  if (!justices) return { synced: 0, skipped: 0, errors: 1 };

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - JUSTICE_REFRESH_DAYS);

  for (const j of justices) {
    try {
      // Check if we already have this justice and it's fresh
      const existing = await prisma.justice.findUnique({
        where: { oyezIdentifier: j.identifier },
        select: { id: true, updatedAt: true },
      });

      if (existing && existing.updatedAt > staleThreshold) {
        skipped++;
        continue; // Recently synced — skip
      }

      await sleep(DELAY_MS);
      const detail = await fetchOyez<OyezJusticeDetail>(
        `/people/${j.identifier}`
      );

      const scotusRole = j.roles?.find(
        (r) => r.institution_name === "Supreme Court of the United States"
      );

      await prisma.justice.upsert({
        where: { oyezIdentifier: j.identifier },
        create: {
          oyezIdentifier: j.identifier,
          name: j.name,
          firstName: j.name.split(" ")[0],
          lastName: j.last_name,
          dateOfBirth: j.date_of_birth
            ? new Date(j.date_of_birth * 1000)
            : null,
          placeOfBirth: j.place_of_birth ?? null,
          gender: j.gender ?? null,
          photoUrl: j.thumbnail?.href ?? null,
          biography: detail?.biography ?? null,
          lawSchool: detail?.law_school ?? null,
          appointingPresident: scotusRole?.appointing_president ?? null,
          roleTitle: scotusRole?.role_title ?? null,
          dateStart: scotusRole?.date_start
            ? new Date(scotusRole.date_start * 1000)
            : null,
          dateEnd:
            scotusRole?.date_end && scotusRole.date_end > 0
              ? new Date(scotusRole.date_end * 1000)
              : null,
          isActive: !scotusRole?.date_end || scotusRole.date_end <= 0,
        },
        update: {
          name: j.name,
          photoUrl: j.thumbnail?.href ?? null,
          biography: detail?.biography ?? null,
          lawSchool: detail?.law_school ?? null,
          appointingPresident: scotusRole?.appointing_president ?? null,
          roleTitle: scotusRole?.role_title ?? null,
          isActive: !scotusRole?.date_end || scotusRole.date_end <= 0,
        },
      });
      synced++;
    } catch (err) {
      console.error(
        `[sync-scotus] Error syncing justice ${j.identifier}:`,
        err
      );
      errors++;
    }
  }

  return { synced, skipped, errors };
}

// ─────────────────────────────────────────────
// Phase 2: Incremental case sync
// Compares Oyez case count with our DB count per term.
// Only fetches case details for cases we don't already have.
// ─────────────────────────────────────────────

async function syncCasesForTerm(
  term: number
): Promise<{ synced: number; skipped: number; errors: number }> {
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const cases = await fetchOyez<OyezCaseListItem[]>(
    `/cases?filter=term:${term}&per_page=100`
  );
  if (!cases || !Array.isArray(cases)) return { synced: 0, skipped: 0, errors: 0 };

  // Get existing case IDs for this term
  const existingCases = await prisma.courtCase.findMany({
    where: { term },
    select: { oyezId: true, status: true, conclusion: true },
  });
  const existingMap = new Map(
    existingCases.map((c) => [c.oyezId, c])
  );

  for (const c of cases) {
    const oyezId = `${term}/${c.docket_number}`;
    const existing = existingMap.get(oyezId);

    // Skip if we already have a fully decided case with a conclusion
    if (existing?.status === "DECIDED" && existing.conclusion) {
      skipped++;
      continue;
    }

    try {
      await sleep(DELAY_MS);
      const detail = await fetchOyez<OyezCaseDetail>(
        `/cases/${term}/${c.docket_number}`
      );
      if (!detail) {
        errors++;
        continue;
      }

      const arguedEvent = detail.timeline?.find((t) => t.event === "Argued");
      const decidedEvent = detail.timeline?.find((t) => t.event === "Decided");
      const arguedDate = arguedEvent?.dates?.[0]?.date
        ? new Date(arguedEvent.dates[0].date * 1000)
        : null;
      const decidedDate = decidedEvent?.dates?.[0]?.date
        ? new Date(decidedEvent.dates[0].date * 1000)
        : null;

      const decision = detail.decisions?.[0];
      let status: "GRANTED" | "ARGUED" | "DECIDED" = "GRANTED";
      if (decidedDate) status = "DECIDED";
      else if (arguedDate) status = "ARGUED";

      const courtCase = await prisma.courtCase.upsert({
        where: { oyezId },
        create: {
          oyezId,
          name: detail.name,
          docketNumber: detail.docket_number,
          term,
          dateArgued: arguedDate,
          dateDecided: decidedDate,
          question: detail.question ?? null,
          factsOfTheCase: detail.facts_of_the_case ?? null,
          conclusion: detail.conclusion ?? null,
          decisionDirection: null,
          majorityVotes: decision?.majority_vote ?? null,
          minorityVotes: decision?.minority_vote ?? null,
          justiaUrl: detail.justia_url ?? null,
          status,
        },
        update: {
          name: detail.name,
          dateArgued: arguedDate,
          dateDecided: decidedDate,
          question: detail.question ?? null,
          factsOfTheCase: detail.facts_of_the_case ?? null,
          conclusion: detail.conclusion ?? null,
          majorityVotes: decision?.majority_vote ?? null,
          minorityVotes: decision?.minority_vote ?? null,
          justiaUrl: detail.justia_url ?? null,
          status,
        },
      });

      // Sync per-justice votes
      if (decision?.votes) {
        for (const vote of decision.votes) {
          const justice = await prisma.justice.findUnique({
            where: { oyezIdentifier: vote.member.identifier },
          });
          if (!justice) continue;

          await prisma.caseVote.upsert({
            where: {
              caseId_justiceId: {
                caseId: courtCase.id,
                justiceId: justice.id,
              },
            },
            create: {
              caseId: courtCase.id,
              justiceId: justice.id,
              voteType: vote.vote ?? "unknown",
              opinionType: vote.opinion_type ?? null,
              ideologyScore: vote.ideology ?? null,
            },
            update: {
              voteType: vote.vote ?? "unknown",
              opinionType: vote.opinion_type ?? null,
              ideologyScore: vote.ideology ?? null,
            },
          });
        }
      }

      synced++;
    } catch (err) {
      console.error(
        `[sync-scotus] Error syncing case ${c.docket_number}:`,
        err
      );
      errors++;
    }
  }

  return { synced, skipped, errors };
}

// ─────────────────────────────────────────────
// Phase 3: Incremental financial disclosure sync
// Checks if the number of disclosures has changed before re-fetching
// gifts and reimbursements.
// ─────────────────────────────────────────────

async function syncFinancialDisclosures(): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const justices = await prisma.justice.findMany({
    where: { isActive: true },
    select: {
      id: true,
      courtListenerId: true,
      lastName: true,
      _count: {
        select: {
          financialDisclosures: true,
          gifts: true,
          reimbursements: true,
        },
      },
    },
  });

  for (const justice of justices) {
    if (!justice.courtListenerId) continue;

    try {
      await sleep(DELAY_MS);

      // Check disclosure count from CourtListener
      const disclosures = await fetchCL<CLPaginatedResponse<CLDisclosure>>(
        `/financial-disclosures/?person=${justice.courtListenerId}&order_by=-year`
      );

      if (!disclosures?.results) continue;

      // Compare remote count vs local count — skip if unchanged
      const remoteDisclosureCount = disclosures.count;
      const localDisclosureCount = justice._count.financialDisclosures;

      if (remoteDisclosureCount === localDisclosureCount) {
        // Also quick-check gifts count
        const giftsCheck = await fetchCL<CLPaginatedResponse<CLGift>>(
          `/gifts/?financial_disclosure__person=${justice.courtListenerId}`
        );
        if (giftsCheck && giftsCheck.count === justice._count.gifts) {
          skipped++;
          continue; // No new disclosures or gifts
        }
      }

      // New disclosures found — sync everything for this justice
      console.log(
        `[sync-scotus] New disclosures for ${justice.lastName}, syncing...`
      );

      // Upsert disclosures
      for (const d of disclosures.results.slice(0, 5)) {
        await prisma.justiceFinancialDisclosure.upsert({
          where: {
            justiceId_year_isAmended: {
              justiceId: justice.id,
              year: d.year,
              isAmended: d.is_amended,
            },
          },
          create: {
            justiceId: justice.id,
            year: d.year,
            pdfUrl: d.filepath ?? null,
            isAmended: d.is_amended,
          },
          update: { pdfUrl: d.filepath ?? null },
        });
      }

      // Clear and re-sync gifts (idempotent)
      await prisma.justiceGift.deleteMany({
        where: { justiceId: justice.id },
      });
      await sleep(DELAY_MS);
      const gifts = await fetchCL<CLPaginatedResponse<CLGift>>(
        `/gifts/?financial_disclosure__person=${justice.courtListenerId}`
      );
      if (gifts?.results) {
        for (const g of gifts.results) {
          await prisma.justiceGift.create({
            data: {
              justiceId: justice.id,
              source: g.source,
              description: g.description,
              value: g.value || null,
              year: new Date().getFullYear(),
              isRedacted: g.redacted,
            },
          });
        }
      }

      // Clear and re-sync reimbursements
      await prisma.justiceReimbursement.deleteMany({
        where: { justiceId: justice.id },
      });
      await sleep(DELAY_MS);
      const reimbs = await fetchCL<CLPaginatedResponse<CLReimbursement>>(
        `/reimbursements/?financial_disclosure__person=${justice.courtListenerId}`
      );
      if (reimbs?.results) {
        for (const r of reimbs.results) {
          await prisma.justiceReimbursement.create({
            data: {
              justiceId: justice.id,
              source: r.source,
              location: r.location || null,
              purpose: r.purpose || null,
              itemsPaid: r.items_paid_or_provided || null,
              year: new Date().getFullYear(),
              isRedacted: r.redacted,
            },
          });
        }
      }

      synced++;
    } catch (err) {
      console.error(
        `[sync-scotus] Error syncing disclosures for ${justice.lastName}:`,
        err
      );
      errors++;
    }
  }

  return { synced, skipped, errors };
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export const GET = withCronErrorHandler(async (request: Request) => {
  // Defense-in-depth: verify auth even though middleware should catch it
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Allow ?force=true to bypass the schedule gate (auth already verified above)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    if (!force) {
      const ready = await shouldRunNow();
      if (!ready) {
        const interval = getSyncIntervalHours();
        console.log(
          `[sync-scotus] Skipped — next sync in <${interval}h (current schedule)`
        );
        return Response.json({
          success: true,
          skipped: true,
          reason: `Schedule gate: syncing every ${interval}h in the current SCOTUS calendar period`,
        });
      }
    }

    console.log("[sync-scotus] Starting incremental SCOTUS sync...");

    // Phase 1: Justices (skip if recently synced)
    const justiceResult = await syncJustices();
    console.log(
      `[sync-scotus] Justices: ${justiceResult.synced} updated, ${justiceResult.skipped} skipped, ${justiceResult.errors} errors`
    );

    // Phase 2: Cases (skip fully decided cases, only fetch new/pending)
    let totalCases = 0;
    let totalSkipped = 0;
    let totalCaseErrors = 0;
    for (const term of TERMS_TO_SYNC) {
      const r = await syncCasesForTerm(term);
      totalCases += r.synced;
      totalSkipped += r.skipped;
      totalCaseErrors += r.errors;
      console.log(
        `[sync-scotus] Term ${term}: ${r.synced} updated, ${r.skipped} skipped, ${r.errors} errors`
      );
    }

    // Phase 3: Financial disclosures (skip justices with no new disclosures)
    const disclosureResult = await syncFinancialDisclosures();
    console.log(
      `[sync-scotus] Disclosures: ${disclosureResult.synced} updated, ${disclosureResult.skipped} skipped, ${disclosureResult.errors} errors`
    );

    await logSync({
      syncType: "scotus",
      status:
        totalCaseErrors > 0 || disclosureResult.errors > 0 ? "partial" : "success",
      recordsTotal: totalCases + justiceResult.synced,
      recordsSynced: totalCases + justiceResult.synced,
      recordsFailed: totalCaseErrors + disclosureResult.errors,
      durationMs: Date.now() - startTime,
      metadata: { justices: justiceResult, disclosures: disclosureResult },
    });

    return Response.json({
      success: true,
      justices: justiceResult,
      cases: {
        synced: totalCases,
        skipped: totalSkipped,
        errors: totalCaseErrors,
      },
      disclosures: disclosureResult,
    });
  } catch (error) {
    console.error("[sync-scotus] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/cron/sync-scotus", jobName: "sync-scotus" });
