import { beforeEach, describe, expect, it, vi } from "vitest";

const promotionFindMany = vi.hoisted(() => vi.fn());
const productFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: {
    promotion: { findMany: promotionFindMany },
    product: { findMany: productFindMany },
  },
}));

import { PromotionType } from "@/server/db/enums";
import { applyPromotionsToSale } from "@/server/services/promotions";

type PromotionRule = Record<string, unknown>;

/** Minimal Promotion row matching what the service reads (plus the included outlets). */
const makePromotion = (
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    type: PromotionType;
    rules: PromotionRule;
    priority: number;
    outlets: { outletId: string }[];
  }> = {},
) => ({
  id: overrides.id ?? "promo-1",
  name: overrides.name ?? "Promo Uji",
  description: overrides.description ?? null,
  type: overrides.type ?? PromotionType.BUY_X_GET_Y,
  rules: overrides.rules ?? {},
  priority: overrides.priority ?? 0,
  isActive: true,
  isGlobal: true,
  startDate: null,
  endDate: null,
  outlets: overrides.outlets ?? [],
});

const OUTLET = "outlet-1";

beforeEach(() => {
  promotionFindMany.mockReset();
  productFindMany.mockReset();
  // Default: no product catalog lookups needed unless a test provides them.
  productFindMany.mockResolvedValue([]);
});

describe("applyPromotionsToSale — BUY_X_GET_Y", () => {
  it("grants the reward line value when trigger threshold is met and reward is in cart", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        name: "Beli 2 Kopi gratis 1 Roti",
        rules: {
          triggerProductId: "kopi",
          triggerQuantity: 2,
          rewardProductId: "roti",
          rewardQuantity: 1,
        },
      }),
    ]);
    productFindMany.mockResolvedValue([
      { id: "kopi", name: "Kopi", price: 20000 },
      { id: "roti", name: "Roti", price: 8000 },
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 48000,
      items: [
        { productId: "kopi", quantity: 2, unitPrice: 20000 },
        { productId: "roti", quantity: 1, unitPrice: 8000 },
      ],
    });

    expect(result.discount).toBe(8000);
    expect(result.promotions).toHaveLength(1);
    expect(result.promotions[0]).toMatchObject({ id: "promo-1", discount: 8000 });
  });

  it("scales the reward with the number of trigger multiples reached", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        rules: {
          triggerProductId: "kopi",
          triggerQuantity: 2,
          rewardProductId: "roti",
          rewardQuantity: 1,
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [
        // 4 triggers → 2 multiples → up to 2 free roti
        { productId: "kopi", quantity: 4, unitPrice: 20000 },
        { productId: "roti", quantity: 3, unitPrice: 8000 },
      ],
    });

    expect(result.discount).toBe(16000); // 2 * 8000
  });

  it("never rewards more units than the customer actually bought", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        rules: {
          triggerProductId: "kopi",
          triggerQuantity: 2,
          rewardProductId: "roti",
          rewardQuantity: 1,
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [
        { productId: "kopi", quantity: 4, unitPrice: 20000 }, // earns 2 free
        { productId: "roti", quantity: 1, unitPrice: 8000 }, // but only 1 in cart
      ],
    });

    expect(result.discount).toBe(8000); // capped at the 1 roti present
  });

  it("does not apply when the trigger quantity is not reached", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        rules: {
          triggerProductId: "kopi",
          triggerQuantity: 3,
          rewardProductId: "roti",
          rewardQuantity: 1,
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [
        { productId: "kopi", quantity: 2, unitPrice: 20000 },
        { productId: "roti", quantity: 1, unitPrice: 8000 },
      ],
    });

    expect(result.discount).toBe(0);
    expect(result.promotions).toHaveLength(0);
  });

  it("does not grant a discount when the reward item is absent from the cart", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        rules: {
          triggerProductId: "kopi",
          triggerQuantity: 2,
          rewardProductId: "roti",
          rewardQuantity: 1,
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [{ productId: "kopi", quantity: 2, unitPrice: 20000 }],
    });

    expect(result.discount).toBe(0);
  });

  it("ignores promotions whose rules fail validation", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        rules: { triggerProductId: "kopi" }, // missing required fields
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [{ productId: "kopi", quantity: 5, unitPrice: 20000 }],
    });

    expect(result.discount).toBe(0);
  });
});

