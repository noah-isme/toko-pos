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
  "users.list": () => [
    { id: "user-1", name: "Admin User", email: "admin@example.com", role: "ADMIN" },
    { id: "user-2", name: "Cashier User", email: "cashier@example.com", role: "CASHIER" },
  ],
  "analytics.getActivityLog": ({ input }) => {
    const allActivities = [
      {
        id: "act-1",
        timestamp: new Date().toISOString(),
        type: "SALE_RECORD",
        userId: "user-1",
        user: "Admin User",
        outletId: "outlet-1",
        outlet: "Outlet Pusat",
        entity: "SALE",
        entityId: "sale-123",
        description: "Transaksi TRX-001 dicatat",
        metadata: { receiptNumber: "TRX-001", totalNet: 15000 },
      },
      {
        id: "act-2",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: "SHIFT_OPEN",
        userId: "user-2",
        user: "Cashier User",
        outletId: "outlet-1",
        outlet: "Outlet Pusat",
        entity: "CASH_SESSION",
        entityId: "shift-456",
        description: "Shift dibuka dengan kas awal Rp 100.000",
        metadata: { openingCash: 100000 },
      },
      {
        id: "act-3",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: "LOW_STOCK_TRIGGER",
        userId: null,
        user: "System",
        outletId: "outlet-1",
        outlet: "Outlet Pusat",
        entity: "LOW_STOCK_ALERT",
        entityId: "alert-789",
        description: "Stok rendah: Kopi Botol 250ml (5 unit)",
        metadata: { productId: "product-1", currentStock: 5 },
      },
    ];

    let filtered = allActivities;
    if (input?.outletId) {
      filtered = filtered.filter((a) => a.outletId === input.outletId);
    }
    if (input?.userId) {
      filtered = filtered.filter((a) => a.userId === input.userId);
    }
    if (input?.action) {
      filtered = filtered.filter((a) => a.type === input.action);
    }
    if (input?.dateRange?.from) {
      filtered = filtered.filter((a) => new Date(a.timestamp) >= new Date(input.dateRange.from));
    }
    if (input?.dateRange?.to) {
      filtered = filtered.filter((a) => new Date(a.timestamp) <= new Date(input.dateRange.to));
    }

    return {
      activities: filtered.slice(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 25)),
      total: filtered.length,
      hasMore: filtered.length > (input?.offset ?? 0) + (input?.limit ?? 25),
    };
  },
};

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Audit Log", () => {
  test("displays activity log with data", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/audit-log");

    await expect(page.getByRole("heading", { name: "Riwayat Aktivitas Sistem" })).toBeVisible();

    // Scope to the log table. The header's outlet switcher renders the same
    // outlet name inside a <select> option, which Playwright reports as
    // hidden, so an unscoped .first() resolves to that instead of the row.
    const table = page.getByRole("table");
    await expect(table.getByText("SALE_RECORD").first()).toBeVisible();
    await expect(table.getByText("SHIFT_OPEN").first()).toBeVisible();
    await expect(table.getByText("LOW_STOCK_TRIGGER").first()).toBeVisible();
    await expect(table.getByText("Admin User").first()).toBeVisible();
    await expect(table.getByText("Cashier User").first()).toBeVisible();
    await expect(table.getByText("Outlet Pusat").first()).toBeVisible();
  });

  test("opens filter dialog", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/audit-log");

    await page.getByRole("button", { name: /Filter/ }).click();
    await expect(page.getByRole("heading", { name: "Filter Log Audit" })).toBeVisible();
  });

  test("opens detail dialog for activity with metadata", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/audit-log");

    // Click "Lihat" on first activity
    await page.getByRole("button", { name: "Lihat" }).first().click();

    await expect(page.getByRole("heading", { name: "Detail Entri Audit" })).toBeVisible();

    // Scope to the dialog, for the same reason as above.
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("SALE_RECORD").first()).toBeVisible();
    await expect(dialog.getByText("Admin User").first()).toBeVisible();
    await expect(dialog.getByText("Outlet Pusat").first()).toBeVisible();
    await expect(dialog.getByText("SALE").first()).toBeVisible();
    await expect(dialog.getByText("sale-123")).toBeVisible();
  });

  test("refresh button shows feedback", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/audit-log");

    await page.getByRole("button", { name: /Segarkan/ }).click();
    await expect(page.getByText("Log audit diperbarui")).toBeVisible();
  });

  test("shows pagination info", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/audit-log");

    await expect(page.getByText(/Menampilkan 1–3 dari 3 entri/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
  });

  test("displays empty state when no activities", async ({ page }) => {
    await setupTrpcMock(page, {
      ...baseHandlers,
      "analytics.getActivityLog": () => ({
        activities: [],
        total: 0,
        hasMore: false,
      }),
    });
    await page.goto("/management/audit-log");

    await expect(page.getByText("Tidak ada entri log audit").first()).toBeVisible();
  });
});
