import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const usesRealVisualAuth = process.env.PLAYWRIGHT_VISUAL_AUTH === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? "dot" : "list",
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer — the app must be running externally (production build).
  // Set PLAYWRIGHT_VISUAL_AUTH=true to disable the E2E session bypass for
  // visual tests that need real JWT auth.
  ...(usesRealVisualAuth
    ? {
        webServer: {
          command: `pnpm exec next start --hostname 0.0.0.0 --port ${PORT}`,
          url: `http://127.0.0.1:${PORT}`,
          reuseExistingServer: true,
          timeout: 30 * 1000,
          env: {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret",
            NEXT_PUBLIC_E2E: "false",
            NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
            ...(process.env.DATABASE_URL
              ? { DATABASE_URL: process.env.DATABASE_URL }
              : {}),
          },
        },
      }
    : {}),
});
