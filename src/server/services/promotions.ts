import { z } from "zod";

import type { Promotion } from "@prisma/client";

import { db } from "@/server/db";
import { PromotionType } from "@/server/db/enums";

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

type TermedPromotionInput = {
  outletId: string;
  totalGross: number;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
};

const buyXGetYSchema = z.object({
  triggerProductId: z.string(),
  triggerQuantity: z.number().int().min(1),
  rewardProductId: z.string(),
  rewardQuantity: z.number().int().min(1),
});

const bundleDiscountSchema = z.object({
  bundleProductIds: z.array(z.string().min(1)).min(2),
  discountPercent: z.number().min(0).max(100),
});

const tieredDiscountSchema = z.object({
  tiers: z
    .array(
      z.object({
        threshold: z.number().min(0),
        discountPercent: z.number().min(0).max(100),
      }),
    )
    .min(1),
});

type PromotionEvaluation = {
  id: string;
  name: string;
  discount: number;
  description: string | null;
};

type PromotionRow = Promotion & {
  outlets: { outletId: string }[];
};

const getProductContext = async (productIds: Set<string>) => {
  if (!productIds.size) return new Map<string, { name: string | null; price: number }>();
  const products = await db.product.findMany({
    where: {
      id: { in: Array.from(productIds) },
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  return new Map(
    products.map((product) => [
      product.id,
      {
        name: product.name ?? null,
        price: Number(product.price),
      },
    ]),
  );
};

const buildItemsMap = (items: TermedPromotionInput["items"]) =>
  new Map(items.map((item) => [item.productId, item]));

const describeBundle = (bundleIds: string[], productContext: Map<string, { name: string | null }>) =>
  bundleIds
    .map((id) => productContext.get(id)?.name ?? id)
    .filter(Boolean)
    .join(" + ");

const evaluatePromotion = (
  promotion: PromotionRow,
  context: TermedPromotionInput,
  productContext: Map<string, { name: string | null; price: number }>,
) => {
  if (!promotion) return null;

  const itemsMap = buildItemsMap(context.items);

  switch (promotion.type) {
    case PromotionType.BUY_X_GET_Y: {
      const parsed = buyXGetYSchema.safeParse(promotion.rules);
      if (!parsed.success) return null;
      const rule = parsed.data;
      const trigger = itemsMap.get(rule.triggerProductId);
      if (!trigger) return null;
      const triggers = Math.floor(trigger.quantity / rule.triggerQuantity);
      if (triggers <= 0) return null;
      // The reward item must actually be present in the cart; we never grant a
      // discount for goods the customer did not add. The catalog price is only
      // used to value a reward line that IS in the cart.
      const rewardItem = itemsMap.get(rule.rewardProductId);
      if (!rewardItem) return null;
      const rewardPrice =
        rewardItem.unitPrice ||
        productContext.get(rule.rewardProductId)?.price ||
        0;
      if (rewardPrice <= 0) return null;
      // Cannot reward more units than the customer actually bought.
      const rewardUnits = Math.min(
        rule.rewardQuantity * triggers,
        rewardItem.quantity,
      );
      if (rewardUnits <= 0) return null;
      const discount = roundCurrency(rewardUnits * rewardPrice);
      if (discount <= 0) return null;
      const triggerName =
        productContext.get(rule.triggerProductId)?.name ?? "produk";
      const rewardName =
        productContext.get(rule.rewardProductId)?.name ?? "produk";
      return {
        id: promotion.id,
        name: promotion.name,
        discount,
        description:
          promotion.description ??
          `Beli ${rule.triggerQuantity}x ${triggerName} dapat ${rule.rewardQuantity}x ${rewardName}`,
      };
    }
    case PromotionType.BUNDLE_DISCOUNT: {
      const parsed = bundleDiscountSchema.safeParse(promotion.rules);
      if (!parsed.success) return null;
      const rule = parsed.data;
      const bundleItems = rule.bundleProductIds
        .map((id) => itemsMap.get(id))
        .filter((item): item is TermedPromotionInput["items"][number] =>
          Boolean(item),
        );
      if (bundleItems.length !== rule.bundleProductIds.length) return null;
      const bundleTotal = bundleItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      if (bundleTotal <= 0) return null;

      const discount = roundCurrency(
        bundleTotal * (rule.discountPercent / 100),
      );
      if (discount <= 0) return null;

      const bundleDescription =
        describeBundle(rule.bundleProductIds, productContext);

      return {
        id: promotion.id,
        name: promotion.name,
        discount,
        description:
          promotion.description ??
          `Diskon ${rule.discountPercent}% untuk bundel ${bundleDescription}`,
      };
    }
    case PromotionType.TIERED_DISCOUNT: {
      const parsed = tieredDiscountSchema.safeParse(promotion.rules);
      if (!parsed.success) return null;
      const rule = parsed.data;
      const sorted = [...rule.tiers].sort((a, b) => b.threshold - a.threshold);
      const hit = sorted.find((tier) => context.totalGross >= tier.threshold);
      if (!hit) return null;
      const discount = roundCurrency(
        context.totalGross * (hit.discountPercent / 100),
      );
      if (discount <= 0) return null;

      return {
        id: promotion.id,
        name: promotion.name,
        discount,
        description:
          promotion.description ??
          `Diskon ${hit.discountPercent}% untuk total >= ${hit.threshold}`,
      };
    }
    default:
      return null;
  }
};

export const applyPromotionsToSale = async (
  params: TermedPromotionInput,
): Promise<{ promotions: PromotionEvaluation[]; discount: number }> => {
  const now = new Date();
  const promotions: PromotionRow[] = await db.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { isGlobal: true },
            { outlets: { some: { outletId: params.outletId } } },
          ],
        },
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    include: {
      outlets: true,
    },
    orderBy: {
      priority: "asc",
    },
  });

  const productIds = new Set<string>();
  promotions.forEach((promotion) => {
    if (promotion.type === PromotionType.BUY_X_GET_Y) {
      const schemaResult = buyXGetYSchema.safeParse(promotion.rules);
      if (schemaResult.success) {
        productIds.add(schemaResult.data.triggerProductId);
        productIds.add(schemaResult.data.rewardProductId);
      }
    }
    if (promotion.type === PromotionType.BUNDLE_DISCOUNT) {
      const schemaResult = bundleDiscountSchema.safeParse(promotion.rules);
      if (schemaResult.success) {
        schemaResult.data.bundleProductIds.forEach((id) => productIds.add(id));
      }
    }
    if (promotion.type === PromotionType.TIERED_DISCOUNT) {
      const schemaResult = tieredDiscountSchema.safeParse(promotion.rules);
      if (schemaResult.success) {
        // tiers don't require extra product info
      }
    }
  });

  params.items.forEach((item) => productIds.add(item.productId));

  const productContext = await getProductContext(productIds);

  const applied: PromotionEvaluation[] = [];
  let totalDiscount = 0;
  promotions.forEach((promotion) => {
    const evaluation = evaluatePromotion(promotion, params, productContext);
    if (!evaluation) return;
    applied.push(evaluation);
    totalDiscount += evaluation.discount;
  });

  return {
    promotions: applied,
    discount: roundCurrency(totalDiscount),
  };
};
