// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "ADMIN",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const baseHandlers = {
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [
    { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
    { id: "outlet-2", name: "Outlet Cabang", code: "OC", address: "Jl. Cabang" },
  ],
  "analytics.getKpiSummary": () => ({
    totalSales: { current: 5000000, previous: 4500000, trend: { value: 11.1, direction: "up" } },
    totalTransactions: { current: 150, previous: 130, trend: { value: 15.4, direction: "up" } },
    itemsSold: { current: 400, previous: 350, trend: { value: 14.3, direction: "up" } },
    averageTransactionValue: { current: 33333, previous: 34615, trend: { value: -3.7, direction: "down" } },
  }),
  "analytics.getSalesTrend": () =>
    Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
      sales: Math.floor(Math.random() * 1000000) + 200000,
      transactions: Math.floor(Math.random() * 30) + 10,
      items: Math.floor(Math.random() * 80) + 20,
    })),
  "analytics.getTopProducts": () => [
    { productId: "product-1", productName: "Kopi Botol 250ml", quantity: 120, revenue: 1800000 },
  ],
  "analytics.getShiftActivity": () => [],
};

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Reports & Analytics", () => {
  test("displays the reports page heading", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/reports");

    await expect(page.getByRole("heading", { name: "Laporan & Analitik" })).toBeVisible();
  });

  test("displays KPI section", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/reports");

    await expect(page.getByText("Total Penjualan").first()).toBeVisible();
    await expect(page.getByText("Total Transaksi").first()).toBeVisible();
  });

  test("displays charts section", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/reports");

    await expect(page.getByText("Grafik Penjualan").first()).toBeVisible();
  });

  test("displays top products section", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/reports");

    await expect(page.getByText("Item Terlaris").first()).toBeVisible();
  });
});
