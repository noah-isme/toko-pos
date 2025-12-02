// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

test.describe("Kasir – refund & void dari riwayat struk", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("mencatat transaksi baru lalu refund satu struk dan void struk lainnya", async ({ page }) => {
    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "CASHIER",
      outlet: {
        id: "outlet-1",
        name: "Outlet Utama",
        code: "MAIN",
        address: "Jl. Kemang Raya No.8",
      },
    };

    const catalogProduct = {
      id: "product-1",
      name: "Kopi Susu 500ml",
      sku: "SKU-KOPI-001",
      barcode: "8991231231231",
      price: 42000,
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
      minStock: 3,
    };

    const recentSales = [];
    const receiptsState = [
      {
        id: "sale-refund-target",
        receiptNumber: "POS-3001",
        soldAt: new Date("2025-10-12T05:00:00.000Z").toISOString(),
        cashierName: "Kasir Demo",
        shiftOpenedAt: new Date("2025-10-12T04:00:00.000Z").toISOString(),
        totalNet: 90000,
        totalItems: 3,
        restockedQuantity: 3,
        paymentMethods: ["CASH"],
        status: "COMPLETED",
      },
      {
        id: "sale-void-target",
        receiptNumber: "POS-3002",
        soldAt: new Date("2025-10-12T07:30:00.000Z").toISOString(),
        cashierName: "Admin Demo",
        shiftOpenedAt: new Date("2025-10-12T07:00:00.000Z").toISOString(),
        totalNet: 120000,
        totalItems: 4,
        restockedQuantity: 4,
        paymentMethods: ["QRIS"],
        status: "COMPLETED",
      },
    ];

    let activeShift = {
      id: "shift-open",
      outletId: userOutlet.outlet.id,
      userId: "cashier-demo",
      openingCash: 150000,
      closingCash: null,
      expectedCash: null,
      difference: null,
      openTime: new Date("2025-10-13T01:00:00.000Z").toISOString(),
      closeTime: null,
      user: { id: "cashier-demo", name: "Kasir Demo" },
    };

    let latestReceiptNumber = "";
    const refundCalls: unknown[] = [];
    const voidCalls: unknown[] = [];

    const mapReceipt = (sale: typeof receiptsState[number]) => ({
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      soldAt: sale.soldAt,
      cashierName: sale.cashierName,
      totalNet: sale.totalNet,
      paymentMethods: sale.paymentMethods,
      status: sale.status,
      shiftOpenedAt: sale.shiftOpenedAt,
    });

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => [catalogProduct],
      "products.categories": () => [],
      "products.suppliers": () => [],
      "settings.listTaxSettings": () => [],
      "products.getInventoryByProduct": () => [
        {
          outletId: userOutlet.outlet.id,
          outletName: userOutlet.outlet.name,
          quantity: 20,
          updatedAt: new Date().toISOString(),
        },
      ],
      "products.getStockMovements": () => [],
      "cashSessions.getActive": () => activeShift,
      "cashSessions.open": () => activeShift,
      "cashSessions.close": () => activeShift,
      "sales.listRecent": () => recentSales,
      "sales.recordSale": ({ input }) => {
        const receiptNumber = input?.receiptNumber ?? `POS-${Date.now()}`;
        const items = input?.items ?? [];
        const discount = input?.discountTotal ?? 0;
        const totalNet =
          items.reduce(
            (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
            0,
          ) - discount;
        latestReceiptNumber = receiptNumber;
        const sale = {
          id: `sale-${Date.now()}`,
          receiptNumber,
          soldAt: new Date().toISOString(),
          cashierName: "Kasir Demo",
          shiftOpenedAt: activeShift.openTime,
          totalNet,
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          restockedQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          paymentMethods: input?.payments?.map((payment) => payment.method) ?? ["CASH"],
          status: "COMPLETED",
        };
        receiptsState.unshift(sale);
        recentSales.unshift({ ...sale, outletId: userOutlet.outlet.id, items: [] });

        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          soldAt: sale.soldAt,
          taxAmount: null,
        };
      },
      "sales.printReceipt": () => ({
        filename: "POS-SEED.pdf",
        base64: pdfBase64,
      }),
      "sales.getReceiptsByOutlet": () => receiptsState.map(mapReceipt),
      "sales.refundSale": ({ input }) => {
        refundCalls.push(input);
        const sale = receiptsState.find((entry) => entry.id === input.saleId);
        if (!sale) {
          throw new Error("Sale not found");
        }
        sale.status = "REFUNDED";
        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          totalItems: sale.totalItems,
          restockedQuantity: sale.restockedQuantity,
          status: sale.status,
          refundAmount: input.amount ?? sale.totalNet,
        };
      },
      "sales.voidSale": ({ input }) => {
        voidCalls.push(input);
        const sale = receiptsState.find((entry) => entry.id === input.saleId);
        if (!sale) {
          throw new Error("Sale not found");
        }
        sale.status = "VOIDED";
        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          totalItems: sale.totalItems,
          restockedQuantity: sale.restockedQuantity,
          status: sale.status,
        };
      },
    });

    await page.goto("/cashier");
    await expect(
      page.getByText("Shift dibuka oleh Kasir Demo", { exact: false }),
    ).toBeVisible();

    await page.getByLabel("Scan / Cari Produk").fill(catalogProduct.barcode);
    await page.getByRole("button", { name: "Tambah (F1)" }).click();
    await page.getByRole("button", { name: "Bayar (F2)" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(
      page.getByText("Pembayaran berhasil", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Tutup$/ }).click();

    await expect.poll(() => latestReceiptNumber).not.toBe("");

    await page.getByRole("link", { name: "Riwayat Struk" }).click();
    await expect(
      page.getByRole("heading", { name: "Riwayat Struk" }),
    ).toBeVisible();

    const newlyCreatedRow = page
      .locator("tr")
      .filter({ hasText: latestReceiptNumber })
      .first();
    await newlyCreatedRow.getByRole("button", { name: "Refund" }).click();
    await page.getByLabel("Alasan").fill("Produk bocor");
    await page.getByRole("button", { name: "Konfirmasi Refund" }).click();
    await expect(newlyCreatedRow.getByText("Refund")).toBeVisible();

    expect(refundCalls).toHaveLength(1);
    expect(refundCalls[0]).toMatchObject({
      saleId: expect.any(String),
      reason: "Produk bocor",
      amount: expect.any(Number),
    });

    const voidRow = page.locator("tr").filter({ hasText: "POS-3002" }).first();
    await voidRow.getByRole("button", { name: "Void" }).click();
    await page.getByLabel("Alasan").fill("Pembayaran ganda");
    await page.getByRole("button", { name: "Konfirmasi Void" }).click();
    await expect(voidRow.getByText("Void")).toBeVisible();

    expect(voidCalls).toHaveLength(1);
    expect(voidCalls[0]).toMatchObject({
      saleId: "sale-void-target",
      reason: "Pembayaran ganda",
    });
  });
});
