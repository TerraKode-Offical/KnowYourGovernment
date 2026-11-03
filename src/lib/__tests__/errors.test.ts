import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalAPIError,
  RateLimitError,
  DatabaseError,
  AuthenticationError,
  AIProcessingError,
  ServerError,
} from "@/lib/errors";

describe("AppError subclasses", () => {
  it("ValidationError has correct properties", () => {
    const err = new ValidationError("Invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.publicCode).toBe("INVALID_REQUEST");
    expect(err.userMessage).toBe("Invalid input");
    expect(err.isOperational).toBe(true);
  });

  it("NotFoundError has correct properties", () => {
    const err = new NotFoundError("User not found");
    expect(err.statusCode).toBe(404);
    expect(err.publicCode).toBe("NOT_FOUND");
    expect(err.userMessage).toBe("User not found");
    expect(err.isOperational).toBe(true);
  });

  it("ExternalAPIError has correct properties", () => {
    const err = new ExternalAPIError("Service unavailable");
    expect(err.statusCode).toBe(502);
    expect(err.publicCode).toBe("DATA_SOURCE_UNAVAILABLE");
    expect(err.userMessage).toBe("Service unavailable");
    expect(err.isOperational).toBe(true);
  });

  it("RateLimitError has correct properties", () => {
    const err = new RateLimitError("Too many requests", { retryAfter: 60 });
    expect(err.statusCode).toBe(429);
    expect(err.publicCode).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.userMessage).toBe("Too many requests");
    expect(err.context).toEqual({ retryAfter: 60 });
    expect(err.isOperational).toBe(true);
  });

  it("DatabaseError has correct properties", () => {
    const err = new DatabaseError("Database connection failed");
    expect(err.statusCode).toBe(500);
    expect(err.publicCode).toBe("DATABASE_ERROR");
    expect(err.userMessage).toBe("Database connection failed");
    expect(err.isOperational).toBe(false);
  });

  it("AuthenticationError has correct properties", () => {
    const err = new AuthenticationError("Unauthorized");
    expect(err.statusCode).toBe(401);
    expect(err.publicCode).toBe("UNAUTHORIZED");
    expect(err.userMessage).toBe("Unauthorized");
    expect(err.isOperational).toBe(true);
  });

  it("AIProcessingError has correct properties", () => {
    const err = new AIProcessingError("Analysis failed");
    expect(err.statusCode).toBe(500);
    expect(err.publicCode).toBe("AI_ANALYSIS_FAILED");
    expect(err.userMessage).toBe("Analysis failed");
    expect(err.isOperational).toBe(false);
  });

  it("ServerError has correct properties", () => {
    const err = new ServerError("Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.publicCode).toBe("INTERNAL_ERROR");
    expect(err.userMessage).toBe("Something went wrong");
    expect(err.isOperational).toBe(false);
  });

  it("toJSON() never leaks internal details", () => {
    const err = new DatabaseError("Connection failed", {
      context: { query: "SELECT * FROM users" },
      requestId: "req-123",
    });
    const json = err.toJSON();
    expect(json).toEqual({
      success: false,
      message: "Connection failed",
      code: "DATABASE_ERROR",
      context: { query: "SELECT * FROM users" },
    });
    expect(json).not.toHaveProperty("originalError");
    expect(json).not.toHaveProperty("stack");
  });

  it("toLogObject() includes full internal details", () => {
    const err = new DatabaseError("Wrapped", {
      context: { id: 1 },
      requestId: "req-123",
    });
    const log = err.toLogObject("GET /api/test", "req-123");
    expect(log.statusCode).toBe(500);
    expect(log.publicCode).toBe("DATABASE_ERROR");
    expect(log.safeContext).toEqual({ id: 1 });
    expect(log.requestId).toBe("req-123");
    expect(log.originalMessage).toBe("Wrapped");
  });

  it("stores requestId for tracing", () => {
    const err = new ValidationError("Bad request", { requestId: "abc-123" });
    expect(err.requestId).toBe("abc-123");
  });
});
