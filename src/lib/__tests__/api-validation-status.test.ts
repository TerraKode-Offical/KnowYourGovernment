import { describe, it, expect, vi } from "vitest";

// These routes must map client-validation errors to HTTP 400 (via
// withErrorHandler) rather than a generic 500. Validation runs before any
// database access, so a stub Prisma client is sufficient.
vi.mock("@/lib/db", () => ({ prisma: {}, default: {} }));

async function status(resPromise: Promise<Response>) {
  const res = await resPromise;
  return { status: res.status, body: await res.text() };
}

describe("API validation maps to 400 (not 500)", () => {
  it("GET /api/search with too-short query -> 400", async () => {
    const { GET } = await import("@/app/api/search/route");
    const r = await status(GET(new Request("http://localhost/api/search?q=a")));
    expect(r.status).toBe(400);
    expect(r.body).not.toMatch(/Prisma|Redis|stack/i);
  });

  it("GET /api/scotus/cases with invalid term -> 400", async () => {
    const { GET } = await import("@/app/api/scotus/cases/route");
    const r = await status(
      GET(new Request("http://localhost/api/scotus/cases?term=abc"))
    );
    expect(r.status).toBe(400);
  });

  it("GET /api/district-lookup without address -> 400", async () => {
    const { GET } = await import("@/app/api/district-lookup/route");
    const r = await status(GET(new Request("http://localhost/api/district-lookup")));
    expect(r.status).toBe(400);
  });

  it("GET /api/polling-places without address -> 400", async () => {
    const { GET } = await import("@/app/api/polling-places/route");
    const r = await status(GET(new Request("http://localhost/api/polling-places")));
    expect(r.status).toBe(400);
  });

  it("POST /api/subscribe with invalid email -> 400", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", stateAbbr: "CA" }),
    });
    const r = await status(POST(req));
    expect(r.status).toBe(400);
  });
});
