import { defineConfig, devices } from "@playwright/test";

import { e2eAuthSecret } from "./tests/e2e/helpers/test-secret";

const PORT = process.env.PORT ?? "3000";
const usesRealVisualAuth = process.env.PLAYWRIGHT_VISUAL_AUTH === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  // Visual specs must run against a server with the session bypass OFF, so they
  // are excluded from the default suite. Screenshotting under the bypass would
  // render the fixed "Kasir Uji" user (src/server/auth.ts) instead of the admin
  // the specs authenticate as, silently producing wrong baselines.
  testIgnore: usesRealVisualAuth ? undefined : "**/visual/**",
  snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // ~921px on a 1280x720 frame. Enough for font anti-aliasing jitter, tight
      // enough that a changed badge or table cell still fails; the previous 0.01
      // allowed 9,216px, which hid whole components.
      maxDiffPixelRatio: 0.001,
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
    // The UI formats dates and currency through Intl and date-fns, both of which
    // read the ambient locale/timezone. Unpinned, a CI runner on UTC renders
    // different text than baselines recorded in WIB.
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec next start --hostname 0.0.0.0 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse a running server for visual runs. A dev server started
    // normally has the E2E bypass on and a different NEXTAUTH_SECRET, so the
    // JWT the visual helpers mint would not verify and the pages would render
    // as the wrong user (or redirect to login).
    reuseExistingServer: !process.env.CI && !usesRealVisualAuth,
    timeout: 120_000,
    env: {
      NEXTAUTH_SECRET: e2eAuthSecret(),
      NEXT_PUBLIC_E2E: usesRealVisualAuth ? "false" : "true",
      NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
      // Only forward DATABASE_URL when the environment actually sets it. Keys
      // listed here override the server's own .env loading, so a localhost
      // fallback would point auth/tRPC at a non-existent DB.
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
    },
  },
});
