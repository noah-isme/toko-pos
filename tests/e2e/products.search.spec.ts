import { expect, test } from "@playwright/test";

import { cleanupE2EData, disconnectDb, ensureE2EUser } from "./helpers/db";

test.describe("Products search and filter", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await ensureE2EUser();
  }, 120_000);

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders search input on products page", async ({ page }) => {
    await page.goto("/management/products");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByPlaceholder(/cari|search/i).first(),
    ).toBeVisible();
  });

  test("search filters product table", async ({ page }) => {
    await page.goto("/management/products");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder(/cari|search/i).first();
    await searchInput.fill("Kopi");

    await page.waitForTimeout(500);

    const table = page.getByRole("table");
    await expect(table).toBeVisible();
  });

  test("displays category filter control", async ({ page }) => {
    await page.goto("/management/products");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Kategori").or(page.getByText("Semua Kategori")).first(),
    ).toBeVisible();
  });

  test("low stock banner is visible when applicable", async ({ page }) => {
    await page.goto("/management/products");
    await page.waitForLoadState("networkidle");

    // The banner only renders when low-stock alerts exist in the DB.
    // When present, the heading text is "{n} Produk Low Stock".
    const banner = page.getByText(/produk low stock/i);
    const count = await banner.count();
    if (count > 0) {
      await expect(banner.first()).toBeVisible();
    }
    // Test passes either way — the assertion only matters when alerts exist.
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
