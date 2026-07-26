import { expect, test } from "@playwright/test";

import {
  cleanupE2EData,
  disconnectDb,
  e2eId,
  ensureE2EUser,
  getFirstOutlet,
  PaymentMethod,
  prisma,
  SaleStatus,
} from "./helpers/db";

test.describe("Cashier Receipts", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await ensureE2EUser();

    // Seed a transaction at the first outlet (the default selection on the
    // receipts page) so the table renders with a payment-method badge and a
    // non-COMPLETED status badge regardless of whether the full seed was run.
    const outlet = await getFirstOutlet();

    await prisma.sale.create({
      data: {
        receiptNumber: e2eId("RECEIPT"),
        outletId: outlet.id,
        cashierId: "e2e-user",
        totalGross: 50000,
        discountTotal: 0,
        totalNet: 50000,
        status: SaleStatus.VOIDED,
        soldAt: new Date(),
        payments: {
          create: [
            {
              method: PaymentMethod.CASH,
              amount: 50000,
              reference: e2eId("PAY"),
            },
          ],
        },
      },
    });
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    await disconnectDb();
  });

  test("renders receipts page heading", async ({ page }) => {
    await page.goto("/cashier/receipts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Riwayat Struk").first()).toBeVisible();
  });

  test("displays transactions table", async ({ page }) => {
    await page.goto("/cashier/receipts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Nomor Struk" }),
    ).toBeVisible();
  });

  test("shows payment method badges in table", async ({ page }) => {
    await page.goto("/cashier/receipts");
    await page.waitForLoadState("networkidle");

    const table = page.getByRole("table");
    await expect(
      table.getByText(PaymentMethod.CASH).first(),
    ).toBeVisible();
  });

  test("displays status badges", async ({ page }) => {
    await page.goto("/cashier/receipts");
    await page.waitForLoadState("networkidle");

    // Non-COMPLETED sales render an uppercase outline badge ("Void"/"Refund").
    // The seeded VOIDED sale surfaces a "Void" badge in the table.
    const table = page.getByRole("table");
    await expect(table.getByText("Void").first()).toBeVisible();
  });
});
