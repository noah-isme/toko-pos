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

test.describe("Dashboard pages", () => {
  test("dashboard admin", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-dashboard.png", screenshotOptions);
  });

  test("dashboard owner", async ({ page }) => {
    await page.goto("/dashboard/owner", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Dashboard Owner" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-dashboard-owner.png", screenshotOptions);
  });
});

test.describe("Management pages", () => {
  test("products list", async ({ page }) => {
    await page.goto("/management/products", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-products.png", screenshotOptions);
  });

  test("products add form", async ({ page }) => {
    await page.goto("/management/products/add", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Tambah Produk" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-products-add.png", screenshotOptions);
  });

  test("promotions", async ({ page }) => {
    await page.goto("/management/promotions", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Dynamic Promotion Engine" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-promotions.png", screenshotOptions);
  });

  test("receiving", async ({ page }) => {
    await page.goto("/management/receiving", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Penerimaan Barang" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-receiving.png", screenshotOptions);
  });

  test("reports analytics", async ({ page }) => {
    await page.goto("/management/reports", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Laporan & Analitik" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-reports.png", screenshotOptions);
  });

  test("settings", async ({ page }) => {
    await page.goto("/management/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pengaturan", exact: true })).toBeVisible({ timeout: 60000 });
    // Wait for tax settings to load - check for active tax summary
    await expect(page.getByText("PPN Aktif Saat Ini")).toBeVisible({ timeout: 60000 });
    await settle(page);
    await expect(page).toHaveScreenshot("admin-settings.png", screenshotOptions);
  });

  test("stock management", async ({ page }) => {
    await page.goto("/management/stock", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Manajemen Stok" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-stock.png", screenshotOptions);
  });

  test("stock movement", async ({ page }) => {
    await page.goto("/management/stock-movement", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Pergerakan Stok" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(
      "admin-stock-movement.png",
      screenshotOptions,
    );
  });

  test("stock opname", async ({ page }) => {
    await page.goto("/management/stock-opname", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Stock Opname" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-stock-opname.png", screenshotOptions);
  });

  test("stock transfer", async ({ page }) => {
    await page.goto("/management/stock-transfer", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Stok Antar Outlet" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(
      "admin-stock-transfer.png",
      screenshotOptions,
    );
  });

  test("shift history", async ({ page }) => {
    await page.goto("/management/shift-history", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Riwayat Shift" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(
      "admin-shift-history.png",
      screenshotOptions,
    );
  });

  test("users", async ({ page }) => {
    await page.goto("/management/users", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Daftar Pengguna" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-users.png", screenshotOptions);
  });

  test("master data", async ({ page }) => {
    await page.goto("/management/master-data", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Master Data" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-master-data.png", screenshotOptions);
  });

  test("audit log", async ({ page }) => {
    await page.goto("/management/audit-log", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Riwayat Aktivitas Sistem" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("admin-audit-log.png", screenshotOptions);
  });
});