describe("applyPromotionsToSale — BUNDLE_DISCOUNT", () => {
  it("discounts the bundle total when every bundle product is present", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        type: PromotionType.BUNDLE_DISCOUNT,
        rules: {
          bundleProductIds: ["nasi", "ayam"],
          discountPercent: 10,
        },
      }),
    ]);
    productFindMany.mockResolvedValue([
      { id: "nasi", name: "Nasi", price: 10000 },
      { id: "ayam", name: "Ayam", price: 15000 },
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 25000,
      items: [
        { productId: "nasi", quantity: 1, unitPrice: 10000 },
        { productId: "ayam", quantity: 1, unitPrice: 15000 },
      ],
    });

    expect(result.discount).toBe(2500); // 10% of 25000
  });

  it("does not apply when a bundle product is missing", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        type: PromotionType.BUNDLE_DISCOUNT,
        rules: {
          bundleProductIds: ["nasi", "ayam"],
          discountPercent: 10,
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 10000,
      items: [{ productId: "nasi", quantity: 1, unitPrice: 10000 }],
    });

    expect(result.discount).toBe(0);
  });
});

describe("applyPromotionsToSale — TIERED_DISCOUNT", () => {
  it("selects the highest tier whose threshold the total meets", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        type: PromotionType.TIERED_DISCOUNT,
        rules: {
          tiers: [
            { threshold: 50000, discountPercent: 5 },
            { threshold: 100000, discountPercent: 15 },
          ],
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 120000,
      items: [{ productId: "x", quantity: 1, unitPrice: 120000 }],
    });

    expect(result.discount).toBe(18000); // 15% of 120000, not 5%
  });

  it("does not apply when no tier threshold is reached", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        type: PromotionType.TIERED_DISCOUNT,
        rules: {
          tiers: [{ threshold: 50000, discountPercent: 5 }],
        },
      }),
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 30000,
      items: [{ productId: "x", quantity: 1, unitPrice: 30000 }],
    });

    expect(result.discount).toBe(0);
  });
});

describe("applyPromotionsToSale — stacking & querying", () => {
  it("stacks discounts from multiple applicable promotions", async () => {
    promotionFindMany.mockResolvedValue([
      makePromotion({
        id: "promo-bundle",
        type: PromotionType.BUNDLE_DISCOUNT,
        rules: { bundleProductIds: ["nasi", "ayam"], discountPercent: 10 },
      }),
      makePromotion({
        id: "promo-tier",
        type: PromotionType.TIERED_DISCOUNT,
        rules: { tiers: [{ threshold: 20000, discountPercent: 5 }] },
      }),
    ]);
    productFindMany.mockResolvedValue([
      { id: "nasi", name: "Nasi", price: 10000 },
      { id: "ayam", name: "Ayam", price: 15000 },
    ]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 25000,
      items: [
        { productId: "nasi", quantity: 1, unitPrice: 10000 },
        { productId: "ayam", quantity: 1, unitPrice: 15000 },
      ],
    });

    // 2500 (bundle 10%) + 1250 (tier 5%) = 3750
    expect(result.discount).toBe(3750);
    expect(result.promotions).toHaveLength(2);
  });

  it("returns a zero discount when there are no active promotions", async () => {
    promotionFindMany.mockResolvedValue([]);

    const result = await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 100000,
      items: [{ productId: "x", quantity: 1, unitPrice: 100000 }],
    });

    expect(result).toEqual({ promotions: [], discount: 0 });
  });

  it("scopes the query to active, in-window promotions for this outlet", async () => {
    promotionFindMany.mockResolvedValue([]);

    await applyPromotionsToSale({
      outletId: OUTLET,
      totalGross: 0,
      items: [],
    });

    expect(promotionFindMany).toHaveBeenCalledTimes(1);
    const where = promotionFindMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    // Outlet scoping: either global or targeted at this outlet.
    const outletBranch = where.AND[0].OR;
    expect(outletBranch).toContainEqual({ isGlobal: true });
    expect(outletBranch).toContainEqual({
      outlets: { some: { outletId: OUTLET } },
    });
  });
});
