// ─────────────────────────────────────────────
// GET /api/cron/sync-votes
// Cron Job — sync roll-call vote records from Congress.gov API v3
// Uses the House Clerk XML for individual member votes (the JSON API
// only provides party totals, not per-member data).
// Schedule: daily (configure in vercel.json)
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { VoteChoice } from "@prisma/client";

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const CURRENT_CONGRESS = 119;
const VOTES_TO_FETCH = 20;
const DELAY_MS = 500;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface HouseVoteListItem {
  rollCallNumber: number;
  legislationType: string;
  legislationNumber: string;
  startDate: string;
  result: string;
  sourceDataURL: string; // XML URL with individual member votes
  url: string;
}

interface HouseVoteListResponse {
  houseRollCallVotes: HouseVoteListItem[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapVotePosition(position: string): VoteChoice {
  const normalized = position.trim().toLowerCase();
  if (normalized === "yea" || normalized === "aye") return VoteChoice.YES;
  if (normalized === "nay" || normalized === "no") return VoteChoice.NO;
  if (normalized === "not voting") return VoteChoice.NOT_VOTING;
  if (normalized === "present") return VoteChoice.ABSTAIN;
  return VoteChoice.NOT_VOTING;
}

function buildExternalId(type: string, number: string): string {
  // Convert "HR" → "hr", "S" → "s", "HRES" → "hres", etc.
  return `${CURRENT_CONGRESS}-${type.toLowerCase()}-${number}`;
}

// ─────────────────────────────────────────────
// Lookup maps
// ─────────────────────────────────────────────

type CandidateMap = Map<string, number>;
type BillMap = Map<string, number>;

async function buildCandidateMap(): Promise<CandidateMap> {
  const candidates = await prisma.candidate.findMany({
    where: {
      contactInfo: {
        path: ["bioguideId"],
        not: { equals: "" },
      },
    },
    select: { id: true, contactInfo: true },
  });

  const map: CandidateMap = new Map();
  for (const c of candidates) {
    const info = c.contactInfo as Record<string, unknown> | null;
    const bioguideId = info?.bioguideId;
    if (typeof bioguideId === "string" && bioguideId) {
      map.set(bioguideId, c.id);
    }
  }
  return map;
}

async function buildBillMap(): Promise<BillMap> {
  const bills = await prisma.bill.findMany({
    select: { id: true, externalId: true },
  });
  const map: BillMap = new Map();
  for (const b of bills) {
    map.set(b.externalId, b.id);
  }
  return map;
}

// ─────────────────────────────────────────────
// Fetch vote list from Congress.gov JSON API
// ─────────────────────────────────────────────

async function fetchHouseVoteList(): Promise<HouseVoteListItem[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY!;
  const url = `${CONGRESS_API_BASE}/house-vote/${CURRENT_CONGRESS}?api_key=${apiKey}&format=json&limit=${VOTES_TO_FETCH}`;
  console.log(`[sync-votes] Fetching house vote list...`);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new ExternalAPIError("Unable to fetch vote data. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }
  const data = (await res.json()) as HouseVoteListResponse;
  return data.houseRollCallVotes ?? [];
}

// ─────────────────────────────────────────────
// Parse individual member votes from House Clerk XML
// ─────────────────────────────────────────────

interface MemberVote {
  bioguideId: string;
  vote: string;
}

const ALLOWED_XML_HOSTS = ["clerk.house.gov", "www.clerk.house.gov"];

function isAllowedXmlUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_XML_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function fetchMemberVotesFromXml(xmlUrl: string): Promise<MemberVote[]> {
  if (!isAllowedXmlUrl(xmlUrl)) {
    console.warn(`[sync-votes] Blocked fetch to untrusted host: ${xmlUrl}`);
    return [];
  }
  const res = await fetch(xmlUrl, { cache: "no-store" });
  if (!res.ok) return [];

  const xml = await res.text();
  const votes: MemberVote[] = [];

  // Parse <recorded-vote> elements using regex (no XML parser needed for this simple structure)
  // Format: <recorded-vote><legislator name-id="A000370" ...>Name</legislator><vote>Yea</vote></recorded-vote>
  const pattern = /name-id="([A-Z]\d+)"[^>]*>[^<]*<\/legislator><vote>([^<]+)<\/vote>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    votes.push({ bioguideId: match[1], vote: match[2] });
  }

  return votes;
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

import { verifyCronSecret } from "@/lib/auth";
import { withCronErrorHandler, ValidationError, NotFoundError, ExternalAPIError } from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

export const GET = withCronErrorHandler(async (request: Request) => {
  if (!verifyCronSecret(request)) {
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
  console.log(`[sync-votes] Starting vote sync (congress: ${CURRENT_CONGRESS})...`);

  try {
    // 1. Build lookup maps
    const [billMap, candidateMap] = await Promise.all([
      buildBillMap(),
      buildCandidateMap(),
    ]);
    console.log(
      `[sync-votes] Loaded ${billMap.size} bills and ${candidateMap.size} candidates`
    );

    // 2. Fetch recent House votes
    const houseVotes = await fetchHouseVoteList();
    console.log(`[sync-votes] Got ${houseVotes.length} house votes`);

    let totalUpserted = 0;
    let totalSkippedNoBill = 0;
    let totalSkippedNoMember = 0;
    let totalErrors = 0;
    let rollCallsProcessed = 0;

    // 3. Process each vote
    for (let i = 0; i < houseVotes.length; i++) {
      const vote = houseVotes[i];

      // Skip votes not tied to legislation we track
      if (!vote.legislationType || !vote.legislationNumber) {
        totalSkippedNoBill++;
        continue;
      }

      const externalId = buildExternalId(vote.legislationType, vote.legislationNumber);
      const billId = billMap.get(externalId);
      if (!billId) {
        totalSkippedNoBill++;
        continue;
      }

      // Fetch individual member votes from XML
      const memberVotes = await fetchMemberVotesFromXml(vote.sourceDataURL);
      if (memberVotes.length === 0) {
        continue;
      }

      const voteDate = new Date(vote.startDate);

      for (const mv of memberVotes) {
        const candidateId = candidateMap.get(mv.bioguideId);
        if (!candidateId) {
          totalSkippedNoMember++;
          continue;
        }

        try {
          await prisma.billVote.upsert({
            where: { billId_candidateId: { billId, candidateId } },
            create: { billId, candidateId, vote: mapVotePosition(mv.vote), voteDate },
            update: { vote: mapVotePosition(mv.vote), voteDate },
          });
          totalUpserted++;
        } catch {
          totalErrors++;
        }
      }

      rollCallsProcessed++;

      if (i < houseVotes.length - 1) {
        await delay(DELAY_MS);
      }

      if ((i + 1) % 5 === 0) {
        console.log(`[sync-votes] Progress: ${i + 1}/${houseVotes.length} roll calls`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[sync-votes] Done in ${elapsed}s — upserted: ${totalUpserted}`);

    await logSync({
      syncType: "votes",
      status: totalErrors > 0 ? "partial" : "success",
      recordsTotal: houseVotes.length,
      recordsSynced: totalUpserted,
      recordsFailed: totalErrors,
      durationMs: Date.now() - startTime,
      metadata: { rollCallsProcessed, skippedNoBill: totalSkippedNoBill, skippedNoMember: totalSkippedNoMember },
    });

    return Response.json({
      synced: totalUpserted,
      rollCallsProcessed,
      totalRollCalls: houseVotes.length,
      skippedNoBill: totalSkippedNoBill,
      skippedNoMember: totalSkippedNoMember,
      errors: totalErrors,
      elapsedSeconds: parseFloat(elapsed),
      message: `Synced ${totalUpserted} member votes from ${rollCallsProcessed} roll calls`,
    });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[sync-votes] Fatal error:`, error);
    return Response.json(
      {
        error: "Sync failed",
        detail: "Check server logs for details",
        elapsedSeconds: parseFloat(elapsed),
      },
      { status: 500 }
    );
  }
}, { route: "GET /api/cron/sync-votes", jobName: "sync-votes" });
