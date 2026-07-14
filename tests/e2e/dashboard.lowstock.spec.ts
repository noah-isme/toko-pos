// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Dashboard – low stock alerts", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("menampilkan alert stok rendah dan menautkan ke daftar produk terfilter", async ({
    page,
  }) => {
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

    const lowStockAlerts = [
      {
        id: "alert-1",
        productId: "product-1",
        outletId: userOutlet.outlet.id,
        productName: "Sirup Stroberi 1L",
        productSku: "SKU-SYR-001",
        outletName: userOutlet.outlet.name,
        quantity: 0,
        minStock: 5,
        triggeredAt: new Date().toISOString(),
        clearedAt: null,
        note: null,
      },
    ];

    const activeShift = {
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
      "cashSessions.getActive": ({ input }) =>
        input?.outletId === activeShift.outletId ? activeShift : null,
      "inventory.listLowStock": ({ input }) =>
        input?.outletId === userOutlet.outlet.id ? lowStockAlerts : [],
      "sales.listRecent": () => [],
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

    await page.goto("/dashboard");

    // The low-stock alert surfaces in the "Perlu Perhatian" section.
    const alertsSection = page
      .locator("section")
      .filter({ hasText: "Perlu Perhatian" });
    const lowStockCard = alertsSection
      .getByText("Stok Hampir Habis")
      .locator("xpath=ancestor::a[1]");
    await expect(lowStockCard).toBeVisible();
    await expect(alertsSection.getByText("1 item")).toBeVisible();

    // The card links to the low-stock-filtered product list.
    await expect(lowStockCard).toHaveAttribute(
      "href",
      "/management/products?filter=low-stock",
    );
  });

  test("tidak menampilkan alert saat semua stok aman", async ({ page }) => {
    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "MANAGER",
      outlet: { id: "outlet-1", name: "Outlet Pusat", code: "MAIN" },
    };

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "cashSessions.getActive": () => null,
      "inventory.listLowStock": () => [],
      "sales.listRecent": () => [],
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

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Stok Hampir Habis")).toHaveCount(0);
  });
});
