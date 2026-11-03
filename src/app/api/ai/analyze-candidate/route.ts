import { prisma } from "@/lib/db";
import { analyzeCandidatePolicy } from "@/lib/ai/claude-client";
import { PolicyCategory, VoteChoice } from "@/types";
import { withErrorHandler, ValidationError, NotFoundError, AppError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// POST /api/ai/analyze-candidate
// Body: { candidateId: number, category: PolicyCategory }
//
// Fetches candidate data (including vote history), calls Claude for a
// balanced policy analysis, upserts the CandidatePolicy record, and
// returns the result.
// ─────────────────────────────────────────────

export const POST = withErrorHandler(async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const { candidateId, category } = body as {
      candidateId?: unknown;
      category?: unknown;
    };

    if (candidateId === undefined || candidateId === null) {
      throw new ValidationError("'candidateId' is required in the request body");
    }

    if (!category) {
      throw new ValidationError("'category' is required in the request body");
    }

    const id = Number(candidateId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("'candidateId' must be a positive integer");
    }

    const categoryStr = String(category).toUpperCase();
    if (!Object.values(PolicyCategory).includes(categoryStr as PolicyCategory)) {
      return Response.json(
        {
          error: `Invalid category. Must be one of: ${Object.values(PolicyCategory).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Fetch candidate with vote history
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        state: { select: { name: true, abbreviation: true } },
        billVotes: {
          include: {
            bill: { select: { title: true, externalId: true } },
          },
          orderBy: { voteDate: "desc" },
          take: 20,
        },
      },
    });

    if (!candidate) {
      throw new NotFoundError("Candidate not found");
    }

    // Map vote history to the format expected by claude-client
    const votes = candidate.billVotes.map(
      (bv: {
        bill: { title: string; externalId: string };
        vote: string;
        voteDate: Date;
      }) => ({
        bill: `${bv.bill.title} (${bv.bill.externalId})`,
        vote: bv.vote as VoteChoice,
        date: bv.voteDate.toISOString().split("T")[0],
      })
    );

    // Call Claude for policy analysis
    const analysis = await analyzeCandidatePolicy({
      name: candidate.name,
      party: candidate.party,
      office: candidate.officeType,
      category: categoryStr as PolicyCategory,
      votes,
      statements: [], // TODO: wire up statements when that model is added
    });

    // Upsert the CandidatePolicy record
    const policy = await prisma.candidatePolicy.upsert({
      where: {
        candidateId_category: {
          candidateId: id,
          category: categoryStr as PolicyCategory,
        },
      },
      create: {
        candidateId: id,
        category: categoryStr as PolicyCategory,
        summary: analysis.summary,
        supportersPerspective: analysis.supporters_perspective,
        criticsPerspective: analysis.critics_perspective,
        aiAnalysis: JSON.stringify(analysis),
        sources: [],
        lastAnalyzedAt: new Date(),
      },
      update: {
        summary: analysis.summary,
        supportersPerspective: analysis.supporters_perspective,
        criticsPerspective: analysis.critics_perspective,
        aiAnalysis: JSON.stringify(analysis),
        lastAnalyzedAt: new Date(),
      },
    });

    return Response.json({
      policy,
      analysis,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("[ai/analyze-candidate] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "POST /api/ai/analyze-candidate" });
