// ─────────────────────────────────────────────
// API Route Error Handler
//
// Wraps every API route handler with consistent error handling.
// Catches AppErrors, Prisma errors, Redis errors, Claude errors,
// and generic errors — maps each to safe client responses.
// ─────────────────────────────────────────────

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import {
  AppError,
  ServerError,
  DatabaseError,
  AIProcessingError,
  ExternalAPIError,
  ValidationError,
  getFallbackMessage,
} from "@/lib/errors";
import { logError } from "@/lib/error-logger";

// Re-export error classes so routes can import them from one place
export {
  AppError,
  NotFoundError,
  ValidationError,
  ExternalAPIError,
  RateLimitError,
  DatabaseError,
  AuthenticationError,
  ForbiddenError,
  ServiceUnavailableError,
  AIProcessingError,
  ServerError,
  getFallbackMessage,
} from "@/lib/errors";

export interface ErrorHandlerOptions {
  /** Human-readable route identifier for logging, e.g. 'GET /api/candidates' */
  route?: string;
  /** HTTP method */
  method?: string;
}

// Prisma error class detection (duck typing to avoid importing Prisma in edge routes)
function isPrismaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.constructor.name;
  return (
    name === "PrismaClientKnownRequestError" ||
    name === "PrismaClientValidationError" ||
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError"
  );
}

// Anthropic / Claude SDK error detection
function isAnthropicError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.constructor.name;
  return (
    name.includes("APIError") ||
    name.includes("APIConnectionError") ||
    name.includes("AuthenticationError") ||
    name.includes("RateLimitError") ||
    name.includes("BadRequestError") ||
    name.includes("InternalServerError") ||
    name.includes("NotFoundError") ||
    name.includes("PermissionDeniedError") ||
    name.includes("UnprocessableEntityError")
  );
}

// Redis / Upstash error detection
function isRedisError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("redis") ||
    msg.includes("upstash") ||
    msg.includes("econnrefused") ||
    msg.includes("connection refused") ||
    error.constructor.name === "UpstashError" ||
    error.constructor.name === "RedisError"
  );
}

// External fetch / network error detection
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("abort")
  );
}

/**
 * Map an unknown error to a safe AppError subclass.
 * NEVER exposes internal details to the returned error.
 */
function mapUnknownError(
  error: unknown,
  requestId: string
): AppError {
  // Already an AppError — pass through
  if (error instanceof AppError) {
    return error;
  }

  const raw =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  // Prisma errors → DatabaseError (generic message, hide Prisma codes)
  if (isPrismaError(raw)) {
    return new DatabaseError(getFallbackMessage(500), { requestId });
  }

  // Anthropic / Claude errors → AIProcessingError
  if (isAnthropicError(raw)) {
    return new AIProcessingError(getFallbackMessage(500), { requestId });
  }

  // Redis / Upstash errors → DatabaseError (don't say "Redis" to client)
  if (isRedisError(raw)) {
    return new DatabaseError(getFallbackMessage(500), { requestId });
  }

  // Network / fetch errors from external APIs → ExternalAPIError
  if (isNetworkError(raw)) {
    return new ExternalAPIError(getFallbackMessage(502), { requestId });
  }

  // JSON parse errors → ValidationError
  if (
    raw instanceof SyntaxError &&
    raw.message.toLowerCase().includes("json")
  ) {
    return new ValidationError(
      "Invalid request format. Please check your submission.",
      { requestId }
    );
  }

  // Everything else → generic ServerError
  return new ServerError(getFallbackMessage(500), { requestId });
}

/**
 * Higher-order function that wraps an API route handler with
 * standardized error handling, logging, and safe client responses.
 *
 * Usage:
 *   export const GET = withErrorHandler(async (request) => {
 *     const data = await prisma.entity.findMany();
 *     return Response.json({ success: true, data });
 *   }, { route: 'GET /api/entities' });
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<Response> | Response
>(
  handlerFn: T,
  options: ErrorHandlerOptions = {}
): T {
  const routeLabel = options.route ?? "unknown-route";

  return (async (...args: Parameters<T>): Promise<Response> => {
    const requestId = randomUUID();

    try {
      const response = await handlerFn(...args);
      return response;
    } catch (error: unknown) {
      const appError = mapUnknownError(error, requestId);

      // Log full internal details (server-side only)
      logError({
        appError: appError instanceof AppError ? appError : undefined,
        error:
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "Unknown error"),
        route: routeLabel,
        requestId,
        context: appError.context,
        sensitiveContext:
          error instanceof Error && "code" in error
            ? { originalErrorCode: (error as Error & { code: string }).code }
            : undefined,
      });

      // Return safe client response (never includes stack, internals, or raw messages)
      return Response.json(appError.toJSON(), {
        status: appError.statusCode,
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          "X-Request-Id": requestId,
        },
      });
    }
  }) as T;
}

/**
 * Special wrapper for cron job routes.
 * On failure it logs full details internally and returns HTTP 500 with a body
 * indicating the job failed. The host crontab uses `curl -f`, which records a
 * non-zero exit for failed jobs (visible in the cron log) while continuing to
 * run the other jobs.
 */
export function withCronErrorHandler<
  T extends (...args: any[]) => Promise<Response> | Response
>(
  handlerFn: T,
  options: ErrorHandlerOptions & { jobName: string } = { jobName: "unknown" }
): T {
  const routeLabel = options.route ?? `cron:${options.jobName}`;

  return (async (...args: Parameters<T>): Promise<Response> => {
    const requestId = randomUUID();

    try {
      const response = await handlerFn(...args);
      return response;
    } catch (error: unknown) {
      const appError = mapUnknownError(error, requestId);

      logError({
        appError: appError instanceof AppError ? appError : undefined,
        error:
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "Unknown error"),
        route: routeLabel,
        requestId,
        context: { ...appError.context, jobName: options.jobName },
        sensitiveContext:
          error instanceof Error && "code" in error
            ? { originalErrorCode: (error as Error & { code: string }).code }
            : undefined,
      });

      // Return 500 so host crontab (`curl -f`) surfaces the failure in logs,
      // but indicate the failure in the body too.
      return Response.json(
        {
          success: false,
          code: "CRON_JOB_FAILED",
          message:
            "Sync job encountered an error. Check DataSyncLog for details.",
          job: options.jobName,
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, must-revalidate",
            "X-Request-Id": requestId,
          },
        }
      );
    }
  }) as T;
}
