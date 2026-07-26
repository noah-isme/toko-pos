import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

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

    const operationalData = {
      todayRevenue: 1500000,
      todayTransactions: 25,
      todayItems: 120,
      shiftStatus: "OPEN",
    };

    const salesChartData = [
      { hour: "08:00", sales: 100000 },
      { hour: "09:00", sales: 250000 },
      { hour: "10:00", sales: 180000 },
      { hour: "11:00", sales: 320000 },
      { hour: "12:00", sales: 450000 },
      { hour: "13:00", sales: 380000 },
      { hour: "14:00", sales: 290000 },
      { hour: "15:00", sales: 210000 },
      { hour: "16:00", sales: 150000 },
      { hour: "17:00", sales: 90000 },
    ];

    const topProductsData = [
      { name: "Kopi Arabica", quantity: 45, revenue: 3825000 },
      { name: "Teh Premium", quantity: 32, revenue: 1440000 },
      { name: "Roti Wholegrain", quantity: 28, revenue: 784000 },
      { name: "Susu Segar", quantity: 22, revenue: 704000 },
      { name: "Apel Fuji", quantity: 18, revenue: 864000 },
    ];

    const alerts = [
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

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      // `input` arrives as `unknown` — one mock map serves procedures with
      // different input shapes, so narrow it at the point of use.
      "cashSessions.getActive": ({ input }) => {
        const { outletId } = (input ?? {}) as { outletId?: string };
        return outletId === activeShift.outletId ? activeShift : null;
      },
      "sales.getDailySummary": () => ({
        date: new Date().toISOString(),
        totals: {
          totalGross: 2000000,
          totalDiscount: 50000,
          totalNet: 1950000,
          totalItems: 120,
          totalCash: 1000000,
          totalTax: 200000,
        },
        sales: [],
      }),
      "sales.listRecent": () => [],
      "inventory.listLowStock": ({ input }) => {
        const { outletId } = (input ?? {}) as { outletId?: string };
        return outletId === userOutlet.outlet.id ? alerts : [];
      },
      "analytics.getSalesTrend": () => salesChartData,
      "analytics.getTopProducts": () => topProductsData,
      "tasks.getCashierTasks": () => ({ tasks: [], alerts: [], shiftActive: true }),
    });
  });

  test("renders dashboard heading and role badge", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible({ timeout: 15000 });

    // The e2e session is ADMIN; the role badge renders next to the heading.
    await expect(page.getByText("ADMIN", { exact: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test("displays quick actions section", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Aksi Cepat" }),
    ).toBeVisible({ timeout: 30000 });

    // Quick action cards are rendered as links to each module.
    await expect(
      page.getByRole("link", { name: /Buka Kasir/ }).first(),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("link", { name: /Kelola Produk/ }).first(),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("link", { name: /Laporan Harian/ }).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test("displays operational overview", async ({ page }) => {
    await page.goto("/dashboard");

    // OperationalOverview renders four metric cards.
    await expect(page.getByText("Pendapatan Hari Ini").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Total Transaksi").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Item Terjual").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Status Shift").first()).toBeVisible({ timeout: 30000 });
  });

  test("renders mini charts section", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Analitik Hari Ini" }),
    ).toBeVisible({ timeout: 30000 });

    // MiniCharts renders two cards: hourly sales and top products.
    await expect(page.getByText("Penjualan Hari Ini").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Produk Terlaris").first()).toBeVisible({ timeout: 30000 });
  });

  test("load data button triggers refetch", async ({ page }) => {
    await page.goto("/dashboard");

    const reloadButton = page
      .getByRole("button", { name: /Load Data/ })
      .first();

    await expect(reloadButton).toBeVisible({ timeout: 30000 });
    await reloadButton.click();

    // After the manual refetch the page stays stable with no error.
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Pendapatan Hari Ini").first()).toBeVisible({ timeout: 30000 });
  });
});