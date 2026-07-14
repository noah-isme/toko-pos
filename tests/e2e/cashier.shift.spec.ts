// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

// The cashier UI has two mutually-exclusive layouts toggled by a localStorage
// flag. Force Normal mode so selectors are deterministic.
test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("cashier-quick-mode", "false");
  });
});

test.describe("Kasir – shift lifecycle", () => {
  test("membuka shift, menyelesaikan transaksi tunai, lalu menutup shift", async ({
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
      categoryName: null,
    };

    let activeShift = null;
    let lastSaleNet = 0;
    const recentSales = [];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "products.list": () => [catalogProduct],
      "products.searchProducts": ({ input }) => {
        const q = String(input?.query ?? "").toLowerCase();
        return [catalogProduct].filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode ?? "").includes(q),
        );
      },
      "promotions.list": () => [],
      "tasks.getCashierTasks": () => ({
        tasks: [],
        alerts: [],
        shiftActive: Boolean(activeShift),
      }),
      "sales.listRecent": () => recentSales,
      "sales.recordSale": ({ input }) => {
        const receiptNumber = input?.receiptNumber ?? `TRX-${Date.now()}`;
        const items = input?.items ?? [];
        const discountTotal = input?.discountTotal ?? 0;
        const subtotal = items.reduce(
          (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
          0,
        );
        lastSaleNet = subtotal - discountTotal;

        const sale = {
          id: `sale-${receiptNumber}`,
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
          paymentMethods:
            input?.payments?.map((payment) => payment.method) ?? ["CASH"],
        };
        recentSales.unshift(sale);

        return {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: sale.totalNet,
          soldAt: sale.soldAt,
          taxAmount: null,
          promotionDiscount: 0,
          promotions: [],
        };
      },
      "sales.printReceipt": () => ({ filename: "TRX.pdf", base64: pdfBase64 }),
      "cashSessions.getActive": ({ input }) => {
        if (!input?.outletId) return null;
        return activeShift && activeShift.outletId === input.outletId
          ? activeShift
          : null;
      },
      "cashSessions.open": ({ input }) => {
        activeShift = {
          id: "shift-1",
          outletId: input.outletId,
          userId: "cashier-demo",
          openingCash: input.openingCash,
          closingCash: null,
          expectedCash: null,
          difference: null,
          openTime: new Date("2025-10-13T01:00:00.000Z").toISOString(),
          closeTime: null,
          user: { id: "cashier-demo", name: "Kasir Demo" },
        };
        return activeShift;
      },
      "cashSessions.close": ({ input }) => {
        const expectedCash = (activeShift?.openingCash ?? 0) + lastSaleNet;
        const summary = {
          ...activeShift,
          closingCash: input.closingCash,
          expectedCash,
          difference: input.closingCash - expectedCash,
          closeTime: new Date().toISOString(),
          cashSalesTotal: lastSaleNet,
        };
        activeShift = null;
        return summary;
      },
    });

    await page.goto("/cashier");

    // The open-shift dialog auto-opens when there is no active shift.
    const openDialog = page.getByRole("dialog");
    await expect(
      openDialog.getByRole("heading", { name: "Buka Shift Kasir" }),
    ).toBeVisible();
    await openDialog.getByLabel("Kas Awal (Rp)").fill("200000");
    await openDialog.getByRole("button", { name: "Buka Shift" }).click();

    // Shift open dialog closes; the top bar now offers "Tutup Shift".
    await expect(
      page.getByRole("heading", { name: "Buka Shift Kasir" }),
    ).toBeHidden();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Tutup Shift" }),
    ).toBeVisible();

    // Add a product via the search autocomplete (type -> pick result).
    await page
      .getByPlaceholder("Ketik nama, SKU, atau scan barcode...")
      .fill("Teh");
    await page.getByRole("button", { name: /Teh Tarik Botol/ }).click();
    await expect(
      page.getByRole("heading", { name: catalogProduct.name }),
    ).toBeVisible();

    // Pay (F2) -> choose Tunai -> enter cash -> confirm.
    await page.keyboard.press("F2");
    await expect(
      page.getByRole("heading", { name: "Pilih Metode Pembayaran" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Tunai/ }).click();
    await expect(
      page.getByRole("heading", { name: "Pembayaran Tunai" }),
    ).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill("200000");
    await page.getByRole("button", { name: /Bayar Sekarang/ }).click();

    // Two success surfaces stack: the page-level receipt dialog (portaled to
    // <body> as role=dialog, on top) and the payment modal (overlay inside
    // <main>, underneath). Dismiss the receipt dialog first, then the modal.
    const receiptDialog = page
      .getByRole("dialog")
      .filter({ hasText: "No. Struk:" });
    await expect(receiptDialog.getByText(/No\. Struk:/)).toBeVisible();
    await receiptDialog.getByRole("button", { name: "Selesai" }).click();
    await expect(receiptDialog).toBeHidden();

    const modalFinish = page
      .locator("#main-content")
      .getByRole("button", { name: "Selesai" });
    if (await modalFinish.isVisible().catch(() => false)) {
      await modalFinish.click();
    }

    // Close the shift.
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Tutup Shift" })
      .click();
    const closeDialog = page.getByRole("dialog");
    await expect(
      closeDialog.getByRole("heading", { name: "Tutup Shift Kasir" }),
    ).toBeVisible();
    await closeDialog.getByLabel("Kas akhir").fill("238000");
    await closeDialog.getByRole("button", { name: "Tutup Shift" }).click();

    // After closing, the shift is inactive again -> "Buka Shift" is offered.
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Buka Shift" }),
    ).toBeVisible();
  });
});
