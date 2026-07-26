import { expect, test } from "@playwright/test";

import { settle, screenshotOptions } from "./helpers";

test.setTimeout(120_000);

test.describe("Public pages (no auth)", () => {
  test("auth login page", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Sistem POS Modern untuk Toko Anda" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("auth-login.png", screenshotOptions);
  });

  test("demo cashier page", async ({ page }) => {
    await page.goto("/demo/cashier", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Kasir" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("demo-cashier.png", screenshotOptions);
  });

  test("demo products page", async ({ page }) => {
    await page.goto("/demo/products", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("demo-products.png", screenshotOptions);
  });

  test("demo reports page", async ({ page }) => {
    await page.goto("/demo/reports", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Laporan Harian" }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("demo-reports.png", screenshotOptions);
  });
});
