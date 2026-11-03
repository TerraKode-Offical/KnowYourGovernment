import { test, expect } from "@playwright/test";
import { PUBLIC_ROUTES, DEEP_LINKS } from "./routes";
import {
  collectConsole,
  gotoAndCheck,
  expectNoHorizontalOverflow,
  expectNoBrokenImages,
} from "./helpers";

// ─────────────────────────────────────────────
// Smoke: every discovered public route renders, is titled, and is clean.
// ─────────────────────────────────────────────

test.describe("route smoke", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route.name} (${route.path})`, async ({ page }) => {
      const console_ = await collectConsole(page);
      await gotoAndCheck(page, route.path, route.status ?? 200);

      // Meaningful readiness signal: a non-empty <title>.
      await expect(page).toHaveTitle(/\S/);

      if (route.h1) {
        await expect(
          page.getByRole("heading", { level: 1 }).first()
        ).toContainText(route.h1);
      }

      // Hydration/JS errors are defects, not flakes.
      expect(console_.errors, `console errors on ${route.path}`).toEqual([]);
    });
  }
});

test.describe("deep links & history", () => {
  for (const link of DEEP_LINKS) {
    test(`navigates ${link.from} -> ${link.to}`, async ({ page }) => {
      const console_ = await collectConsole(page);
      await gotoAndCheck(page, link.from);
      await page.goto(link.to, { waitUntil: "domcontentloaded" });
      expect(page.url()).toContain(link.to);

      // Browser back returns to the origin path.
      await page.goBack({ waitUntil: "domcontentloaded" });
      await page.waitForURL((u) => new URL(u).pathname === link.from);
      expect(new URL(page.url()).pathname).toBe(link.from);

      expect(console_.errors).toEqual([]);
    });
  }
});

test.describe("not found handling", () => {
  test("unknown route returns a real 404", async ({ page }) => {
    const resp = await page.goto("/this-route-does-not-exist-xyz", {
      waitUntil: "domcontentloaded",
    });
    expect(resp!.status()).toBe(404);
  });
});

test.describe("responsive layout", () => {
  test("home has no horizontal overflow", async ({ page }) => {
    await gotoAndCheck(page, "/");
    await expectNoHorizontalOverflow(page);
  });

  test("state hub has no horizontal overflow", async ({ page }) => {
    await gotoAndCheck(page, "/state/ca");
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("media integrity", () => {
  test("home images are not broken", async ({ page }) => {
    await gotoAndCheck(page, "/");
    await page.waitForLoadState("load");
    await expectNoBrokenImages(page);
  });
});
