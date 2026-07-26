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

test("cashier page (shift closed)", async ({ page }) => {
  await page.goto("/cashier", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await settle(page);
  await expect(page).toHaveScreenshot("cashier-shift-closed.png", screenshotOptions);
});

test("cashier receipts page", async ({ page }) => {
    await page.goto("/cashier/receipts", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Riwayat Struk")).toBeVisible({ timeout: 10000 });
    await settle(page);
    await expect(page).toHaveScreenshot("cashier-receipts.png", screenshotOptions);
  });
