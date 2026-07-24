// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "ADMIN",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const baseHandlers = (transferCalls) => ({
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [
    { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
    { id: "outlet-2", name: "Outlet Cabang", code: "OC", address: "Jl. Cabang" },
  ],
  "products.list": () => [
    { id: "product-1", name: "Kopi Botol 250ml", sku: "SKU-01", price: 15000 },
    { id: "product-2", name: "Teh Botol 350ml", sku: "SKU-02", price: 12000 },
  ],
  "outlets.listStockTransfers": ({ input }) => {
    const allTransfers = [
      {
        id: "transfer-1",
        transferNumber: "TRF-001",
        fromOutletId: "outlet-1",
        fromOutletName: "Outlet Pusat",
        toOutletId: "outlet-2",
        toOutletName: "Outlet Cabang",
        productId: "product-1",
        productName: "Kopi Botol 250ml",
        productSku: "SKU-01",
        quantity: 10,
        status: "PENDING",
        requestedByName: "Admin User",
        requestedAt: new Date().toISOString(),
        notes: "Restock cabang",
      },
      {
        id: "transfer-2",
        transferNumber: "TRF-002",
        fromOutletId: "outlet-2",
        fromOutletName: "Outlet Cabang",
        toOutletId: "outlet-1",
        toOutletName: "Outlet Pusat",
        productId: "product-2",
        productName: "Teh Botol 350ml",
        productSku: "SKU-02",
        quantity: 5,
        status: "APPROVED",
        requestedByName: "Admin User",
        requestedAt: new Date().toISOString(),
        approvedByName: "Owner",
        approvedAt: new Date().toISOString(),
      },
    ];
    if (!input?.status || input.status === "ALL") return allTransfers;
    return allTransfers.filter((t) => t.status === input.status);
  },
  "outlets.createStockTransfer": ({ input }) => {
    transferCalls.push(input);
    return { success: true };
  },
  "outlets.approveStockTransfer": ({ input }) => {
    transferCalls.push({ action: "approve", ...input });
    return { success: true };
  },
  "outlets.rejectStockTransfer": ({ input }) => {
    transferCalls.push({ action: "reject", ...input });
    return { success: true };
  },
  "outlets.completeStockTransfer": ({ input }) => {
    transferCalls.push({ action: "complete", ...input });
    return { success: true };
  },
});

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Stock Transfer", () => {
  test("displays list of stock transfers with status badges", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-transfer");

    await expect(page.getByRole("heading", { name: "Stok Antar Outlet" })).toBeVisible();
    // Use table cells to avoid strict mode violations
    await expect(page.getByRole("cell", { name: "TRF-001" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "TRF-002" })).toBeVisible();
    // Check status badges within table rows
    await expect(page.getByRole("table").getByText("Pending").first()).toBeVisible();
    await expect(page.getByRole("table").getByText("Disetujui").first()).toBeVisible();
  });

  test("filters transfers by status", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-transfer");

    // Click Pending tab
    await page.getByRole("button", { name: "Pending" }).click();
    await expect(page.getByRole("cell", { name: "TRF-001" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "TRF-002" })).not.toBeVisible();

    // Click Approved tab
    await page.getByRole("button", { name: "Disetujui" }).click();
    await expect(page.getByRole("cell", { name: "TRF-002" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "TRF-001" })).not.toBeVisible();

    // Click All tab
    await page.getByRole("button", { name: "Semua" }).click();
    await expect(page.getByRole("cell", { name: "TRF-001" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "TRF-002" })).toBeVisible();
  });

  test("opens detail drawer and shows transfer info", async ({ page }) => {
    test.setTimeout(60000);
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-transfer");

    // Click on first transfer row (use table cell to avoid strict mode violation)
    await page.getByRole("cell", { name: "TRF-001" }).click();

    await expect(page.getByText("Transfer TRF-001")).toBeVisible();
    // Use drawer context to narrow down selectors
    const drawer = page.getByLabel("Transfer TRF-001");
    await expect(drawer.locator("text=Outlet Pusat").first()).toBeVisible();
    await expect(drawer.locator("text=Outlet Cabang").first()).toBeVisible();
    await expect(drawer.locator("text=Kopi Botol 250ml").first()).toBeVisible();
    await expect(drawer.locator("text=10 unit").first()).toBeVisible();
    await expect(drawer.locator("text=Restock cabang").first()).toBeVisible();
  });

  test("approves a pending transfer", async ({ page }) => {
    const transferCalls = [];
    await setupTrpcMock(page, baseHandlers(transferCalls));
    await page.goto("/management/stock-transfer");

    // Click on pending transfer
    await page.getByRole("cell", { name: "TRF-001" }).click();

    // Click approve button in drawer
    await page.getByRole("button", { name: "Setujui" }).click();

    await expect(page.getByText("Transfer disetujui")).toBeVisible();
    expect(transferCalls).toHaveLength(1);
    expect(transferCalls[0]).toEqual({ action: "approve", id: "transfer-1" });
  });

  test("rejects a pending transfer", async ({ page }) => {
    const transferCalls = [];
    await setupTrpcMock(page, baseHandlers(transferCalls));
    await page.goto("/management/stock-transfer");

    await page.getByRole("cell", { name: "TRF-001" }).click();
    await page.getByRole("button", { name: "Tolak" }).click();

    await expect(page.getByText("Transfer ditolak")).toBeVisible();
    expect(transferCalls).toHaveLength(1);
    expect(transferCalls[0]).toEqual({ action: "reject", id: "transfer-1" });
  });

  test("completes an approved transfer", async ({ page }) => {
    test.setTimeout(60000);
    const transferCalls = [];
    await setupTrpcMock(page, baseHandlers(transferCalls));
    await page.goto("/management/stock-transfer");

    await page.getByRole("cell", { name: "TRF-002" }).click();
    await page.getByRole("button", { name: "Selesaikan Transfer" }).click();

    await expect(page.getByText("Transfer selesai — stok telah dipindahkan")).toBeVisible();
    expect(transferCalls).toHaveLength(1);
    expect(transferCalls[0]).toEqual({ action: "complete", id: "transfer-2" });
  });

  test("displays create transfer form", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-transfer");

    await page.getByRole("button", { name: "Buat Transfer Stok" }).click();

    await expect(page.getByRole("heading", { name: "Buat Transfer Stok" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Produk" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Dari Outlet" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Ke Outlet" })).toBeVisible();
    await expect(page.getByLabel("Jumlah")).toBeVisible();
    // Use exact match to avoid strict mode violation
    await expect(page.getByRole("button", { name: "Buat Transfer", exact: true })).toBeVisible();
  });

  test("validates required fields on create", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-transfer");

    await page.getByRole("button", { name: "Buat Transfer Stok" }).click();

    // Click submit without filling required fields - should show validation toast
    await page.getByRole("button", { name: "Buat Transfer", exact: true }).click();
    await expect(page.getByText("Pilih produk dan outlet asal/tujuan")).toBeVisible();
  });
});
