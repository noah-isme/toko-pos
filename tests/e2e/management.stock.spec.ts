import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Stock Management Pages", () => {
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

    const stockSnapshot = [
      {
        productId: "product-1",
        productName: "Kopi Arabica",
        sku: "SKU-001",
        quantity: 54,
        minStock: 24,
        outletName: "Outlet Pusat",
      },
    ];

    const stockMovements = [
      {
        id: "move-1",
        type: "INITIAL",
        quantity: 60,
        reference: "GRN-001",
        note: "Initial delivery",
        occurredAt: "2025-10-10T02:00:00.000Z",
        outletName: "Outlet Pusat",
        productName: "Kopi Arabica",
      },
      {
        id: "move-2",
        type: "SALE",
        quantity: -6,
        reference: "POS-001",
        note: "Sold via POS",
        occurredAt: "2025-10-13T03:20:00.000Z",
        outletName: "Outlet Pusat",
        productName: "Kopi Arabica",
      },
    ];

    const cashSessions = [
      {
        id: "session-1",
        outletId: "outlet-1",
        outletName: "Outlet Pusat",
        userName: "Kasir Demo",
        openingCash: 200000,
        closingCash: 215000,
        expectedCash: 220000,
        difference: -5000,
        openTime: "2025-10-13T01:55:00.000Z",
        closeTime: "2025-10-13T14:05:00.000Z",
        status: "CLOSED",
      },
    ];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "outlets.getStockSnapshot": () => stockSnapshot,
      "outlets.listStockTransfers": () => [],
      "cashSessions.getActive": () => null,
      "cashSessions.list": () => cashSessions,
      "inventory.getAllInventory": () => stockSnapshot,
      "products.getStockMovements": () => stockMovements,
    });
  });

  test("stock management page renders heading and action cards", async ({
    page,
  }) => {
    await page.goto("/management/stock");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Manajemen Stok" }),
    ).toBeVisible();
    await expect(page.getByText("Penyesuaian Cepat").first()).toBeVisible();
    await expect(page.getByText("Transfer Antar Outlet").first()).toBeVisible();
  });

  test("stock movement page renders heading and filters", async ({ page }) => {
    await page.goto("/management/stock-movement");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Pergerakan Stok" }),
    ).toBeVisible();
    await expect(page.getByLabel("Produk").first()).toBeVisible();
    await expect(page.getByLabel("Outlet").first()).toBeVisible();
    await expect(page.getByLabel("Jenis").first()).toBeVisible();
    await expect(page.getByLabel("Tanggal").first()).toBeVisible();
  });

  test("shift history page renders heading and table", async ({ page }) => {
    await page.goto("/management/shift-history");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Riwayat Shift" }),
    ).toBeVisible();

    // The sessions query is gated behind an outlet selection. Select the first
    // outlet (ordered by name asc — same outlet the seeded session belongs to)
    // so the desktop table renders.
    await page
      .getByRole("combobox")
      .filter({ hasText: "Pilih outlet" })
      .click();
    await page.getByRole("option").first().click();

    await expect(page.getByRole("table")).toBeVisible();
  });
});