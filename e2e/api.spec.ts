import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// API contract tests (run once, Chromium project).
// Non-destructive: only GETs and invalid-input POSTs that never reach the DB
// or external paid services (validation fails first).
// ─────────────────────────────────────────────

const BAD = ["Prisma", "prisma", "Redis", "stack", " at ", "P2002", "ECONNREFUSED"];

function assertSanitized(body: string) {
  for (const needle of BAD) {
    expect(body, `response leaked internal detail '${needle}'`).not.toContain(needle);
  }
}

test.describe("public API contracts", () => {
  test("GET /api/health -> ok", async ({ request }) => {
    const r = await request.get("/api/health");
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
  });

  test("GET /api/bills enforces the limit cap (<=100)", async ({ request }) => {
    const r = await request.get("/api/bills?limit=99999");
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.pagination.limit).toBeLessThanOrEqual(100);
    expect(Array.isArray(body.bills)).toBe(true);
  });

  test("GET /api/bills invalid chamber -> 400", async ({ request }) => {
    const r = await request.get("/api/bills?chamber=BAD");
    expect(r.status()).toBe(400);
    assertSanitized(await r.text());
  });

  test("GET /api/bills unknown state -> 404", async ({ request }) => {
    const r = await request.get("/api/bills?stateAbbr=ZZ");
    expect(r.status()).toBe(404);
  });

  test("GET /api/candidates invalid officeType -> 400", async ({ request }) => {
    const r = await request.get("/api/candidates?officeType=BAD");
    expect(r.status()).toBe(400);
  });

  test("GET /api/search valid query -> 200", async ({ request }) => {
    const r = await request.get("/api/search?q=california");
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.bills)).toBe(true);
    expect(Array.isArray(body.candidates)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Validation status codes.
// Previously these routes returned 500 because a local try/catch swallowed
// the thrown ValidationError, defeating withErrorHandler (finding F-1).
// Fixed; these assert 400.
// ─────────────────────────────────────────────
test.describe("validation status codes", () => {
  test("search too-short query should be 400", async ({ request }) => {
    const r = await request.get("/api/search?q=a");
    expect(r.status()).toBe(400);
  });

  test("scotus invalid term should be 400", async ({ request }) => {
    const r = await request.get("/api/scotus/cases?term=abc");
    expect(r.status()).toBe(400);
  });

  test("district-lookup missing address should be 400", async ({ request }) => {
    const r = await request.get("/api/district-lookup");
    expect(r.status()).toBe(400);
  });

  test("polling-places missing address should be 400", async ({ request }) => {
    const r = await request.get("/api/polling-places");
    expect(r.status()).toBe(400);
  });

  test("subscribe invalid email should be 400", async ({ request }) => {
    const r = await request.post("/api/subscribe", {
      data: { email: "not-an-email", stateAbbr: "CA" },
    });
    expect(r.status()).toBe(400);
  });
});

test.describe("correct validation status codes (control group)", () => {
  test("local/meetings missing param -> 400 structured error", async ({ request }) => {
    const r = await request.get("/api/local/meetings");
    expect(r.status()).toBe(400);
    const body = await r.json();
    expect(body.code).toBe("INVALID_REQUEST");
  });

  test("local/municipality missing param -> 400 structured error", async ({ request }) => {
    const r = await request.get("/api/local/municipality");
    expect(r.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Authorization: AI + cron must reject unauthenticated requests.
// ─────────────────────────────────────────────
test.describe("authorization", () => {
  test("POST /api/ai/analyze-bill without token -> 401", async ({ request }) => {
    const r = await request.post("/api/ai/analyze-bill", { data: { billId: 1 } });
    expect(r.status()).toBe(401);
    assertSanitized(await r.text());
  });

  test("POST /api/ai/analyze-bill wrong bearer -> 401", async ({ request }) => {
    const r = await request.post("/api/ai/analyze-bill", {
      headers: { Authorization: "Bearer wrong-secret-value" },
      data: { billId: 1 },
    });
    expect(r.status()).toBe(401);
  });

  test("GET /api/ai/analyze-bill still requires auth -> 401", async ({ request }) => {
    const r = await request.get("/api/ai/analyze-bill");
    expect(r.status()).toBe(401);
  });

  test("GET /api/cron/sync-members without token -> 401", async ({ request }) => {
    const r = await request.get("/api/cron/sync-members");
    expect(r.status()).toBe(401);
  });

  test("GET /api/cron/sync-members wrong ?secret -> 401", async ({ request }) => {
    const r = await request.get("/api/cron/sync-members?secret=wrong");
    expect(r.status()).toBe(401);
  });

  test("GET /api/cron/sync-members ?manual=true blocked in production -> 403", async ({
    request,
  }) => {
    const r = await request.get("/api/cron/sync-members?manual=true");
    expect(r.status()).toBe(403);
  });
});

// ─────────────────────────────────────────────
// Regression harness for previously-confirmed product defects (F-2/F-3/F-5).
// These now assert the FIXED behaviour.
// ─────────────────────────────────────────────
test.describe("product-defect regression harness", () => {
  test("F-2: congress.gov member images resolve via /_next/image", async ({ request }) => {
    const url =
      "/_next/image?url=" +
      encodeURIComponent("https://www.congress.gov/img/member/k000389_200.jpg") +
      "&w=96&q=75";
    const r = await request.get(url);
    expect(r.status()).toBe(200);
  });

  test("F-3: sitemap includes state hub URLs", async ({ request }) => {
    const r = await request.get("/sitemap.xml");
    const body = await r.text();
    expect(body).toContain("/state/");
  });

  test("F-5: CSP permits the Cloudflare-injected analytics beacon", async ({
    request,
  }) => {
    const r = await request.get("/");
    const csp = r.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("cloudflareinsights");
  });
});

// ─────────────────────────────────────────────
// Rate limiting: intentionally trips the /api/subscribe tier (5/60s).
// Body is invalid input only, so nothing is written or emailed.
// ─────────────────────────────────────────────
test.describe("rate limiting", () => {
  test.describe.configure({ mode: "serial" });

  test("subscribe endpoint rate-limits a burst with 429", async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await request.post("/api/subscribe", {
        data: { email: `invalid-${i}`, stateAbbr: "CA" },
      });
      statuses.push(r.status());
    }
    expect(
      statuses.some((s) => s === 429),
      `expected a 429 within burst; got ${statuses.join(",")}`
    ).toBe(true);
  });
});
