import { prisma } from "@/lib/db";
import { analyzeBill, detectRiders } from "@/lib/ai/claude-client";
import { withErrorHandler, ValidationError, NotFoundError, AppError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// POST /api/ai/analyze-bill
// Body: { billId: number }
//
// Fetches the bill from the database, calls Claude for a plain-language
// summary and rider detection, persists the results, and returns them.
// ─────────────────────────────────────────────

export const POST = withErrorHandler(async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const { billId } = body as { billId?: unknown };

    if (billId === undefined || billId === null) {
      throw new ValidationError("'billId' is required in the request body");
    }

    const id = Number(billId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("'billId' must be a positive integer");
    }

    // Fetch bill from database
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        sponsor: { select: { id: true, name: true, party: true } },
        state: { select: { id: true, name: true, abbreviation: true } },
      },
    });

    if (!bill) {
      throw new NotFoundError("Bill not found");
    }

    // Build the text to send to Claude.
    // We use title + any existing summaries as a proxy when full text isn't stored.
    const billText = [
      `Title: ${bill.title}`,
      bill.shortTitle ? `Short title: ${bill.shortTitle}` : null,
      bill.executiveSummary ? `\nExisting summary: ${bill.executiveSummary}` : null,
      bill.detailedSummary ? `\nDetailed summary: ${bill.detailedSummary}` : null,
      bill.subjects && Array.isArray(bill.subjects) && (bill.subjects as string[]).length > 0
        ? `\nSubjects: ${(bill.subjects as string[]).join(", ")}`
        : null,
      bill.fullTextUrl ? `\nFull text available at: ${bill.fullTextUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Run analysis and rider detection in parallel
    const [analysis, riderResult] = await Promise.all([
      analyzeBill(bill.title, billText),
      detectRiders(bill.title, billText, billText),
    ]);

    // Persist results
    const updated = await prisma.bill.update({
      where: { id },
      data: {
        executiveSummary: analysis.executive_summary,
        detailedSummary: analysis.detailed_summary,
        aiRiderAnalysis: riderResult.summary,
        hiddenClauses: riderResult.riders,
      },
      select: {
        id: true,
        externalId: true,
        title: true,
        executiveSummary: true,
        detailedSummary: true,
        aiRiderAnalysis: true,
        hiddenClauses: true,
        updatedAt: true,
      },
    });

    return Response.json({
      bill: updated,
      analysis: {
        executive_summary: analysis.executive_summary,
        detailed_summary: analysis.detailed_summary,
        key_provisions: analysis.key_provisions,
        affected_groups: analysis.affected_groups,
        fiscal_impact: analysis.fiscal_impact,
        political_context: analysis.political_context,
      },
      riders: {
        has_riders: riderResult.has_riders,
        riders: riderResult.riders,
        summary: riderResult.summary,
      },
    });
  } catch (error) {
    // Let typed AppErrors (validation, not-found) reach withErrorHandler so
    // they map to 400/404 instead of being flattened into a 500.
    if (error instanceof AppError) throw error;
    console.error("[ai/analyze-bill] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "POST /api/ai/analyze-bill" });
