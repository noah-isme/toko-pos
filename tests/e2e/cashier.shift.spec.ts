// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

test.describe("Kasir – shift lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("membuka shift, menyelesaikan transaksi, lalu tutup shift dengan perhitungan selisih", async ({
    page,
  }) => {
    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "CASHIER",
      outlet: {
        id: "outlet-1",
        name: "Outlet Utama",
        code: "MAIN",
        address: "Jl. Sudirman No.1",
      },
    };

    const catalogProduct = {
      id: "product-1",
      name: "Teh Tarik Botol",
      sku: "SKU-TEH-001",
      barcode: "8999991234567",
      price: 38000,
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
      minStock: 5,
    };

    const inventoryRecords = [
      {
        outletId: userOutlet.outlet.id,
        outletName: userOutlet.outlet.name,
        quantity: 12,
        updatedAt: new Date().toISOString(),
      },
    ];

    let activeShift = null;
    let lastSaleNet = 0;
    const recentSales = [];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => [catalogProduct],
      "products.categories": () => [],
      "products.suppliers": () => [],
      "settings.listTaxSettings": () => [],
      "products.getInventoryByProduct": () => inventoryRecords,
      "products.getStockMovements": () => [],
      "sales.listRecent": () => recentSales,
      "sales.recordSale": ({ input }) => {
        const receiptNumber = input?.receiptNumber ?? `POS-${Date.now()}`;
        const items = input?.items ?? [];
        const discountTotal = input?.discountTotal ?? 0;
        const subtotal = items.reduce(
          (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
          0,
        );
        lastSaleNet = subtotal - discountTotal;

        const sale = {
          id: `sale-${Date.now()}`,
          outletId: userOutlet.outlet.id,
          receiptNumber,
          soldAt: new Date().toISOString(),
          totalNet: lastSaleNet,
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          status: "COMPLETED",
          items: items.map((item) => ({
            productName: catalogProduct.name,
            quantity: item.quantity,
          })),
          paymentMethods: input?.payments?.map((payment) => payment.method) ?? ["CASH"],
        };

        recentSales.unshift(sale);

        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          soldAt: sale.soldAt,
          taxAmount: null,
        };
      },
      "sales.printReceipt": () => ({
        filename: "POS-0001.pdf",
        base64: pdfBase64,
      }),
      "cashSessions.getActive": ({ input }) => {
        if (!input?.outletId) return null;
        if (activeShift && activeShift.outletId === input.outletId) {
          return activeShift;
        }
        return null;
      },
      "cashSessions.open": ({ input }) => {
        const openTime = new Date("2025-10-13T01:00:00.000Z");
        activeShift = {
          id: "shift-1",
          outletId: input.outletId,
          userId: "cashier-demo",
          openingCash: input.openingCash,
          closingCash: null,
          expectedCash: null,
          difference: null,
          openTime: openTime.toISOString(),
          closeTime: null,
          user: { id: "cashier-demo", name: "Kasir Demo" },
        };
        return activeShift;
      },
      "cashSessions.close": ({ input }) => {
        if (!activeShift || input.sessionId !== activeShift.id) {
          throw new Error("Shift tidak ditemukan");
        }
        const closingCash = input.closingCash;
        const expectedCash = (activeShift.openingCash ?? 0) + lastSaleNet;
        const difference = closingCash - expectedCash;
        const summary = {
          ...activeShift,
          closingCash,
          expectedCash,
          difference,
          closeTime: new Date().toISOString(),
          cashSalesTotal: lastSaleNet,
        };
        activeShift = null;
        return summary;
      },
    });

    await page.goto("/cashier");

    await expect(
      page.getByRole("heading", { name: "Buka Shift Kasir" }),
    ).toBeVisible();
    await page.getByLabel("Kas awal (IDR)").fill("200000");
    await page.getByRole("button", { name: "Buka Shift" }).click();
    await expect(
      page.getByText("Shift dibuka oleh Kasir Demo", { exact: false }),
    ).toBeVisible();

    await page.getByLabel("Scan / Cari Produk").fill(catalogProduct.barcode);
    await page.getByRole("button", { name: "Tambah (F1)" }).click();
    await expect(page.getByRole("cell", { name: catalogProduct.name })).toBeVisible();

    await page.getByRole("button", { name: "Bayar (F2)" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(
      page.getByText("Pembayaran berhasil", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Tutup$/ }).click();
    await expect(page.getByLabel("Scan / Cari Produk")).toBeFocused();

    await page.getByRole("button", { name: /^Tutup Shift$/ }).click();
    await page.getByLabel("Kas akhir (IDR)").fill("235000");
    await page.getByRole("dialog").getByRole("button", { name: "Tutup Shift" }).click();

    const differenceText = page
      .getByRole("dialog")
      .getByText("Selisih kas", { exact: false });
    await expect(differenceText).toHaveText(/Selisih kas/i);
    await page.getByRole("button", { name: "Selesai" }).click();

    await expect(
      page.getByText("Belum ada shift aktif", { exact: false }),
    ).toBeVisible();
  });
});
