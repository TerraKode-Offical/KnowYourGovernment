// ─────────────────────────────────────────────
// GET /api/pac-recipients
// Query PAC contributions grouped by recipient candidate.
// Supports filtering by committee IDs, chamber, party, state, cycle.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { OfficeType, Prisma } from "@prisma/client";
import { CURRENT_CYCLE } from "@/lib/fec";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

const VALID_SORT = new Set(["amount", "name", "state"]);
const VALID_DIR = new Set(["asc", "desc"]);

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);

  // Parse params
  const committeeIdsParam = searchParams.get("committeeIds");
  const chamber = searchParams.get("chamber"); // "senate" | "house"
  const party = searchParams.get("party");
  const stateAbbr = searchParams.get("stateAbbr")?.toUpperCase();
  const cycleParam = searchParams.get("cycle");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const sortBy = searchParams.get("sortBy") ?? "amount";
  const sortDir = searchParams.get("sortDir") ?? "desc";

  let fecCommitteeIds: string[] = [];
  if (committeeIdsParam) {
    fecCommitteeIds = committeeIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (fecCommitteeIds.length > 50) {
      throw new ValidationError("Too many committee IDs. Maximum is 50.");
    }
  }

  // If no committeeIds provided, discover all committees (capped at 50 for performance)
  const discoverMode = fecCommitteeIds.length === 0;
  const cycleRaw = cycleParam ? parseInt(cycleParam, 10) : CURRENT_CYCLE;
  const cycle = isNaN(cycleRaw) ? CURRENT_CYCLE : cycleRaw;
  const pageRaw = parseInt(pageParam ?? "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limitRaw = parseInt(limitParam ?? "50", 10);
  const limit = isNaN(limitRaw) ? 50 : Math.min(100, Math.max(1, limitRaw));
  const offset = (page - 1) * limit;
  const validSort = VALID_SORT.has(sortBy) ? sortBy : "amount";
  const validDir = VALID_DIR.has(sortDir) ? sortDir : "desc";

  try {
    // Resolve committee DB IDs
    let committeeDbIds: number[] = [];
    let committees: { id: number; fecCommitteeId: string | null; name: string }[] = [];

    if (discoverMode) {
      committees = await prisma.committee.findMany({
        take: 50,
        select: { id: true, fecCommitteeId: true, name: true },
      });
    } else {
      committees = await prisma.committee.findMany({
        where: { fecCommitteeId: { in: fecCommitteeIds } },
        select: { id: true, fecCommitteeId: true, name: true },
      });
    }

    committeeDbIds = committees.map((c) => c.id);

    if (committeeDbIds.length === 0) {
      return Response.json({
        success: true,
        data: { recipients: [], totalRecipients: 0, totalAmount: 0 },
        meta: { page, limit, total: 0 },
      });
    }

    // Build candidate filter
    const officeFilter: OfficeType[] = [];
    if (chamber === "senate") officeFilter.push(OfficeType.US_SENATOR);
    else if (chamber === "house") officeFilter.push(OfficeType.US_REPRESENTATIVE);
    else officeFilter.push(OfficeType.US_SENATOR, OfficeType.US_REPRESENTATIVE);

    // Query grouped contributions
    const whereContrib: Prisma.PacContributionWhereInput = {
      committeeId: { in: committeeDbIds },
      cycle,
      candidate: {
        officeType: { in: officeFilter },
        ...(party ? { party: { contains: party, mode: "insensitive" as const } } : {}),
        ...(stateAbbr ? { state: { abbreviation: stateAbbr } } : {}),
      },
    };

    // Get aggregated data per candidate
    const grouped = await prisma.pacContribution.groupBy({
      by: ["candidateId"],
      where: whereContrib,
      _sum: { amount: true },
      _count: { id: true },
    });

    // Sort
    const sorted = [...grouped].sort((a, b) => {
      if (validSort === "amount") {
        const diff = (a._sum.amount?.toNumber() ?? 0) - (b._sum.amount?.toNumber() ?? 0);
        return validDir === "desc" ? -diff : diff;
      }
      return 0; // name/state sorting done after fetching candidate details
    });

    const total = sorted.length;
    const paged = sorted.slice(offset, offset + limit);
    const candidateIds = paged.map((g) => g.candidateId);

    // Fetch candidate details
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        party: true,
        officeType: true,
        district: true,
        photoUrl: true,
        state: { select: { abbreviation: true, name: true } },
      },
    });

    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // Fetch individual contributions for the paged candidates
    const contributions = await prisma.pacContribution.findMany({
      where: {
        candidateId: { in: candidateIds },
        committeeId: { in: committeeDbIds },
        cycle,
      },
      include: {
        committee: { select: { name: true, fecCommitteeId: true, fecUrl: true } },
      },
      orderBy: { amount: "desc" },
    });

    // Group contributions by candidate
    const contribsByCandidate = new Map<number, typeof contributions>();
    for (const c of contributions) {
      const list = contribsByCandidate.get(c.candidateId) ?? [];
      list.push(c);
      contribsByCandidate.set(c.candidateId, list);
    }

    // Build response
    const recipients = paged.map((g) => {
      const candidate = candidateMap.get(g.candidateId);
      const contribs = contribsByCandidate.get(g.candidateId) ?? [];

      return {
        candidateId: g.candidateId,
        candidateName: candidate?.name ?? "Unknown",
        party: candidate?.party ?? "",
        state: candidate?.state?.abbreviation ?? "",
        stateName: candidate?.state?.name ?? "",
        officeType: candidate?.officeType ?? "",
        district: candidate?.district ?? null,
        photoUrl: candidate?.photoUrl ?? null,
        totalAmount: g._sum.amount?.toNumber() ?? 0,
        contributionCount: g._count.id,
        contributions: contribs.map((c) => ({
          committeeName: c.committee.name,
          committeeId: c.committee.fecCommitteeId,
          amount: c.amount.toNumber(),
          date: c.contributionDate?.toISOString() ?? null,
          fecUrl: c.fecFilingUrl ?? c.committee.fecUrl ?? null,
        })),
      };
    });

    // If sorting by name or state, re-sort
    if (validSort === "name") {
      recipients.sort((a, b) =>
        validDir === "asc"
          ? a.candidateName.localeCompare(b.candidateName)
          : b.candidateName.localeCompare(a.candidateName)
      );
    } else if (validSort === "state") {
      recipients.sort((a, b) =>
        validDir === "asc"
          ? a.state.localeCompare(b.state)
          : b.state.localeCompare(a.state)
      );
    }

    const totalAmount = grouped.reduce(
      (sum, g) => sum + (g._sum.amount?.toNumber() ?? 0),
      0
    );

    return Response.json({
      success: true,
      data: {
        recipients,
        totalRecipients: total,
        totalAmount,
      },
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error("[pac-recipients] Error:", error);
    return Response.json(
      { error: "Failed to fetch PAC recipients" },
      { status: 500 }
    );
  }
}, { route: "GET /api/pac-recipients" });
