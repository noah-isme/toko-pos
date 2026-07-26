import { expect, test } from "@playwright/test";

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

test("reports daily summary tab", async ({ page }) => {
  await page.goto("/reports/daily", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Laporan Penjualan" }),
  ).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot(
    "reports-daily-summary.png",
    screenshotOptions,
  );
});
