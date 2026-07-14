// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

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

test.describe("Kasir – refund & void dari riwayat struk", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("refund satu struk dan void struk lainnya dari halaman riwayat", async ({
    page,
  }) => {
    // Two completed receipts to act on. Kept mutable so the mock reflects the
    // status change after refund/void (the list refetches).
    const receiptsState = [
      {
        id: "sale-refund-target",
        receiptNumber: "POS-3001",
        soldAt: new Date("2025-10-12T05:00:00.000Z").toISOString(),
        cashierName: "Kasir Demo",
        shiftOpenedAt: new Date("2025-10-12T04:00:00.000Z").toISOString(),
        totalNet: 90000,
        totalItems: 3,
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
        paymentMethods: ["QRIS"],
        status: "COMPLETED",
      },
    ];

    const refundCalls = [];
    const voidCalls = [];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "sales.getReceiptsByOutlet": () =>
        receiptsState.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          soldAt: sale.soldAt,
          cashierName: sale.cashierName,
          totalNet: sale.totalNet,
          paymentMethods: sale.paymentMethods,
          status: sale.status,
          shiftOpenedAt: sale.shiftOpenedAt,
        })),
      "sales.printReceipt": () => ({ filename: "POS.pdf", base64: pdfBase64 }),
      "sales.refundSale": ({ input }) => {
        refundCalls.push(input);
        const sale = receiptsState.find((s) => s.id === input.saleId);
        sale.status = "REFUNDED";
        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          totalItems: sale.totalItems,
          restockedQuantity: sale.totalItems,
          status: sale.status,
          refundAmount: input.amount ?? sale.totalNet,
        };
      },
      "sales.voidSale": ({ input }) => {
        voidCalls.push(input);
        const sale = receiptsState.find((s) => s.id === input.saleId);
        sale.status = "VOIDED";
        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          totalItems: sale.totalItems,
          restockedQuantity: sale.totalItems,
          status: sale.status,
        };
      },
    });

    await page.goto("/cashier/receipts");
    await expect(
      page.getByRole("heading", { name: "10 Transaksi Terakhir" }),
    ).toBeVisible();

    // Refund POS-3001.
    const refundRow = page.getByRole("row").filter({ hasText: "POS-3001" });
    await refundRow.getByRole("button", { name: "Refund" }).click();
    const refundDialog = page.getByRole("dialog");
    await expect(
      refundDialog.getByRole("heading", { name: "Konfirmasi Refund" }),
    ).toBeVisible();
    const refundReason = refundDialog.getByLabel("Alasan");
    await refundReason.click();
    await refundReason.fill("Produk bocor");
    await expect(refundReason).toHaveValue("Produk bocor");
    await refundDialog.getByRole("button", { name: "Konfirmasi Refund" }).click();

    await expect(refundDialog).toBeHidden();
    expect(refundCalls).toHaveLength(1);
    expect(refundCalls[0]).toMatchObject({
      saleId: "sale-refund-target",
      reason: "Produk bocor",
    });
    // After refund the row's action buttons disable (status no longer COMPLETED).
    await expect(
      refundRow.getByRole("button", { name: "Refund" }),
    ).toBeDisabled();

    // Void POS-3002.
    const voidRow = page.getByRole("row").filter({ hasText: "POS-3002" });
    await voidRow.getByRole("button", { name: "Void" }).click();
    const voidDialog = page.getByRole("dialog");
    await expect(
      voidDialog.getByRole("heading", { name: "Konfirmasi Void Struk" }),
    ).toBeVisible();
    const voidReason = voidDialog.getByLabel("Alasan");
    await voidReason.click();
    await voidReason.fill("Pembayaran ganda");
    await expect(voidReason).toHaveValue("Pembayaran ganda");
    await voidDialog.getByRole("button", { name: "Konfirmasi Void" }).click();

    await expect(voidDialog).toBeHidden();
    expect(voidCalls).toHaveLength(1);
    expect(voidCalls[0]).toMatchObject({
      saleId: "sale-void-target",
      reason: "Pembayaran ganda",
    });
    await expect(voidRow.getByRole("button", { name: "Void" })).toBeDisabled();
  });
});
