// ─────────────────────────────────────────────
// GET /api/cron/analyze-bills
// Cron Job — run AI analysis on bills that haven't been analyzed yet
// Schedule: daily (configure in vercel.json)
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";
import { analyzeBill, detectRiders } from "@/lib/ai/claude-client";
import { verifyCronSecret } from "@/lib/auth";
import { acquireLock } from "@/lib/rate-limit";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import { isAiConfigured } from "@/lib/config";
import { logSync } from "@/lib/sync-log";

const BATCH_SIZE = 25;

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

  const hasLock = await acquireLock("analyze-bills", 600);
  if (!hasLock) {
    return Response.json(
      { error: "Another instance is already running" },
      { status: 423 }
    );
  }

  const startedAt = Date.now();
  const results = { analyzed: 0, errors: 0, total: 0 };

  try {
    // 1. Query bills that haven't been analyzed yet, newest activity first
    const bills = await prisma.bill.findMany({
      where: { executiveSummary: null },
      take: BATCH_SIZE,
      orderBy: [{ lastActionDate: "desc" }, { introducedDate: "desc" }],
    });

    results.total = bills.length;

    // 2. Process each bill individually so one failure doesn't stop the batch
    for (const bill of bills) {
      try {
        // Build the text description from available fields
        const billText = [
          `Title: ${bill.title}`,
          bill.shortTitle ? `Short title: ${bill.shortTitle}` : null,
          bill.subjects &&
          Array.isArray(bill.subjects) &&
          (bill.subjects as string[]).length > 0
            ? `\nSubjects: ${(bill.subjects as string[]).join(", ")}`
            : null,
          bill.executiveSummary
            ? `\nExisting summary: ${bill.executiveSummary}`
            : null,
          bill.detailedSummary
            ? `\nDetailed summary: ${bill.detailedSummary}`
            : null,
          bill.fullTextUrl
            ? `\nFull text available at: ${bill.fullTextUrl}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

        // Run analysis and rider detection in parallel
        const [analysis, riderResult] = await Promise.all([
          analyzeBill(bill.title, billText),
          detectRiders(bill.title, billText, billText),
        ]);

        // Persist results
        await prisma.bill.update({
          where: { id: bill.id },
          data: {
            executiveSummary: analysis.executive_summary,
            detailedSummary: analysis.detailed_summary,
            aiRiderAnalysis: riderResult.summary,
            hiddenClauses: riderResult.riders,
          },
        });

        results.analyzed++;
        console.log(
          `[cron/analyze-bills] Analyzed bill ${bill.id}: ${bill.title}`
        );
      } catch (error) {
        results.errors++;
        console.error(
          `[cron/analyze-bills] Failed to analyze bill ${bill.id}:`,
          error
        );
      }

      // Delay between bills to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await logSync({
      syncType: "analyze-bills",
      status: results.errors > 0 ? "partial" : "success",
      recordsTotal: results.total,
      recordsSynced: results.analyzed,
      recordsFailed: results.errors,
      durationMs: Date.now() - startedAt,
    });

    return Response.json(results);
  } catch (error) {
    console.error("[cron/analyze-bills] Error:", error);
    return Response.json({ error: "Analysis batch failed" }, { status: 500 });
  }
}, { route: "GET /api/cron/analyze-bills", jobName: "analyze-bills" });
