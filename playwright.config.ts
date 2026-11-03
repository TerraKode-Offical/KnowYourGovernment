import { defineConfig, devices } from "@playwright/test";

// ─────────────────────────────────────────────
// InformedVoter E2E configuration
//
// Default target is the operator-authorized live site. Override with:
//   $env:E2E_BASE_URL = "https://staging.example"   (PowerShell)
//
// Tests are split into two classes:
//   - UI specs (smoke/headers/journeys/a11y) run on the full browser matrix.
//   - API specs (api.spec.ts) run once on Chromium to respect live rate limits.
// ─────────────────────────────────────────────

const baseURL = process.env.E2E_BASE_URL ?? "https://knowyourgov.us";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ["list"],
    ["json", { outputFile: "e2e-artifacts/results.json" }],
    ["html", { outputFolder: "e2e-artifacts/html", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /api\.spec\.ts/,
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: /api\.spec\.ts/,
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /api\.spec\.ts/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testIgnore: /api\.spec\.ts/,
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      testIgnore: /api\.spec\.ts/,
    },
    {
      name: "api",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /api\.spec\.ts/,
    },
  ],
});
