import { prisma } from "@/lib/db";
import { Chamber, BillStatus } from "@/types";
import { withErrorHandler, ValidationError, NotFoundError, AppError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/bills
// Query params:
//   stateAbbr  — two-letter state abbreviation (e.g. "CA")
//   chamber    — "HOUSE" | "SENATE"
//   status     — BillStatus enum value
//   page       — 1-based page number (default: 1)
//   limit      — results per page (default: 20, max: 100)
// ─────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET = withErrorHandler(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const stateAbbr = searchParams.get("stateAbbr")?.trim().toUpperCase();
    const chamberParam = searchParams.get("chamber")?.trim().toUpperCase();
    const statusParam = searchParams.get("status")?.trim().toUpperCase();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    // Validate and coerce pagination
    const page = Math.max(1, parseInt(pageParam ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const skip = (page - 1) * limit;

    // Validate enum values
    if (chamberParam && !Object.values(Chamber).includes(chamberParam as Chamber)) {
      return Response.json(
        { error: `Invalid chamber. Must be one of: ${Object.values(Chamber).join(", ")}` },
        { status: 400 }
      );
    }

    if (statusParam && !Object.values(BillStatus).includes(statusParam as BillStatus)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${Object.values(BillStatus).join(", ")}` },
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

    // Build where clause
    const where = {
      ...(stateId !== undefined ? { stateId } : {}),
      ...(chamberParam ? { chamber: chamberParam as Chamber } : {}),
      ...(statusParam ? { status: statusParam as BillStatus } : {}),
    };

    // Run count and data query in parallel
    const [total, bills] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.findMany({
        where,
        select: {
          id: true,
          externalId: true,
          title: true,
          shortTitle: true,
          chamber: true,
          status: true,
          introducedDate: true,
          lastActionDate: true,
          executiveSummary: true,
          aiRiderAnalysis: true,
          hiddenClauses: true,
          sponsorId: true,
          fullTextUrl: true,
          congressGovUrl: true,
          subjects: true,
          stateId: true,
          state: {
            select: { id: true, name: true, abbreviation: true, fipsCode: true },
          },
          sponsor: {
            select: { id: true, name: true, party: true, officeType: true },
          },
        },
        orderBy: { introducedDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return Response.json({
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("[bills] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/bills" });
