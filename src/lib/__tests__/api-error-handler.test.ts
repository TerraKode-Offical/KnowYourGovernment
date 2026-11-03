import { describe, it, expect, vi } from "vitest";
import {
  withErrorHandler,
  withCronErrorHandler,
} from "@/lib/api-error-handler";
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AIProcessingError,
  ExternalAPIError,
} from "@/lib/errors";

describe("withErrorHandler", () => {
  it("returns successful response unchanged", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      return Response.json({ data: "ok" });
    }, { route: "GET /api/test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: "ok" });
  });

  it("catches ValidationError and returns 400 with safe JSON", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      throw new ValidationError("Invalid input");
    }, { route: "POST /api/test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("INVALID_REQUEST");
    expect(body.message).toBe("Invalid input");
    expect(body).not.toHaveProperty("stack");
  });

  it("catches NotFoundError and returns 404", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      throw new NotFoundError("Candidate not found");
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("catches generic Error and returns 500 with safe message", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      throw new Error("Something terrible happened");
    }, { route: "GET /api/test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).not.toContain("terrible");
    expect(body.message).toMatch(/technical issue/i);
  });

  it("sets Cache-Control: no-store header", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      throw new ValidationError("Bad");
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.headers.get("Cache-Control")).toBe("no-store, must-revalidate");
  });

  it("sets X-Request-Id header", async () => {
    const handler = withErrorHandler(async (_request: Request) => {
      throw new ValidationError("Bad");
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("preserves original handler arguments (NextRequest, context)", async () => {
    const handler = withErrorHandler(async (req: Request, ctx: unknown) => {
      return Response.json({ hasReq: !!req, hasCtx: !!ctx });
    });

    const response = await handler(new Request("http://localhost"), { foo: "bar" });
    const body = await response.json();
    expect(body.hasReq).toBe(true);
    expect(body.hasCtx).toBe(true);
  });

  it("maps Prisma errors to DatabaseError", async () => {
    const prismaError = new Error("P1001: Can't reach database server");
    (prismaError as Error & { code: string }).code = "P1001";
    Object.setPrototypeOf(prismaError, Error.prototype);
    // Duck-type as PrismaClientKnownRequestError
    Object.defineProperty(prismaError.constructor, "name", { value: "PrismaClientKnownRequestError" });

    const handler = withErrorHandler(async (_request: Request) => {
      throw prismaError;
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("DATABASE_ERROR");
    expect(body.message).not.toContain("Prisma");
    expect(body.message).not.toContain("P1001");
  });

  it("maps Anthropic errors to AIProcessingError", async () => {
    const anthropicError = new Error("Rate limit exceeded");
    Object.defineProperty(anthropicError.constructor, "name", { value: "RateLimitError" });

    const handler = withErrorHandler(async (_request: Request) => {
      throw anthropicError;
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("AI_ANALYSIS_FAILED");
    expect(body.message).not.toContain("Anthropic");
  });

  it("maps network errors to ExternalAPIError", async () => {
    // Use a message that matches network but NOT Redis ("connection refused" is a Redis pattern)
    const networkError = new Error("fetch failed: ENOTFOUND api.example.com");
    Object.defineProperty(networkError.constructor, "name", { value: "NetworkError" });

    const handler = withErrorHandler(async (_request: Request) => {
      throw networkError;
    });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe("DATA_SOURCE_UNAVAILABLE");
  });
});

describe("withCronErrorHandler", () => {
  it("returns successful response unchanged", async () => {
    const handler = withCronErrorHandler(async (_request: Request) => {
      return Response.json({ recordsProcessed: 5 });
    }, { route: "GET /api/cron/sync-test", jobName: "sync-test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.recordsProcessed).toBe(5);
  });

  it("returns HTTP 500 on failure so host cron logs the failure", async () => {
    const handler = withCronErrorHandler(async (_request: Request) => {
      throw new Error("Sync failed");
    }, { route: "GET /api/cron/sync-test", jobName: "sync-test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("CRON_JOB_FAILED");
    expect(body.job).toBe("sync-test");
    expect(body.message).toMatch(/check DataSyncLog/i);
  });

  it("returns HTTP 500 on AppError failures too", async () => {
    const handler = withCronErrorHandler(async (_request: Request) => {
      throw new DatabaseError("DB down");
    }, { jobName: "sync-test" });

    const response = (await handler(new Request("http://localhost"))) as Response;
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("CRON_JOB_FAILED");
  });
});
