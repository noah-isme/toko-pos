// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "CASHIER",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const product = {
  id: "product-1",
  name: "Kopi Botol 250ml",
  sku: "SKU-01",
  barcode: "8999991234567",
  price: 15000,
  categoryName: null,
};

// A shift that is already active, so the cashier page doesn't prompt to open one.
const activeShift = {
  id: "shift-1",
  outletId: "outlet-1",
  userId: "cashier-demo",
  openingCash: 100000,
  closingCash: null,
  expectedCash: null,
  difference: null,
  openTime: new Date("2025-10-13T01:00:00.000Z").toISOString(),
  closeTime: null,
  user: { id: "cashier-demo", name: "Kasir Demo" },
};

const baseHandlers = (recordSaleCalls) => ({
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [userOutlet.outlet],
  "products.list": () => [product],
  "products.searchProducts": ({ input }) => {
    const q = String(input?.query ?? "").toLowerCase();
    return [product].filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q),
    );
  },
  "promotions.list": () => [],
  "tasks.getCashierTasks": () => ({ tasks: [], alerts: [], shiftActive: true }),
  "sales.listRecent": () => [],
  "cashSessions.getActive": ({ input }) =>
    input?.outletId === activeShift.outletId ? activeShift : null,
  "sales.recordSale": ({ input }) => {
    recordSaleCalls.push(input);
    return {
      id: "sale-123",
      receiptNumber: "TRX-0001",
      totalNet: product.price,
      soldAt: new Date().toISOString(),
      taxAmount: null,
      promotionDiscount: 0,
      promotions: [],
    };
  },
});

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("cashier-quick-mode", "false");
  });
});

test.describe("Kasir", () => {
  test("records a cash sale with the correct payload", async ({ page }) => {
    const recordSaleCalls = [];
    await setupTrpcMock(page, baseHandlers(recordSaleCalls));

    await page.goto("/cashier");

    // Add the product via the search autocomplete.
    await page
      .getByPlaceholder("Ketik nama, SKU, atau scan barcode...")
      .fill("Kopi");
    await page.getByRole("button", { name: /Kopi Botol 250ml/ }).click();
    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();

    // Pay with cash.
    await page.keyboard.press("F2");
    await page.getByRole("button", { name: /Tunai/ }).click();
    await expect(
      page.getByRole("heading", { name: "Pembayaran Tunai" }),
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("20000");
    await page.getByRole("button", { name: /Bayar Sekarang/ }).click();

    await expect(
      page.getByRole("dialog").filter({ hasText: "No. Struk:" }).getByText(/No\. Struk:/),
    ).toBeVisible();

    // Verify the sale payload the cashier sent to the server.
    expect(recordSaleCalls).toHaveLength(1);
    const payload = recordSaleCalls[0];
    expect(payload.outletId).toBe("outlet-1");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe(product.id);
    expect(payload.items[0].quantity).toBe(1);
    expect(payload.payments[0].method).toBe("CASH");
  });

  test("QRIS selection reaches the QRIS payment screen", async ({ page }) => {
    const recordSaleCalls = [];
    await setupTrpcMock(page, baseHandlers(recordSaleCalls));

    await page.goto("/cashier");

    await page
      .getByPlaceholder("Ketik nama, SKU, atau scan barcode...")
      .fill("Kopi");
    await page.getByRole("button", { name: /Kopi Botol 250ml/ }).click();
    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();

    await page.keyboard.press("F2");
    await expect(
      page.getByRole("heading", { name: "Pilih Metode Pembayaran" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /QRIS/ }).click();

    // QRIS completion is simulated/nondeterministic; we only assert the branch
    // renders its own screen. No sale is recorded until it "succeeds".
    await expect(
      page.getByRole("heading", { name: "Pembayaran QRIS" }),
    ).toBeVisible();
    expect(recordSaleCalls).toHaveLength(0);
  });
});
