import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertSameOrigin,
  assertJsonContentType,
  readJsonBody,
  assertNoHoneypot,
} from "@/lib/request-guard";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { apiErrorMessage } from "@/lib/api-client";

function makeRequest(
  headers: Record<string, string> = {},
  body?: string
): Request {
  return new Request("https://knowyourgov.us/api/subscribe", {
    method: "POST",
    headers,
    body,
  });
}

const ORIGINAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_BASE_URL = "https://knowyourgov.us";
});

afterEach(() => {
  if (ORIGINAL_BASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE_URL;
  }
});

describe("assertSameOrigin", () => {
  it("allows requests with no Origin header (server-to-server)", () => {
    expect(() => assertSameOrigin(makeRequest())).not.toThrow();
  });

  it("allows the configured site origin", () => {
    expect(() =>
      assertSameOrigin(makeRequest({ origin: "https://knowyourgov.us" }))
    ).not.toThrow();
  });

  it("rejects a foreign origin", () => {
    expect(() =>
      assertSameOrigin(makeRequest({ origin: "https://evil.example" }))
    ).toThrow(ForbiddenError);
  });

  it("rejects sec-fetch-site: cross-site", () => {
    expect(() =>
      assertSameOrigin(makeRequest({ "sec-fetch-site": "cross-site" }))
    ).toThrow(ForbiddenError);
  });
});

describe("assertJsonContentType", () => {
  it("accepts application/json", () => {
    expect(() =>
      assertJsonContentType(makeRequest({ "content-type": "application/json" }))
    ).not.toThrow();
  });

  it("rejects form-encoded bodies (classic CSRF shape)", () => {
    expect(() =>
      assertJsonContentType(
        makeRequest({ "content-type": "application/x-www-form-urlencoded" })
      )
    ).toThrow(ValidationError);
  });
});

describe("readJsonBody", () => {
  it("parses a JSON object", async () => {
    const body = await readJsonBody<{ email: string }>(
      makeRequest({ "content-type": "application/json" }, '{"email":"a@b.co"}')
    );
    expect(body.email).toBe("a@b.co");
  });

  it("rejects malformed JSON", async () => {
    await expect(
      readJsonBody(makeRequest({ "content-type": "application/json" }, "{oops"))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects bodies over the size cap", async () => {
    await expect(
      readJsonBody(
        makeRequest({ "content-type": "application/json" }, JSON.stringify({ a: "x".repeat(200) })),
        50
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("assertNoHoneypot", () => {
  it("allows an empty honeypot", () => {
    expect(() => assertNoHoneypot({ website: "" })).not.toThrow();
  });

  it("rejects a filled honeypot", () => {
    expect(() => assertNoHoneypot({ website: "http://spam" })).toThrow(
      ValidationError
    );
  });
});

describe("apiErrorMessage", () => {
  it("prefers the standard error handler message", () => {
    expect(
      apiErrorMessage(
        { success: false, message: "Email updates are temporarily unavailable.", code: "SERVICE_UNAVAILABLE" },
        "fallback"
      )
    ).toBe("Email updates are temporarily unavailable.");
  });

  it("supports legacy { error: string } payloads", () => {
    expect(apiErrorMessage({ error: "Bad input" }, "fallback")).toBe("Bad input");
  });

  it("supports nested { error: { message } } payloads", () => {
    expect(apiErrorMessage({ error: { message: "Nested" } }, "fallback")).toBe(
      "Nested"
    );
  });

  it("falls back for unknown shapes", () => {
    expect(apiErrorMessage(null, "fallback")).toBe("fallback");
    expect(apiErrorMessage({}, "fallback")).toBe("fallback");
  });
});
