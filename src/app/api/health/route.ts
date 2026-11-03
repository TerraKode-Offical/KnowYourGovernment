import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/health            → liveness + database check
// GET /api/health?verbose=1  → per-job last run + dataset freshness
//
// The verbose payload contains only aggregate counts and timestamps —
// never subscriber data or other PII — so it is safe to expose publicly.
// ─────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: Request) => {
  const verbose = ["1", "true"].includes(
    new URL(request.url).searchParams.get("verbose") ?? ""
  );

  let dbOk = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  if (!verbose) {
    return NextResponse.json(
      { status: dbOk ? "ok" : "degraded" },
      { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!dbOk) {
    return NextResponse.json(
      { status: "degraded", database: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    logs,
    billStats,
    candidateCount,
    upcomingElections,
    voterInfoNewest,
    caseNewest,
    financeNewest,
  ] = await Promise.all([
    prisma.dataSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        syncType: true,
        status: true,
        recordsSynced: true,
        recordsFailed: true,
        createdAt: true,
      },
    }),
    prisma.bill.aggregate({
      _count: { _all: true },
      _max: { lastActionDate: true, updatedAt: true },
    }),
    prisma.candidate.count(),
    prisma.election.count({ where: { date: { gte: startOfToday } } }),
    prisma.voterInfo.aggregate({ _max: { lastUpdated: true } }),
    prisma.courtCase.aggregate({ _max: { updatedAt: true } }),
    prisma.candidateFinance.aggregate({ _max: { lastUpdated: true } }),
  ]);

  const lastRunByJob: Record<
    string,
    { status: string; recordsSynced: number; recordsFailed: number; at: Date }
  > = {};
  for (const log of logs) {
    if (!lastRunByJob[log.syncType]) {
      lastRunByJob[log.syncType] = {
        status: log.status,
        recordsSynced: log.recordsSynced,
        recordsFailed: log.recordsFailed,
        at: log.createdAt,
      };
    }
  }

  const now = Date.now();
  const ageHours = (d: Date | null | undefined) =>
    d ? Math.round(((now - d.getTime()) / 3_600_000) * 10) / 10 : null;

  return NextResponse.json(
    {
      status: "ok",
      database: true,
      jobs: lastRunByJob,
      datasets: {
        bills: {
          count: billStats._count._all,
          newestAction: billStats._max.lastActionDate,
          updatedAt: billStats._max.updatedAt,
          ageHours: ageHours(billStats._max.updatedAt),
        },
        candidates: { count: candidateCount },
        upcomingElections: { count: upcomingElections },
        voterInfo: {
          updatedAt: voterInfoNewest._max.lastUpdated,
          ageHours: ageHours(voterInfoNewest._max.lastUpdated),
        },
        courtCases: {
          updatedAt: caseNewest._max.updatedAt,
          ageHours: ageHours(caseNewest._max.updatedAt),
        },
        campaignFinance: {
          updatedAt: financeNewest._max.lastUpdated,
          ageHours: ageHours(financeNewest._max.lastUpdated),
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}, { route: "GET /api/health" });
