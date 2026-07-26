import { expect, test } from "@playwright/test";

import { cleanupE2EData, disconnectDb, ensureE2EUser } from "./helpers/db";

test.describe("Stock Opname wizard", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await ensureE2EUser();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders stock opname heading and start button", async ({ page }) => {
    await page.goto("/management/stock-opname");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Stock Opname" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /mulai opname/i }),
    ).toBeVisible();
  });
});

test.describe("Receiving flow", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await ensureE2EUser();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders receiving form with all sections", async ({ page }) => {
    await page.goto("/management/receiving");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Penerimaan Barang" }),
    ).toBeVisible();
    await expect(page.getByText("Detail Penerimaan").first()).toBeVisible();
    await expect(page.getByText("Item Diterima").first()).toBeVisible();
  });

  test("submit button is disabled without outlet selection", async ({ page }) => {
    await page.goto("/management/receiving");
    await page.waitForLoadState("networkidle");

    const submitBtn = page.getByRole("button", { name: /catat penerimaan/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("shows empty state when no items added", async ({ page }) => {
    await page.goto("/management/receiving");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/belum ada item/i)).toBeVisible();
  });
});

test.describe("Promotions flow", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await ensureE2EUser();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders promotions page with sections", async ({ page }) => {
    await page.goto("/management/promotions");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Dynamic Promotion Engine" }),
    ).toBeVisible();
  });

  test("displays promotion creation form", async ({ page }) => {
    await page.goto("/management/promotions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/nama promo|promotion name/i).first()).toBeVisible();
    await expect(
      page.getByRole("combobox").first(),
    ).toBeVisible();
  });

  test("displays promotion usage dashboard section", async ({ page }) => {
    await page.goto("/management/promotions");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/promotion usage dashboard/i),
    ).toBeVisible();
  });
});
