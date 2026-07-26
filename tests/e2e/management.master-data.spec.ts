import { expect, test } from "@playwright/test";

import { cleanupE2EData, disconnectDb, ensureE2EUser } from "./helpers/db";

test.describe("Master Data", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await ensureE2EUser();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders master data heading", async ({ page }) => {
    await page.goto("/management/master-data");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Master Data", exact: true }),
    ).toBeVisible();
  });

  test("displays category tab with list", async ({ page }) => {
    await page.goto("/management/master-data");
    await page.waitForLoadState("networkidle");

    const kategoriTab = page.getByRole("tab", { name: "Kategori", exact: true });
    await expect(kategoriTab).toBeVisible();
    await kategoriTab.click();

    // Seeded categories appear in the master list.
    await expect(page.getByText("Minuman").first()).toBeVisible();
    await expect(page.getByText("Makanan Ringan").first()).toBeVisible();
  });

  test("displays supplier tab", async ({ page }) => {
    await page.goto("/management/master-data");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Supplier", exact: true }).click();

    // Seeded suppliers appear in the list and the create form is shown.
    await expect(page.getByText("PT Beras Sejahtera").first()).toBeVisible();
    await expect(page.getByText("Tambah Supplier Baru").first()).toBeVisible();
  });

  test("displays PPN tab", async ({ page }) => {
    await page.goto("/management/master-data");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "PPN", exact: true }).click();

    // Seeded tax rates appear in the list and the create form is shown.
    await expect(page.getByText("PPN 11%").first()).toBeVisible();
    await expect(page.getByText("Tambah Tarif PPN Baru").first()).toBeVisible();
  });

  test("can switch between tabs", async ({ page }) => {
    await page.goto("/management/master-data");
    await page.waitForLoadState("networkidle");

    // Kategori tab (default) — category content visible.
    await page.getByRole("tab", { name: "Kategori", exact: true }).click();
    await expect(page.getByText("Minuman").first()).toBeVisible();
    await expect(page.getByText("Tambah Kategori Baru").first()).toBeVisible();

    // Switch to Supplier — supplier content replaces category content.
    await page.getByRole("tab", { name: "Supplier", exact: true }).click();
    await expect(page.getByText("Tambah Supplier Baru").first()).toBeVisible();
    await expect(page.getByText("Minuman")).toHaveCount(0);

    // Switch to PPN — tax content replaces supplier content.
    await page.getByRole("tab", { name: "PPN", exact: true }).click();
    await expect(page.getByText("Tambah Tarif PPN Baru").first()).toBeVisible();
    await expect(page.getByText("PT Beras Sejahtera")).toHaveCount(0);
  });
});
