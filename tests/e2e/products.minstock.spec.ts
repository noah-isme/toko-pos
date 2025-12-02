// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Manajemen produk – minStock UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("menyetel minStock via form lalu menggunakan filter Low Stock", async ({ page }) => {
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

    const products = new Map([
      [
        "prod-low",
        {
          id: "prod-low",
          name: "Granola 250g",
          sku: "SKU-GRA-001",
          barcode: "8991112223334",
          price: 68000,
          categoryId: null,
          category: "Sereal",
          supplierId: null,
          supplier: "PT Sehat Bersama",
          costPrice: null,
          isActive: true,
          defaultDiscountPercent: 0,
          promoName: null,
          promoPrice: null,
          promoStart: null,
          promoEnd: null,
          isTaxable: false,
          taxRate: null,
          minStock: 0,
        },
      ],
      [
        "prod-safe",
        {
          id: "prod-safe",
          name: "Beras Premium 5kg",
          sku: "SKU-RICE-005",
          barcode: "8995556667778",
          price: 135000,
          categoryId: null,
          category: "Sembako",
          supplierId: null,
          supplier: "PT Pangan Mantap",
          costPrice: null,
          isActive: true,
          defaultDiscountPercent: 0,
          promoName: null,
          promoPrice: null,
          promoStart: null,
          promoEnd: null,
          isTaxable: false,
          taxRate: null,
          minStock: 0,
        },
      ],
    ]);

    const listProducts = () => Array.from(products.values());

    const lowStockAlerts = [
      {
        id: "alert-prod-low",
        productId: "prod-low",
        outletId: userOutlet.outlet.id,
        productName: "Granola 250g",
        productSku: "SKU-GRA-001",
        outletName: userOutlet.outlet.name,
        quantity: 2,
        triggeredAt: new Date("2025-10-12T06:00:00.000Z").toISOString(),
        clearedAt: null,
        note: "Stok menipis di rak depan",
      },
    ];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => listProducts(),
      "products.categories": () => [{ id: "cat-1", name: "Sereal", slug: "sereal", createdAt: "", updatedAt: "" }],
      "products.suppliers": () => [],
      "settings.listTaxSettings": () => [],
      "products.getInventoryByProduct": ({ input }) => {
        const current = products.get(input.productId);
        return current
          ? [
              {
                outletId: userOutlet.outlet.id,
                outletName: userOutlet.outlet.name,
                quantity: current.id === "prod-low" ? 2 : 40,
                updatedAt: new Date().toISOString(),
              },
            ]
          : [];
      },
      "products.getStockMovements": () => [],
      "products.upsert": ({ input }) => {
        if (!input?.id) return { id: "new-product" };
        const existing = products.get(input.id);
        if (existing) {
          products.set(input.id, {
            ...existing,
            name: input.name ?? existing.name,
            sku: input.sku ?? existing.sku,
            barcode: input.barcode ?? existing.barcode,
            price: input.price ?? existing.price,
            categoryId: input.categoryId ?? existing.categoryId,
            supplierId: input.supplierId ?? existing.supplierId,
            minStock: input.minStock ?? existing.minStock,
          });
        }
        return { id: input.id };
      },
      "inventory.listLowStock": () =>
        lowStockAlerts.map((alert) => ({
          ...alert,
          minStock: products.get(alert.productId)?.minStock ?? 0,
        })),
      "inventory.setProductMinStock": ({ input }) => {
        const existing = products.get(input.productId);
        if (existing) {
          existing.minStock = input.minStock;
          products.set(existing.id, existing);
        }
        return { id: input.productId, minStock: input.minStock };
      },
    });

    await page.goto("/management/products");
    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();

    await page
      .locator("tr")
      .filter({ hasText: "Granola 250g" })
      .getByRole("button", { name: "Edit" })
      .click();

    const modal = page.getByRole("dialog");
    await expect(modal.getByLabel("Stok Minimum (minStock)")).toBeVisible();
    await modal.getByLabel("Stok Minimum (minStock)").fill("5");
    await modal.getByRole("button", { name: "Simpan" }).click();
    await expect(modal).not.toBeVisible();

    const lowRow = page.locator("tr").filter({ hasText: "Granola 250g" });
    await expect(lowRow.getByText("Low")).toBeVisible();

    await page
      .getByRole("button", { name: "Tampilkan hanya yang Low Stock" })
      .click();

    await expect(page.locator("tr").filter({ hasText: "Granola 250g" })).toBeVisible();
    await expect(page.locator("tr").filter({ hasText: "Beras Premium 5kg" })).toHaveCount(0);
  });
});
