import { expect, test } from "./fixtures";

import {
  authenticateAsAdmin,
  mockStableData,
  settle,
  screenshotOptions,
} from "./helpers";

test.skip(
  process.env.PLAYWRIGHT_VISUAL_AUTH !== "true",
  "Jalankan melalui pnpm run test:e2e:visual agar bypass sesi dimatikan.",
);
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await mockStableData(page);
  await authenticateAsAdmin(page);
});

test("home page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await settle(page);
  await expect(page).toHaveScreenshot("home-page.png", screenshotOptions);
});
