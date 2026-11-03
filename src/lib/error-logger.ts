// ─────────────────────────────────────────────
// Structured Error Logger
//
// Server-side only. Full details, stack traces, sensitive metadata.
// NEVER logs PII. NEVER sends logs to the client.
// ─────────────────────────────────────────────

import type { AppError, ErrorContext } from "@/lib/errors";

export interface LogErrorParams {
  /** The wrapped AppError if available */
  appError?: AppError;
  /** The original raw error */
  error: Error;
  /** API route or page path */
  route: string;
  /** UUID for request tracing */
  requestId: string;
  /** Safe context (entity types, IDs, action names) */
  context?: ErrorContext;
  /** Internal-only context (raw query strings, raw external API responses, Prisma codes) */
  sensitiveContext?: Record<string, unknown>;
}

/**
 * Log a structured error to the server console.
 * This function NEVER returns anything to the client.
 */
export function logError(params: LogErrorParams): void {
  const { appError, error, route, requestId, context, sensitiveContext } =
    params;

  const logEntry = {
    level: appError ? (appError.statusCode >= 500 ? "error" : "warn") : "error",
    timestamp: new Date().toISOString(),
    requestId,
    route,
    statusCode: appError?.statusCode ?? 500,
    publicCode: appError?.publicCode ?? "INTERNAL_ERROR",
    userMessage: appError?.userMessage ?? "Something went wrong on our end. Please try again later.",
    errorClass: error.constructor.name,
    originalMessage: error.message,
    stack: error.stack,
    safeContext: context,
    sensitiveContext,
  };

  // Output as single-line JSON for log aggregation / Vercel log parsing
  console.error(JSON.stringify(logEntry));
}

/**
 * Convenience wrapper for logging without constructing an AppError first.
 * Useful when you want to log an unexpected error with context.
 */
export function logUnexpected(
  error: unknown,
  route: string,
  requestId: string,
  context?: ErrorContext
): void {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  logError({
    error: err,
    route,
    requestId,
    context,
    sensitiveContext:
      err instanceof Error && "code" in err
        ? { originalCode: (err as Error & { code: string }).code }
        : undefined,
  });
}
