import { prisma } from "@/lib/db";
import { OfficeType } from "@/types";
import { withErrorHandler, ValidationError, NotFoundError, AppError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/candidates
// Query params:
//   stateAbbr   — two-letter state abbreviation (e.g. "TX")
//   officeType  — OfficeType enum value (e.g. "US_SENATOR")
//   party       — party string, case-insensitive partial match (e.g. "Republican")
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const stateAbbr = searchParams.get("stateAbbr")?.trim().toUpperCase();
    const officeTypeParam = searchParams.get("officeType")?.trim().toUpperCase();
    const partyParam = searchParams.get("party")?.trim();

    // Validate officeType
    if (
      officeTypeParam &&
      !Object.values(OfficeType).includes(officeTypeParam as OfficeType)
    ) {
      return Response.json(
        {
          error: `Invalid officeType. Must be one of: ${Object.values(OfficeType).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Resolve state ID if stateAbbr provided
    let stateId: number | undefined;
    if (stateAbbr) {
      const state = await prisma.state.findUnique({
        where: { abbreviation: stateAbbr },
        select: { id: true },
      });
      if (!state) {
        return Response.json(
          { error: `State not found: ${stateAbbr}` },
          { status: 404 }
        );
      }
      stateId = state.id;
    }

    const where = {
      ...(stateId !== undefined ? { stateId } : {}),
      ...(officeTypeParam ? { officeType: officeTypeParam as OfficeType } : {}),
      ...(partyParam
        ? { party: { contains: partyParam, mode: "insensitive" as const } }
        : {}),
    };

    const candidates = await prisma.candidate.findMany({
      where,
      select: {
        id: true,
        name: true,
        party: true,
        photoUrl: true,
        biography: true,
        websiteUrl: true,
        officeType: true,
        district: true,
        isIncumbent: true,
        incumbentSince: true,
        termEnds: true,
        contactInfo: true,
        socialMedia: true,
        stateId: true,
        state: {
          select: { id: true, name: true, abbreviation: true, fipsCode: true },
        },
        policies: {
          select: {
            id: true,
            category: true,
            summary: true,
            lastAnalyzedAt: true,
          },
        },
      },
      orderBy: [{ isIncumbent: "desc" }, { name: "asc" }],
      take: 200, // Hard cap — prevents full-table dumps via the public API
    });

    return Response.json({ candidates });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("[candidates] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/candidates" });
