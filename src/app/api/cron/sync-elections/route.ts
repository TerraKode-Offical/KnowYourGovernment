// ─────────────────────────────────────────────
// GET /api/cron/sync-elections
// Cron Job — sync upcoming election dates from Google Civic Information API
// Schedule: weekly (configure in vercel.json)
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";

interface GoogleElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

interface GoogleElectionsResponse {
  kind: string;
  elections: GoogleElection[];
}

/**
 * Parse the state abbreviation from an OCD division ID.
 * e.g. "ocd-division/country:us/state:ca" → "CA"
 * Returns null if no state segment is found.
 */
function parseStateFromOcdId(ocdDivisionId: string): string | null {
  const match = ocdDivisionId.match(/state:([a-z]{2})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Infer the election type from the election name.
 * Maps to the ElectionType enum: PRIMARY, GENERAL, SPECIAL, RUNOFF
 */
function inferElectionType(name: string): "PRIMARY" | "GENERAL" | "SPECIAL" | "RUNOFF" {
  const lower = name.toLowerCase();
  if (lower.includes("primary")) return "PRIMARY";
  if (lower.includes("runoff")) return "RUNOFF";
  if (lower.includes("special")) return "SPECIAL";
  // "General" or anything else (including default) maps to GENERAL
  return "GENERAL";
}

import { verifyCronSecret } from "@/lib/auth";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

export const GET = withCronErrorHandler(async (request: Request) => {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GOOGLE_CIVIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Fetch elections from Google Civic Information API
    const response = await fetch(
      `https://www.googleapis.com/civicinfo/v2/elections?key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[cron/sync-elections] Google API error:", errorText);
      return Response.json(
        { error: "Failed to fetch elections from Google Civic API" },
        { status: 502 }
      );
    }

    const data: GoogleElectionsResponse = await response.json();
    const elections = data.elections ?? [];

    // Pre-fetch all states for lookup
    const states = await prisma.state.findMany({
      select: { id: true, abbreviation: true },
    });
    const stateByAbbreviation = new Map(
      states.map((s) => [s.abbreviation.toUpperCase(), s.id])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const election of elections) {
      // Skip the "VIP Test Election" that Google always returns with id "2000"
      if (election.id === "2000") {
        skipped++;
        continue;
      }

      const electionDate = new Date(election.electionDay);
      if (isNaN(electionDate.getTime())) {
        console.warn(
          `[cron/sync-elections] Skipping election with invalid date: ${election.name} (${election.electionDay})`
        );
        skipped++;
        continue;
      }

      // Resolve state
      const stateAbbr = parseStateFromOcdId(election.ocdDivisionId);
      const stateId = stateAbbr ? stateByAbbreviation.get(stateAbbr) ?? null : null;

      // Infer election type
      const electionType = inferElectionType(election.name);

      // Build a description that includes the Google election ID for deduplication
      const description = `Google Civic ID: ${election.id} | OCD: ${election.ocdDivisionId}`;

      // Check for an existing election by matching on name + date (the combination
      // should be unique for a given Google election).
      const existing = await prisma.election.findFirst({
        where: {
          name: election.name,
          date: electionDate,
        },
      });

      if (existing) {
        // Update in case anything changed
        await prisma.election.update({
          where: { id: existing.id },
          data: {
            electionType,
            stateId,
            description,
          },
        });
        updated++;
      } else {
        await prisma.election.create({
          data: {
            name: election.name,
            date: electionDate,
            electionType,
            stateId,
            description,
          },
        });
        created++;
      }
    }

    console.log(
      `[cron/sync-elections] Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`
    );

    await logSync({
      syncType: "elections",
      status: "success",
      recordsTotal: elections.length,
      recordsSynced: created + updated,
      recordsFailed: 0,
      durationMs: Date.now() - startTime,
      metadata: { created, updated, skipped },
    });

    return Response.json({
      synced: created + updated,
      created,
      updated,
      skipped,
      total: elections.length,
      message: "Elections sync completed successfully",
    });
  } catch (error) {
    console.error("[cron/sync-elections] Error:", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}, { route: "GET /api/cron/sync-elections", jobName: "sync-elections" });
