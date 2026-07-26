import { expect, test } from "@playwright/test";

import { cleanupE2EData, disconnectDb, ensureE2EUser } from "./helpers/db";

test.describe("Owner Dashboard", () => {
  // Set per-test timeout; beforeAll hook timeout uses the project's timeout.
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await ensureE2EUser();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders owner dashboard heading", async ({ page }) => {
    await page.goto("/dashboard/owner");

    await expect(
      page.getByRole("heading", { name: "Dashboard Owner", level: 1 }),
    ).toBeVisible();
  });

  test("displays KPI section", async ({ page }) => {
    await page.goto("/dashboard/owner");

    // KPI cards or error banner — either confirms the section rendered.
    await expect(
      page.getByText("Total Penjualan"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("displays outlet filter", async ({ page }) => {
    await page.goto("/dashboard/owner");

    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("renders charts section", async ({ page }) => {
    await page.goto("/dashboard/owner");

    // Chart titles render after data loads; give them extra time.
    await expect(
      page.getByText("Penjualan Harian"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("renders outlet performance section", async ({ page }) => {
    await page.goto("/dashboard/owner");

    await expect(
      page.getByText("Performa Outlet"),
    ).toBeVisible({ timeout: 15000 });
  });
});
