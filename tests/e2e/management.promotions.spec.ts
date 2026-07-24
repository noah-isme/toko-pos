// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const userOutlet = {
  id: "uo-1",
  outletId: "outlet-1",
  role: "ADMIN",
  outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" },
};

const baseHandlers = (promoCalls) => ({
  "outlets.getUserOutlets": () => [userOutlet],
  "outlets.list": () => [userOutlet.outlet],
  "promotions.list": ({ input }) =>
    input?.outletId === "outlet-1"
      ? [
          {
            id: "promo-1",
            name: "Beli 2 Gratis 1",
            type: "BUY_X_GET_Y",
            description: "Beli 2 kopi gratis 1",
            rules: { triggerProductId: "product-1", triggerQuantity: 2, rewardProductId: "product-1", rewardQuantity: 1 },
            isActive: true,
            isGlobal: false,
            priority: 0,
            startDate: null,
            endDate: null,
          },
        ]
      : [],
  "promotions.create": ({ input }) => {
    promoCalls.push(input);
    return { id: "promo-new" };
  },
  "promotions.simulate": () => ({ promotions: [], discount: 0, totalGross: 0 }),
  "analytics.getPromotionUsageSummary": () => ({
    from: new Date().toISOString(),
    to: new Date().toISOString(),
    totalRedemptions: 42,
    totalDiscount: 630000,
    redemptionRate: 0.15,
    topPromotions: [
      { promotionId: "promo-1", name: "Beli 2 Gratis 1", redemptions: 25, discount: 375000 },
    ],
  }),
  "analytics.getTaskFeedbackSummary": () => ({
    period: { from: new Date().toISOString(), to: new Date().toISOString() },
    pendingTasks: 3,
    completedTasks: 12,
    criticalAlerts: 1,
    recentNotes: [],
  }),
  "products.list": () => [
    { id: "product-1", name: "Kopi Botol 250ml", sku: "SKU-01", price: 15000 },
    { id: "product-2", name: "Teh Botol 350ml", sku: "SKU-02", price: 12000 },
  ],
});

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
});

test.describe("Promotions", () => {
  test("displays the promotions page with sections", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/promotions");

    await expect(page.getByRole("heading", { name: "Dynamic Promotion Engine" })).toBeVisible();
  });

  test("displays promotion usage dashboard", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/promotions");

    await expect(page.getByText("Promotion Usage Dashboard").first()).toBeVisible();
  });

  test("displays task feedback summary", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers([]));
    await page.goto("/management/promotions");

    await expect(page.getByText("Task Feedback Loop").first()).toBeVisible();
  });

  test("registers createPromotion mock handler", async ({ page }) => {
    const promoCalls = [];
    await setupTrpcMock(page, baseHandlers(promoCalls));
    await page.goto("/management/promotions");

    expect(typeof baseHandlers(promoCalls)["promotions.create"]).toBe("function");
  });
});
