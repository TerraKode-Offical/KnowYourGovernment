import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Unit tests live under src/. Playwright E2E specs (e2e/, and the archived
    // copy under documentation/security/**/e2e/) use @playwright/test and must
    // not be collected by Vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "prisma/",
        "**/*.config.*",
        "**/page.tsx",
        "**/layout.tsx",
        "**/route.ts",
        "**/loading.tsx",
        "**/not-found.tsx",
        "**/error.tsx",
      ],
    },
  },
});
