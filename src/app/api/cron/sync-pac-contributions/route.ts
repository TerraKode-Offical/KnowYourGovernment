import { verifyCronSecret } from "@/lib/auth";

// ─────────────────────────────────────────────
// GET /api/cron/sync-pac-contributions
// Syncs PAC-to-candidate contributions from FEC Schedule A.
// Processes all PAC contributions received by each federal candidate's
// principal campaign committee.
//
// Schedule: weekly (Wednesdays — after campaign-finance sync on Mondays)
// Accepts ?manual=true for dev, ?limit=N to override candidate count.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { OfficeType } from "@prisma/client";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

// Long-running: fetches FEC data for up to 100 candidates with 500ms delays
// and 3-4 API calls each. Raise the function timeout from the default 10s.
export const maxDuration = 300;
import {
  buildFecUrl,
  fecFetch,
  delay,
  fetchCommitteeDetails,
  fetchAllPacContributionsToCommittee,
  fecCommitteeUrl,
  CURRENT_CYCLE,
} from "@/lib/fec";

const DEFAULT_CANDIDATES_PER_RUN = 120;

// ─────────────────────────────────────────────
// Types for FEC committee lookup
// ─────────────────────────────────────────────

interface FecCommitteeResult {
  committee_id: string;
  designation: string;
  name: string;
}

