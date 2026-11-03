import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// Security headers & transport posture (live origin).
// Confirms blue-team controls advertised in next.config.mjs.
// ─────────────────────────────────────────────

test.describe("security headers", () => {
  test("document response sets the hardened header set", async ({ request }) => {
    const resp = await request.get("/");
    expect(resp.status()).toBe(200);
    const h = resp.headers();

    expect(h["content-security-policy"], "CSP missing").toBeTruthy();
    const csp = h["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");

    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["strict-transport-security"]).toContain("max-age=31536000");
    expect(h["strict-transport-security"]).toContain("preload");
  });

  test("CSP weakness is documented (unsafe-inline/unsafe-eval in script-src)", async ({
    request,
  }) => {
    // Recorded as a hardening finding: script-src must allow inline/eval for
    // Next.js 16 in this configuration. Asserted here so any future tightening
    // flips this test and is noticed.
    const resp = await request.get("/");
    const csp = resp.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  test("X-Powered-By is not disclosed (H-3)", async ({ request }) => {
    const resp = await request.get("/");
    expect(resp.headers()["x-powered-by"]).toBeUndefined();
  });
});

test.describe("API CORS", () => {
  test("API does not return wildcard CORS (H-3)", async ({ request }) => {
    const resp = await request.get("/api/health");
    const acao = resp.headers()["access-control-allow-origin"];
    expect(acao).not.toBe("*");
    // The allowed origin is derived from NEXT_PUBLIC_BASE_URL (inlined at
    // build time), so assert a concrete http(s) origin rather than wildcard.
    expect(acao).toMatch(/^https?:\/\/[^/]+$/);
  });
});
