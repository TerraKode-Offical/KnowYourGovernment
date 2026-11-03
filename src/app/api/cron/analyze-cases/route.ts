import { prisma } from "@/lib/db";
import { analyzeCourtCase } from "@/lib/ai/claude-client";
import { verifyCronSecret } from "@/lib/auth";
import { acquireLock } from "@/lib/rate-limit";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import { isAiConfigured } from "@/lib/config";
import { logSync } from "@/lib/sync-log";

// ─────────────────────────────────────────────
// GET /api/cron/analyze-cases
//
// Finds SCOTUS cases that have been decided but don't yet have an
// AI summary, and generates a plain-English summary + impact analysis
// using Claude Haiku.
//
// Processes up to 5 cases per run to control API costs.
// ─────────────────────────────────────────────

const BATCH_SIZE = 5;
const DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export const GET = withCronErrorHandler(async (request: Request) => {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return Response.json({
      analyzed: 0,
      skipped: true,
      reason: "ANTHROPIC_API_KEY is not configured",
    });
  }

  const hasLock = await acquireLock("analyze-cases", 600);
  if (!hasLock) {
    return Response.json(
      { error: "Another instance is already running" },
      { status: 423 }
    );
  }

  try {
    const startedAt = Date.now();
    const cases = await prisma.courtCase.findMany({
      where: {
        status: "DECIDED",
        aiSummary: null,
        conclusion: { not: null },
      },
      take: BATCH_SIZE,
      orderBy: { dateDecided: "desc" },
    });

    if (cases.length === 0) {
      return Response.json({
        success: true,
        analyzed: 0,
        message: "No cases need analysis.",
      });
    }

    let analyzed = 0;
    let errors = 0;

    for (const c of cases) {
      try {
        const question = c.question ? stripHtml(c.question) : "";
        const facts = c.factsOfTheCase ? stripHtml(c.factsOfTheCase) : "";
        const conclusion = c.conclusion ? stripHtml(c.conclusion) : "";

        if (!conclusion) continue;

        const result = await analyzeCourtCase(
          c.name,
          question,
          facts,
          conclusion
        );

        await prisma.courtCase.update({
          where: { id: c.id },
          data: {
            aiSummary: result.plain_english_summary,
            aiImpactAnalysis: result.impact_analysis,
          },
        });

        analyzed++;
        console.log(`[analyze-cases] Analyzed: ${c.name}`);
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`[analyze-cases] Error analyzing ${c.name}:`, err);
        errors++;
      }
    }

    await logSync({
      syncType: "analyze-cases",
      status: errors > 0 ? "partial" : "success",
      recordsTotal: cases.length,
      recordsSynced: analyzed,
      recordsFailed: errors,
      durationMs: Date.now() - startedAt,
    });

    return Response.json({ success: true, analyzed, errors });
  } catch (error) {
    console.error("[analyze-cases] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/cron/analyze-cases", jobName: "analyze-cases" });
