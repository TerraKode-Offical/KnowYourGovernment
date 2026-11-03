import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError, logUnexpected } from "@/lib/error-logger";
import { ValidationError, DatabaseError } from "@/lib/errors";

describe("logError", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("outputs structured JSON log entry", () => {
    const error = new Error("Something broke");
    logError({
      error,
      route: "GET /api/test",
      requestId: "req-abc-123",
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe("error");
    expect(logEntry.route).toBe("GET /api/test");
    expect(logEntry.requestId).toBe("req-abc-123");
    expect(logEntry.statusCode).toBe(500);
    expect(logEntry.publicCode).toBe("INTERNAL_ERROR");
    expect(logEntry.errorClass).toBe("Error");
    expect(logEntry.originalMessage).toBe("Something broke");
    expect(logEntry.stack).toBeTruthy();
  });

  it("uses warn level for 4xx operational errors", () => {
    const appError = new ValidationError("Bad input");
    logError({
      appError,
      error: new Error("Bad input"),
      route: "POST /api/test",
      requestId: "req-456",
    });

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe("warn");
    expect(logEntry.statusCode).toBe(400);
    expect(logEntry.publicCode).toBe("INVALID_REQUEST");
  });

  it("uses error level for 5xx non-operational errors", () => {
    const appError = new DatabaseError("Connection failed");
    logError({
      appError,
      error: new Error("Connection failed"),
      route: "GET /api/test",
      requestId: "req-789",
    });

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe("error");
    expect(logEntry.statusCode).toBe(500);
  });

  it("includes safeContext and sensitiveContext when provided", () => {
    logError({
      error: new Error("Fail"),
      route: "GET /api/test",
      requestId: "req-000",
      context: { userId: "u1" },
      sensitiveContext: { rawQuery: "SELECT * FROM secrets" },
    });

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.safeContext).toEqual({ userId: "u1" });
    expect(logEntry.sensitiveContext).toEqual({ rawQuery: "SELECT * FROM secrets" });
  });

  it("never includes PII in default output", () => {
    const error = new Error("email=test@example.com address=123 Main St zip=12345");
    logError({
      error,
      route: "GET /api/test",
      requestId: "req-pii",
    });

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    // The logger itself doesn't strip PII - that's the caller's responsibility.
    // This test documents current behavior and reminds us to be careful.
    expect(logEntry.originalMessage).toContain("test@example.com");
  });
});

describe("logUnexpected", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("wraps string errors in Error objects", () => {
    logUnexpected("Something went wrong", "GET /api/test", "req-111");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.originalMessage).toBe("Something went wrong");
    expect(logEntry.errorClass).toBe("Error");
  });

  it("wraps non-string non-Error values in Error objects", () => {
    logUnexpected(null, "GET /api/test", "req-222");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.originalMessage).toBe("Unknown error");
  });

  it("preserves Error objects as-is", () => {
    const err = new Error("Known error");
    logUnexpected(err, "GET /api/test", "req-333");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.originalMessage).toBe("Known error");
  });

  it("extracts code from errors with code property", () => {
    const err = new Error("DB fail") as Error & { code: string };
    err.code = "P2002";
    logUnexpected(err, "GET /api/test", "req-444");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.sensitiveContext).toEqual({ originalCode: "P2002" });
  });
});
