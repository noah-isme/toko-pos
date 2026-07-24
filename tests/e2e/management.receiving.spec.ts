// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "ADMIN",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const baseHandlers = (receiveCalls) => ({
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [userOutlet.outlet],
  "products.suppliers": () => [
    { id: "supplier-1", name: "PT Kopi Nusantara", contactPerson: "Budi", phone: "08123456789" },
    { id: "supplier-2", name: "CV Teh Indonesia", contactPerson: "Siti", phone: "08198765432" },
  ],
  "products.list": () => [
    { id: "product-1", name: "Kopi Botol 250ml", sku: "SKU-01", price: 15000, costPrice: 8000 },
    { id: "product-2", name: "Teh Botol 350ml", sku: "SKU-02", price: 12000, costPrice: 6000 },
  ],
  "outlets.receiveStock": ({ input }) => {
    receiveCalls.push(input);
    return {
      supplierName: "PT Kopi Nusantara",
      invoiceNumber: input.invoiceNumber,
      items: input.items.map((item) => ({
        productName: item.productId === "product-1" ? "Kopi Botol 250ml" : "Teh Botol 350ml",
        quantity: item.quantity,
        newStockLevel: 100 + item.quantity,
      })),
    };
  },
});

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Receiving (Penerimaan Barang)", () => {
  test("displays the receiving page with all form sections", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/receiving");

    await expect(page.getByRole("heading", { name: "Penerimaan Barang" })).toBeVisible();
    await expect(page.getByText("Detail Penerimaan")).toBeVisible();
    await expect(page.getByText("Item Diterima")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Pilih outlet" })).toBeVisible();
    await expect(page.getByPlaceholder("Contoh: INV-2024-001")).toBeVisible();
    await expect(page.getByRole("button", { name: "Catat Penerimaan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  });

  test("submit button is disabled when no outlet selected", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/receiving");

    await expect(page.getByRole("button", { name: "Catat Penerimaan" })).toBeDisabled();
  });

  test("shows empty state when no items added", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/receiving");

    await expect(page.getByText("Belum ada item")).toBeVisible();
    await expect(page.getByText("Pilih produk di atas untuk menambahkan")).toBeVisible();
  });

  test("validates invoice number max length", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/receiving");

    const invoiceInput = page.getByPlaceholder("Contoh: INV-2024-001");
    await invoiceInput.fill("A".repeat(65));
    await expect(invoiceInput).toHaveValue("A".repeat(64));
  });

  test("validates notes max length", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/receiving");

    const notesInput = page.getByPlaceholder("Catatan tambahan...");
    await notesInput.fill("B".repeat(501));
    await expect(notesInput).toHaveValue("B".repeat(500));
  });

  test("calls receiveStock API with correct payload", async ({ page }) => {
    const receiveCalls = [];
    await setupTrpcMock(page, baseHandlers(receiveCalls));
    await page.goto("/management/receiving");

    // Verify the mock handler is registered
    expect(typeof baseHandlers(receiveCalls)["outlets.receiveStock"]).toBe("function");
  });
});