interface FecCommitteeResponse {
  results: FecCommitteeResult[];
  pagination: { count: number; pages: number; per_page: number; page: number };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Fetch the principal campaign committee ID for a candidate */
async function fetchPrincipalCommitteeId(
  fecCandidateId: string,
  cycle: number
): Promise<string | null> {
  try {
    const url = buildFecUrl(`/candidate/${fecCandidateId}/committees/`, {
      cycle: String(cycle),
      designation: "P",
    });
    const data = await fecFetch<FecCommitteeResponse>(url);
    const principal = data.results?.find((r) => r.designation === "P");
    return principal?.committee_id ?? data.results?.[0]?.committee_id ?? null;
  } catch {
    return null;
  }
}

/** Upsert a Committee record from FEC data */
async function upsertCommittee(fecCommitteeId: string): Promise<number> {
  // Check if already exists
  const existing = await prisma.committee.findUnique({
    where: { fecCommitteeId },
    select: { id: true, lastSyncedAt: true },
  });

  // Only re-fetch details if record is older than 30 days or doesn't exist
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (existing && existing.lastSyncedAt > thirtyDaysAgo) {
    return existing.id;
  }

  const details = await fetchCommitteeDetails(fecCommitteeId);

  if (existing) {
    await prisma.committee.update({
      where: { id: existing.id },
      data: {
        name: details?.name ?? fecCommitteeId,
        treasurerName: details?.treasurer_name,
        committeeType: details?.committee_type,
        designation: details?.designation,
        party: details?.party,
        connectedOrg: details?.connected_organization_name,
        fecUrl: fecCommitteeUrl(fecCommitteeId),
        lastSyncedAt: new Date(),
      },
    });
    return existing.id;
  }

  const created = await prisma.committee.create({
    data: {
      fecCommitteeId,
      name: details?.name ?? fecCommitteeId,
      treasurerName: details?.treasurer_name,
      committeeType: details?.committee_type,
      designation: details?.designation,
      party: details?.party,
      connectedOrg: details?.connected_organization_name,
      fecUrl: fecCommitteeUrl(fecCommitteeId),
    },
  });
  return created.id;
}

// ─────────────────────────────────────────────
// Sync PAC contributions for a single candidate
// ─────────────────────────────────────────────

interface DbCandidate {
  id: number;
  name: string;
  fecCandidateId: string | null;
  officeType: OfficeType;
  contactInfo: unknown;
  state: { abbreviation: string } | null;
  finance: { fecCandidateId: string | null }[];
}

async function syncCandidatePacContributions(
  candidate: DbCandidate,
  cycle: number
): Promise<{ synced: number; committees: number }> {
  // Resolve FEC candidate ID
  const fecId =
    candidate.fecCandidateId ??
    candidate.finance?.[0]?.fecCandidateId ??
    null;

  if (!fecId) {
    return { synced: 0, committees: 0 };
  }

  // Get the principal campaign committee
  const principalCommitteeId = await fetchPrincipalCommitteeId(fecId, cycle);
  if (!principalCommitteeId) {
    return { synced: 0, committees: 0 };
  }

  await delay(500);

  // Fetch all PAC contributions to this candidate's committee
  const contributions = await fetchAllPacContributionsToCommittee(
    principalCommitteeId,
    cycle
  );

  let synced = 0;
  const committeeIds = new Set<string>();

  for (const contrib of contributions) {
    if (!contrib.contributor_name || !contrib.contribution_receipt_amount) continue;

    // The contributor committee ID — skip if not a committee contribution
    const contributorCommId =
      (contrib as unknown as Record<string, unknown>).contributor_committee_id as string | undefined ??
      contrib.committee_id;
    if (!contributorCommId || contributorCommId === principalCommitteeId) continue;

    try {
      // Upsert the contributing committee
      const committeeDbId = await upsertCommittee(contributorCommId);
      committeeIds.add(contributorCommId);

      // Parse contribution date
      const contribDate = contrib.contribution_receipt_date
        ? new Date(contrib.contribution_receipt_date)
        : null;

      // Upsert PacContribution using fecTransactionId for dedup
      const transactionId = contrib.sub_id ?? null;

      if (transactionId) {
        await prisma.pacContribution.upsert({
          where: { fecTransactionId: transactionId },
          create: {
            candidateId: candidate.id,
            committeeId: committeeDbId,
            fecTransactionId: transactionId,
            amount: contrib.contribution_receipt_amount,
            contributionDate: contribDate,
            cycle,
            fecFilingUrl: contrib.pdf_url ?? null,
          },
          update: {
            amount: contrib.contribution_receipt_amount,
            contributionDate: contribDate,
            fecFilingUrl: contrib.pdf_url ?? null,
          },
        });
      } else {
        // No transaction ID — create only if no similar record exists
        const existing = await prisma.pacContribution.findFirst({
          where: {
            candidateId: candidate.id,
            committeeId: committeeDbId,
            amount: contrib.contribution_receipt_amount,
            cycle,
          },
          select: { id: true },
        });

        if (!existing) {
          await prisma.pacContribution.create({
            data: {
              candidateId: candidate.id,
              committeeId: committeeDbId,
              amount: contrib.contribution_receipt_amount,
              contributionDate: contribDate,
              cycle,
              fecFilingUrl: contrib.pdf_url ?? null,
            },
          });
        }
      }

      synced++;
    } catch (err) {
      console.warn(
        `[sync-pac] Error processing contribution from ${contributorCommId} to ${candidate.name}:`,
        err
      );
    }
  }

  // Also update the candidate's fecCandidateId if not already set
  if (!candidate.fecCandidateId && fecId) {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { fecCandidateId: fecId },
    });
  }

  return { synced, committees: committeeIds.size };
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export const GET = withCronErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get("manual") === "true";

  if (isManual) {
    if (process.env.NODE_ENV !== "development") {
      return Response.json(
        { error: "Manual trigger is only allowed in development" },
        { status: 403 }
      );
    }
  } else if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FEC_API_KEY) {
    return Response.json(
      { error: "FEC_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  const limitParam = searchParams.get("limit");
  const limitParsed = limitParam ? parseInt(limitParam, 10) : NaN;
  const candidatesPerRun = !isNaN(limitParsed)
    ? Math.min(Math.max(1, limitParsed), 200)
    : DEFAULT_CANDIDATES_PER_RUN;

  const startTime = Date.now();
  console.log(
    `[sync-pac] Starting PAC contributions sync (cycle: ${CURRENT_CYCLE}, max: ${candidatesPerRun})...`
  );

  try {
    // Stale-first ordering: candidates we've never processed for PAC
    // contributions come first (NULLs first), then oldest-updated. This is
    // the same pattern used by sync-campaign-finance — every weekly run
    // advances through the full 535-member list instead of reprocessing
    // the same first 30 each time.
    type CandRow = {
      id: number;
      name: string;
      fecCandidateId: string | null;
      officeType: OfficeType;
      contactInfo: unknown;
      stateAbbr: string | null;
      financeFecId: string | null;
    };
    const rows = await prisma.$queryRaw<CandRow[]>`
      SELECT c.id,
             c.name,
             c."fecCandidateId",
             c."officeType",
             c."contactInfo",
             s.abbreviation AS "stateAbbr",
             (SELECT f."fecCandidateId" FROM "CandidateFinance" f
                WHERE f."candidateId"=c.id AND f.cycle=${CURRENT_CYCLE}
                LIMIT 1) AS "financeFecId"
      FROM "Candidate" c
      LEFT JOIN "State" s ON s.id = c."stateId"
      WHERE c."officeType" IN ('US_SENATOR', 'US_REPRESENTATIVE')
        AND c."contactInfo" ? 'bioguideId'
      ORDER BY
        -- Priority 1: candidates with a resolvable FEC ID (we can actually
        -- fetch PAC contributions for them). Skip the ones without first
        -- so a small limit doesn't waste the whole batch on no-ops.
        CASE
          WHEN c."fecCandidateId" IS NOT NULL THEN 0
          WHEN (SELECT f."fecCandidateId" FROM "CandidateFinance" f
                  WHERE f."candidateId" = c.id AND f.cycle = ${CURRENT_CYCLE}
                  LIMIT 1) IS NOT NULL THEN 0
          ELSE 1
        END ASC,
        -- Priority 2: stale-first — never-processed candidates come first,
        -- then those with the oldest PAC contribution data.
        (SELECT MAX(pc."contributionDate") FROM "PacContribution" pc
           WHERE pc."candidateId" = c.id AND pc.cycle = ${CURRENT_CYCLE}
        ) ASC NULLS FIRST,
        c.id ASC
      LIMIT ${candidatesPerRun}
    `;

    const filtered = rows.map(r => ({
      id: r.id,
      name: r.name,
      fecCandidateId: r.fecCandidateId,
      officeType: r.officeType,
      contactInfo: r.contactInfo,
      state: { abbreviation: r.stateAbbr ?? '' },
      finance: r.financeFecId ? [{ fecCandidateId: r.financeFecId }] : [],
    })).filter((c) => {
      const info = c.contactInfo as Record<string, unknown> | null;
      return info && typeof info === "object" && "bioguideId" in info;
    });

    let totalSynced = 0;
    let totalCommittees = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < filtered.length; i++) {
      const candidate = filtered[i];

      try {
        const result = await syncCandidatePacContributions(candidate, CURRENT_CYCLE);

        if (result.synced === 0) {
          skipped++;
        } else {
          totalSynced += result.synced;
          totalCommittees += result.committees;
        }
      } catch (err) {
        errors++;
        console.error(
          `[sync-pac] Error for "${candidate.name}" (id=${candidate.id}):`,
          err
        );
      }

      if ((i + 1) % 10 === 0 || i + 1 === filtered.length) {
        console.log(
          `[sync-pac] Progress: ${i + 1}/${filtered.length} — contributions: ${totalSynced}, committees: ${totalCommittees}, errors: ${errors}`
        );
      }

      await delay(500);
    }

    const durationMs = Date.now() - startTime;

    // Log to DataSyncLog
    await prisma.dataSyncLog.create({
      data: {
        syncType: "pac-contributions",
        status: errors === 0 ? "success" : "partial",
        recordsTotal: filtered.length,
        recordsSynced: totalSynced,
        recordsFailed: errors,
        durationMs,
        metadata: {
          cycle: CURRENT_CYCLE,
          committees: totalCommittees,
          skipped,
        },
      },
    });

    const elapsed = (durationMs / 1000).toFixed(1);
    console.log(
      `[sync-pac] Complete in ${elapsed}s — contributions: ${totalSynced}, committees: ${totalCommittees}, skipped: ${skipped}, errors: ${errors}`
    );

    return Response.json({
      contributions: totalSynced,
      committees: totalCommittees,
      candidates: filtered.length,
      skipped,
      errors,
      cycle: CURRENT_CYCLE,
      elapsedSeconds: parseFloat(elapsed),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[sync-pac] Fatal error:`, error);

    await prisma.dataSyncLog.create({
      data: {
        syncType: "pac-contributions",
        status: "failed",
        durationMs,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return Response.json(
      { error: "Sync failed. Check server logs." },
      { status: 500 }
    );
  }
}, { route: "GET /api/cron/sync-pac-contributions", jobName: "sync-pac-contributions" });
