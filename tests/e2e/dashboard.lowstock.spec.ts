// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Dashboard – low stock alerts", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("memicu low-stock setelah penjualan lalu acknowledge dari dashboard", async ({ page }) => {
    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "MANAGER",
      outlet: {
        id: "outlet-1",
        name: "Outlet Pusat",
        code: "MAIN",
        address: "Jl. Melati No.9",
      },
    };

    const product = {
      id: "product-1",
      name: "Sirup Stroberi 1L",
      sku: "SKU-SYR-001",
      barcode: "8998765432100",
      price: 55000,
      categoryId: null,
      category: null,
      supplierId: null,
      supplier: null,
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
    };

    const inventoryByProduct = new Map([[product.id, 6]]);
    let lowStockAlerts = [];
    const recentSales = [];

    const syncLowStockState = () => {
      const quantity = inventoryByProduct.get(product.id) ?? 0;
      const hasAlert = lowStockAlerts.some((alert) => alert.productId === product.id);
      if (product.minStock > 0 && quantity <= product.minStock && !hasAlert) {
        lowStockAlerts = [
          ...lowStockAlerts,
          {
            id: `alert-${Date.now()}`,
            productId: product.id,
            outletId: userOutlet.outlet.id,
            productName: product.name,
            productSku: product.sku,
            outletName: userOutlet.outlet.name,
            quantity,
            minStock: product.minStock,
            triggeredAt: new Date().toISOString(),
            clearedAt: null,
            note: "Simulasi evaluasi stok",
          },
        ];
      }
      if (quantity > product.minStock && hasAlert) {
        lowStockAlerts = lowStockAlerts.filter((alert) => alert.productId !== product.id);
      }
    };

    let activeShift = {
      id: "shift-main",
      outletId: userOutlet.outlet.id,
      userId: "manager-demo",
      openingCash: 100000,
      closingCash: null,
      expectedCash: null,
      difference: null,
      openTime: new Date("2025-10-13T02:00:00.000Z").toISOString(),
      closeTime: null,
      user: { id: "manager-demo", name: "Manajer" },
    };

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => [product],
      "products.categories": () => [],
      "products.suppliers": () => [],
      "settings.listTaxSettings": () => [],
      "products.getInventoryByProduct": () => [
        {
          outletId: userOutlet.outlet.id,
          outletName: userOutlet.outlet.name,
          quantity: inventoryByProduct.get(product.id) ?? 0,
          updatedAt: new Date().toISOString(),
        },
      ],
      "products.getStockMovements": () => [],
      "inventory.listLowStock": ({ input }) => {
        if (input?.outletId !== userOutlet.outlet.id) return [];
        return lowStockAlerts;
      },
      "inventory.setProductMinStock": ({ input }) => {
        if (input.productId === product.id) {
          product.minStock = input.minStock;
          syncLowStockState();
        }
        return { id: product.id, minStock: product.minStock };
      },
      "inventory.acknowledgeLowStock": ({ input }) => {
        lowStockAlerts = lowStockAlerts.filter((alert) => alert.id !== input.alertId);
        return {
          id: input.alertId,
          clearedAt: new Date().toISOString(),
          clearedBy: "manager-demo",
        };
      },
      "cashSessions.getActive": () => activeShift,
      "sales.listRecent": () => recentSales,
      "sales.recordSale": ({ input }) => {
        const items = input?.items ?? [];
        items.forEach((item) => {
          if (item.productId === product.id) {
            const current = inventoryByProduct.get(product.id) ?? 0;
            inventoryByProduct.set(product.id, Math.max(current - item.quantity, 0));
          }
        });
        syncLowStockState();
        const totalNet = items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        const sale = {
          id: `sale-${Date.now()}`,
          receiptNumber: input?.receiptNumber ?? `POS-${Date.now()}`,
          totalNet,
          soldAt: new Date().toISOString(),
          taxAmount: null,
        };
        recentSales.unshift({
          ...sale,
          outletId: userOutlet.outlet.id,
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          status: "COMPLETED",
          items: [],
        });
        return sale;
      },
      "sales.printReceipt": () => ({
        filename: "POS-alert.pdf",
        base64:
          "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=",
      }),
      "sales.getDailySummary": () => ({
        date: new Date().toISOString(),
        totals: {
          totalGross: 0,
          totalDiscount: 0,
          totalNet: 0,
          totalItems: 0,
          totalCash: 0,
          totalTax: 0,
        },
        sales: [],
      }),
    });

    await page.goto("/management/products");
    await expect(
      page.getByRole("heading", { name: "Manajemen Produk" }),
    ).toBeVisible();
    await page
      .locator("tr")
      .filter({ hasText: product.name })
      .getByRole("button", { name: "Set Min Stock" })
      .click();
    const minStockDialog = page.getByRole("dialog");
    await expect(minStockDialog).toBeVisible();
    await minStockDialog.getByLabel("Min Stock").fill("5");
    await minStockDialog.getByRole("button", { name: "Simpan" }).click();
    await expect(minStockDialog).not.toBeVisible();

    await page.goto("/cashier");
    await expect(
      page.getByText("Shift dibuka oleh Manajer", { exact: false }),
    ).toBeVisible();

    await page.getByLabel("Scan / Cari Produk").fill(product.barcode);
    await page.getByRole("button", { name: "Tambah (F1)" }).click();
    await page
      .getByLabel(`Jumlah untuk ${product.name}`)
      .fill("6");
    await page.getByRole("button", { name: "Bayar (F2)" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await page.getByRole("button", { name: /^Tutup$/ }).click();

    await page.goto("/dashboard");
    const widget = page.getByRole("heading", { name: "Alert Stok Rendah" }).locator("..");
    await expect(widget.getByText(product.name)).toBeVisible();
    await expect(
      widget.getByText(`Qty 0 / Min 5`, { exact: false }),
    ).toBeVisible();

    await widget
      .getByRole("button", { name: "Acknowledge alert" })
      .click();
    await expect(widget.getByText("Semua stok aman.")).toBeVisible();
  });
});
