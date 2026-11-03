// ─────────────────────────────────────────────
// Sync audit logging
//
// Every cron job records a row so freshness can be verified centrally
// (see /api/health?verbose). Logging failures must never break a sync.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/db";

export type SyncStatus = "success" | "partial" | "failed";

export interface SyncLogInput {
  syncType: string;
  status: SyncStatus;
  recordsTotal?: number;
  recordsSynced?: number;
  recordsFailed?: number;
  durationMs?: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logSync(input: SyncLogInput): Promise<void> {
  try {
    await prisma.dataSyncLog.create({
      data: {
        syncType: input.syncType,
        status: input.status,
        recordsTotal: input.recordsTotal ?? 0,
        recordsSynced: input.recordsSynced ?? 0,
        recordsFailed: input.recordsFailed ?? 0,
        durationMs: input.durationMs ?? 0,
        errorMessage: input.errorMessage ?? null,
        metadata: (input.metadata ?? {}) as object,
      },
    });
  } catch (error) {
    console.error(
      "[sync-log] Failed to record sync result:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
