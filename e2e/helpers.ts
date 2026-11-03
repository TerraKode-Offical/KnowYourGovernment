import { Page, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// Shared E2E helpers
// ─────────────────────────────────────────────

export interface ConsoleCollector {
  errors: string[];
  warnings: string[];
}

/**
 * Third-party / environmental noise that is not an application defect:
 *  - favicon and the self-hosted analytics host
 *  - Cloudflare Web Analytics beacon (cloudflareinsights.com), which some test
 *    networks block via DNS/adblock. The CSP legitimately allows it (finding F-5).
 *  - Network-level failures of external resources (host resolution / ERR_*),
 *    including WebKit's SRI error for the cross-origin beacon. Application
 *    assets are same-origin and are separately checked by the media-integrity
 *    test.
 */
function isIgnored(text: string): boolean {
  return (
    text.includes("favicon") ||
    text.includes("analytics.knowyourgov") ||
    text.includes("cloudflareinsights") ||
    text.includes("integrity mismatch") ||
    text.includes("Could not resolve hostname") ||
    /Failed to load resource:\s*(net::ERR_|the server responded with a status of 0\b)/.test(
      text
    )
  );
}

/**
 * Attach console/pageerror listeners. Call BEFORE page.goto().
 * Filters low-signal third-party noise so genuine JS errors surface.
 */
export async function collectConsole(page: Page): Promise<ConsoleCollector> {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      if (isIgnored(text)) return;
      errors.push(text);
    } else if (msg.type() === "warning") {
      warnings.push(text);
    }
  });
  page.on("pageerror", (err) => {
    if (isIgnored(err.message)) return;
    errors.push(`pageerror: ${err.message}`);
  });

  return { errors, warnings };
}

/**
 * Navigate and assert the document response status. Returns the response.
 * Uses `waitUntil: "domcontentloaded"` for speed; readiness is asserted via
 * meaningful page assertions rather than arbitrary sleeps.
 */
export async function gotoAndCheck(
  page: Page,
  path: string,
  expectedStatus = 200
) {
  const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(resp, `no response for ${path}`).not.toBeNull();
  expect(resp!.status(), `unexpected status for ${path}`).toBe(expectedStatus);
  return resp!;
}

/** Assert no element causes horizontal document overflow (mobile responsiveness). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  // Allow a small tolerance for sub-pixel rounding / scrollbars.
  expect(overflow, "document has horizontal overflow").toBeLessThanOrEqual(2);
}

/** Assert every <img> either loaded or was intentionally lazily deferred. */
export async function expectNoBrokenImages(page: Page) {
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
  );
  expect(broken, `broken images: ${broken.join(", ")}`).toEqual([]);
}
