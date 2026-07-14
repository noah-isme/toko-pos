// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const pdfBase64 =
  "JVBERi0xLjQKMSAwIG9iago8PD4+CmVuZG9iagp4cmVmCjAgMQowMDAwMDAwMDAwIDY1NTM1IGYgCnRyYWlsZXIKPDw+PgpzdGFydHhyZWYKMAolJUVPRgo=";

test.describe("Demo routes", () => {
  test("render cashier, products, and reports demo pages", async ({ page }) => {
    await page.goto("/demo/cashier");
    await expect(page.locator("main h1")).toContainText("Kasir");
    await expect(
      page.getByText("Coba alur kasir tanpa login. Data bersifat mock"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Kopi Botol 250ml" })).toBeVisible();

    await page.goto("/demo/products");
    await expect(page.locator("main h1")).toContainText("Manajemen Produk");
    await expect(
      page.getByRole("cell", { name: "Almond Milk 1L" }),
    ).toBeVisible();

    // In dev the server can abort the first in-flight navigation while Turbopack
    // compiles the route (net::ERR_ABORTED). Retry the goto a few times until the
    // page commits, then assert content.
    await expect(async () => {
      await page.goto("/demo/reports", { waitUntil: "commit" });
      await expect(page.locator("main h1")).toContainText("Laporan Harian", {
        timeout: 10000,
      });
    }).toPass({ timeout: 40000 });
    await expect(page.getByText("Total Transaksi")).toBeVisible();
    await expect(page.getByText("Forecast Float Kasir")).toBeVisible();
  });
});

test.describe("Receipt reprint", () => {
  const userOutlet = {
    id: "uo-1",
    outletId: "outlet-1",
    role: "CASHIER",
    outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
  };

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await page.addInitScript(() => {
      window.open = (url: string | URL | undefined | null) => {
        (window as typeof window & { __lastReceiptUrl?: string }).__lastReceiptUrl =
          typeof url === "string" ? url : url?.toString();
        return null;
      };
    });
  });

  test("reprints a receipt PDF from the history page", async ({ page }) => {
    const printReceiptCalls: unknown[] = [];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "sales.getReceiptsByOutlet": () => [
        {
          id: "sale-1",
          receiptNumber: "POS-0003",
          soldAt: new Date("2025-10-12T05:00:00.000Z").toISOString(),
          cashierName: "Kasir Demo",
          totalNet: 18000,
          paymentMethods: ["CASH"],
          status: "COMPLETED",
          shiftOpenedAt: new Date("2025-10-12T04:00:00.000Z").toISOString(),
        },
      ],
      "sales.printReceipt": ({ input }) => {
        printReceiptCalls.push(input);
        return { filename: "POS-0003.pdf", base64: pdfBase64 };
      },
    });

    await page.goto("/cashier/receipts");
    const row = page.getByRole("row").filter({ hasText: "POS-0003" });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Cetak Ulang" }).click();

    // The reprint calls sales.printReceipt and opens the PDF via window.open.
    await expect.poll(() => printReceiptCalls.length).toBe(1);
    expect(printReceiptCalls[0]).toMatchObject({ saleId: "sale-1" });

    const receiptUrl = await page.evaluate<string | undefined>(
      () =>
        (window as typeof window & { __lastReceiptUrl?: string })
          .__lastReceiptUrl,
    );
    expect(receiptUrl).toBeTruthy();
  });
});
