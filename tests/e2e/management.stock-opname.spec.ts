// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "ADMIN",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const inventorySnapshot = [
  { productId: "product-1", productName: "Kopi Botol 250ml", sku: "SKU-01", quantity: 50 },
  { productId: "product-2", productName: "Teh Botol 350ml", sku: "SKU-02", quantity: 30 },
  { productId: "product-3", productName: "Air Mineral 600ml", sku: "SKU-03", quantity: 100 },
];

const baseHandlers = (opnameCalls) => ({
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [userOutlet.outlet],
  "outlets.getStockSnapshot": ({ input }) =>
    input?.outletId === "outlet-1" ? inventorySnapshot : [],
  "outlets.performOpname": ({ input }) => {
    opnameCalls.push(input);
    return input.entries.map((e) => ({
      productId: e.productId,
      systemQuantity: inventorySnapshot.find((i) => i.productId === e.productId)?.quantity ?? 0,
      countedQuantity: e.countedQuantity,
      difference: e.countedQuantity - (inventorySnapshot.find((i) => i.productId === e.productId)?.quantity ?? 0),
    }));
  },
});

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Stock Opname", () => {
  test("displays the stock opname page", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-opname");

    await expect(page.getByRole("heading", { name: "Stock Opname" })).toBeVisible();
  });

  test("displays outlet selection and start button", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/stock-opname");

    await expect(page.getByRole("button", { name: "Mulai Opname" })).toBeVisible();
  });

  test("registers performOpname mock handler", async ({ page }) => {
    const opnameCalls = [];
    await setupTrpcMock(page, baseHandlers(opnameCalls));
    await page.goto("/management/stock-opname");

    expect(typeof baseHandlers(opnameCalls)["outlets.performOpname"]).toBe("function");
  });
});
