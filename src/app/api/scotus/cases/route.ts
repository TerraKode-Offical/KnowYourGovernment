import { prisma } from "@/lib/db";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/scotus/cases?term=2024&status=DECIDED
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const termParam = searchParams.get("term")?.trim();
    const statusParam = searchParams.get("status")?.trim().toUpperCase();

    const where: Record<string, unknown> = {};

    if (termParam) {
      const term = parseInt(termParam, 10);
      if (!Number.isInteger(term) || term < 1790 || term > 2100) {
        throw new ValidationError("Invalid term. Must be a valid year.");
      }
      where.term = term;
    }

    if (statusParam) {
      if (!["GRANTED", "ARGUED", "DECIDED"].includes(statusParam)) {
        throw new ValidationError("Invalid status. Must be GRANTED, ARGUED, or DECIDED.");
      }
      where.status = statusParam;
    }

    const cases = await prisma.courtCase.findMany({
      where,
      select: {
        id: true,
        oyezId: true,
        name: true,
        docketNumber: true,
        term: true,
        dateArgued: true,
        dateDecided: true,
        question: true,
        aiSummary: true,
        decisionDirection: true,
        majorityVotes: true,
        minorityVotes: true,
        justiaUrl: true,
        status: true,
      },
      orderBy: [{ dateDecided: "desc" }, { dateArgued: "desc" }],
      take: 50,
    });

    return Response.json({ cases });
}, { route: "GET /api/scotus/cases" });
