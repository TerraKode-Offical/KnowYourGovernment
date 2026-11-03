import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { gotoAndCheck } from "./helpers";

// ─────────────────────────────────────────────
// Automated accessibility checks (WCAG 2 A/AA) + keyboard basics.
// ─────────────────────────────────────────────

const A11Y_ROUTES = ["/", "/bills", "/state/ca", "/local", "/judicial"];

test.describe("accessibility (axe)", () => {
  for (const path of A11Y_ROUTES) {
    test(`no critical axe violations on ${path}`, async ({ page }, testInfo) => {
      await gotoAndCheck(page, path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const byImpact = (impact: string) =>
        results.violations.filter((v) => v.impact === impact);

      // Record all findings as annotations for the report.
      for (const v of results.violations) {
        testInfo.annotations.push({
          type: `axe-${v.impact}`,
          description: `${v.id}: ${v.help} (${v.nodes.length} nodes)`,
        });
      }

      expect(
        byImpact("critical"),
        `critical axe violations: ${byImpact("critical").map((v) => v.id).join(", ")}`
      ).toEqual([]);
    });
  }
});

test.describe("keyboard & landmarks", () => {
  test("skip link is focusable and targets main content", async ({
    page,
    browserName,
  }) => {
    // WebKit/Safari does not Tab-focus links unless the OS "full keyboard
    // access" setting is enabled; that is a browser limitation, not a defect.
    test.skip(browserName === "webkit", "WebKit does not Tab-focus links by default");
    await gotoAndCheck(page, "/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#main-content");
    expect(await page.locator("#main-content").count()).toBe(1);
  });

  test("page exposes banner, main and contentinfo landmarks", async ({ page }) => {
    await gotoAndCheck(page, "/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("primary nav is labelled", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop nav is hidden on mobile viewports");
    await gotoAndCheck(page, "/");
    await expect(
      page.getByRole("navigation", { name: /main navigation/i })
    ).toBeVisible();
  });
});
