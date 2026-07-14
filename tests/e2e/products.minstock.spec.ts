// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Manajemen produk – low stock", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("menandai produk low-stock dan memfilter tabel lewat banner", async ({
    page,
  }) => {
    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "ADMIN",
      outlet: {
        id: "outlet-1",
        name: "Outlet Barat",
        code: "WEST",
        address: "Jl. Mawar No.5",
      },
    };

    const productLow = {
      id: "prod-low",
      name: "Granola 250g",
      sku: "SKU-GRA-001",
      barcode: "8991112223334",
      price: 68000,
      category: "Sereal",
      supplier: "PT Sehat Bersama",
      isActive: true,
      defaultDiscountPercent: 0,
      isTaxable: false,
      minStock: 5,
    };
    const productSafe = {
      id: "prod-safe",
      name: "Beras Premium 5kg",
      sku: "SKU-RICE-005",
      barcode: "8995556667778",
      price: 135000,
      category: "Sembako",
      supplier: "PT Pangan Mantap",
      isActive: true,
      defaultDiscountPercent: 0,
      isTaxable: false,
      minStock: 10,
    };

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => [productLow, productSafe],
      "products.categories": () => [
        { id: "cat-1", name: "Sereal", slug: "sereal", createdAt: "", updatedAt: "" },
      ],
      "products.suppliers": () => [],
      "inventory.getAllInventory": () => [
        { productId: "prod-low", quantity: 2 },
        { productId: "prod-safe", quantity: 40 },
      ],
      "inventory.listLowStock": ({ input }) =>
        input?.outletId === userOutlet.outlet.id
          ? [
              {
                id: "alert-prod-low",
                productId: "prod-low",
                outletId: userOutlet.outlet.id,
                productName: productLow.name,
                productSku: productLow.sku,
                outletName: userOutlet.outlet.name,
                quantity: 2,
                minStock: 5,
                triggeredAt: new Date("2025-10-12T06:00:00.000Z").toISOString(),
                clearedAt: null,
                note: null,
              },
            ]
          : [],
    });

    await page.goto("/management/products");
    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();

    // The low-stock banner reports the count and both products are listed.
    await expect(page.getByText("1 Produk Low Stock")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Granola 250g" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Beras Premium 5kg" }),
    ).toBeVisible();

    // The low-stock row carries a "Low Stock" badge.
    const lowRow = page.getByRole("row").filter({ hasText: "Granola 250g" });
    await expect(lowRow.getByText("Low Stock")).toBeVisible();

    // "Lihat Semua" applies the low-stock filter -> only the low product remains.
    await page.getByRole("button", { name: "Lihat Semua" }).click();
    await expect(
      page.getByRole("cell", { name: "Granola 250g" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Beras Premium 5kg" }),
    ).toHaveCount(0);
  });
});
