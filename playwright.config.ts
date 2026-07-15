import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "5000";
const usesRealVisualAuth = process.env.PLAYWRIGHT_VISUAL_AUTH === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  // Keep visual baselines OS-independent in the filename so CI (Linux) and local
  // runs resolve the same file; pixel diffs across platforms are absorbed by the
  // maxDiffPixelRatio tolerance below.
  snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // Small tolerance for font anti-aliasing / sub-pixel rendering jitter.
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "dot" : "list",
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
  webServer: {
    command: `pnpm exec next dev --turbopack --hostname 0.0.0.0 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Authenticated visual tests must start their own server with the E2E
    // session bypass disabled. Reusing a regular dev server would silently
    // render the fixed E2E user instead of the admin account used by the test.
    reuseExistingServer: !process.env.CI && !usesRealVisualAuth,
    timeout: 120 * 1000,
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret",
      NEXT_PUBLIC_E2E: usesRealVisualAuth ? "false" : "true",
      NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
      // Only forward DATABASE_URL when the environment (e.g. CI) actually sets
      // it. Locally we must NOT inject a localhost fallback here: keys listed in
      // webServer.env override the dev server's own .env/.env.local loading, so
      // a bogus fallback would point auth/tRPC at a non-existent DB and every
      // real-credential flow (login, shifts, sales) would 401/500.
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
    },
  },
});
