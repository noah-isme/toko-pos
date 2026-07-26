import { expect, test } from "@playwright/test";

import {
  cleanupE2EData,
  createE2EProduct,
  disconnectDb,
  ensureE2EUser,
  getFirstCategory,
  getFirstSupplier,
} from "./helpers/db";

let testProductId = "";
let testProductName = "";

test.describe("Products CRUD", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await ensureE2EUser();
    const category = await getFirstCategory();
    const supplier = await getFirstSupplier();
    const product = await createE2EProduct({
      name: "E2E CRUD Test Product",
      categoryId: category.id,
      supplierId: supplier.id,
      price: 25000,
    });
    testProductId = product.id;
    testProductName = product.name;
  }, 120_000);

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("displays products list with heading", async ({ page }) => {
    await page.goto("/management/products");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("add product page renders form", async ({ page }) => {
    await page.goto("/management/products/add");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Tambah Produk" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Informasi Dasar" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Simpan" }).first(),
    ).toBeVisible();
  });

  test("add product form validates required fields", async ({ page }) => {
    await page.goto("/management/products/add");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Simpan" }).first().click();

    await expect(page.getByText("Nama produk harus diisi")).toBeVisible();
  });

  test("edit page renders pre-populated form", async ({ page }) => {
    await page.goto(`/management/products/edit/${testProductId}`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /Edit Produk/ }),
    ).toBeVisible();

    const nameField = page.getByLabel("Nama Produk");
    await expect(nameField).toHaveValue(testProductName);
  });
});
