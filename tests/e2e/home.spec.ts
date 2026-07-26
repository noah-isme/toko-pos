import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("renders greeting and KPI summary", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows quick action CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Buka Kasir" }).first()).toBeVisible({ timeout: 30000 });
  });

  test("renders module navigation cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Kasir").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Produk").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Laporan").first()).toBeVisible({ timeout: 30000 });
  });
});