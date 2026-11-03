import { test, expect } from "@playwright/test";
import { gotoAndCheck, collectConsole } from "./helpers";

// ─────────────────────────────────────────────
// User journeys: cookie persistence, navigation, forms.
// All interactions are non-destructive (no valid subscriber created,
// no real email sent, no records written).
// ─────────────────────────────────────────────

test.describe("selected-state cookie persistence", () => {
  test("header state links honour the selected-state cookie", async ({
    page,
    isMobile,
    baseURL,
  }) => {
    test.skip(isMobile, "desktop nav is hidden on mobile viewports");
    await page.context().addCookies([
      { name: "selected-state", value: "CA", url: baseURL! },
    ]);
    const console_ = await collectConsole(page);
    await gotoAndCheck(page, "/");

    const billsLink = page
      .getByRole("navigation", { name: /main navigation/i })
      .getByRole("link", { name: "Bills" });
    await expect(billsLink).toHaveAttribute("href", "/state/CA/bills");

    // Cookie survives navigation.
    await billsLink.click();
    await page.waitForURL(/\/state\/CA\/bills/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "selected-state")?.value).toBe("CA");
    expect(console_.errors).toEqual([]);
  });

  test("without a cookie, state links point to the home map anchor", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "desktop nav is hidden on mobile viewports");
    await gotoAndCheck(page, "/");
    const billsLink = page
      .getByRole("navigation", { name: /main navigation/i })
      .getByRole("link", { name: "Bills" });
    await expect(billsLink).toHaveAttribute("href", "/#select-state");
  });
});

test.describe("navigation", () => {
  test("desktop nav reaches all primary sections", async ({ page, isMobile }) => {
    test.skip(isMobile, "mobile uses a drawer");
    await gotoAndCheck(page, "/");
    const nav = page.getByRole("navigation", { name: /main navigation/i });
    // Non-state-scoped sections have fixed hrefs.
    for (const [name, href] of [
      ["Home", "/"],
      ["PAC Tracker", "/pac-recipients"],
      ["Local", "/local"],
      ["About", "/about"],
    ] as const) {
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
        "href",
        href
      );
    }
    // State-scoped sections resolve dynamically (state cookie or home anchor).
    for (const name of ["Bills", "Elections", "Voter Info"]) {
      const href = await nav.getByRole("link", { name, exact: true }).getAttribute("href");
      expect(href, `${name} href`).toMatch(
        /^(\/#select-state|\/state\/[A-Z]{2}\/(bills|elections|voter-info))$/
      );
    }
  });

  test("mobile menu opens and exposes navigation", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile-only behaviour");
    await gotoAndCheck(page, "/");
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("dialog", { name: /mobile navigation/i })
    ).toBeVisible();
  });
});

test.describe("subscribe form (client-side validation only)", () => {
  test("rejects an invalid email without issuing a network request", async ({
    page,
  }) => {
    await gotoAndCheck(page, "/");
    // Trigger the bottom bar via scroll (30s timer is too slow to wait on).
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bar = page.getByRole("complementary", { name: /email subscription/i });

    // The bar may not appear for a dismissed cookie; only assert if visible.
    if (!(await bar.isVisible().catch(() => false))) {
      test.skip(true, "subscription bar did not appear (dismissed or delayed)");
    }

    let posted = false;
    await page.route("**/api/subscribe", (route) => {
      posted = true;
      route.abort();
    });

    const input = bar.getByRole("textbox", { name: /email address/i });
    await input.fill("not-an-email");
    // The input is type=email, so the browser's constraint validation blocks
    // submission before React's onSubmit runs — no request should be made.
    expect(await input.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(
      false
    );
    await bar.getByRole("button", { name: /subscribe/i }).click();
    expect(posted, "client should validate before POSTing").toBe(false);
  });
});

test.describe("structured-data target", () => {
  test("JSON-LD advertised /search route resolves (F-8)", async ({ page }) => {
    // The site-wide SearchAction targets /search?q=..., which now exists.
    const resp = await page.goto("/search?q=california", {
      waitUntil: "domcontentloaded",
    });
    expect(resp!.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: /search/i })
    ).toBeVisible();
  });
});
