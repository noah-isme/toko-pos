import { addDays, startOfDay } from "date-fns";

import { LowStockAlert } from "@prisma/client";

import { db } from "@/server/db";
import { Prisma } from "@/server/db/enums";

type LowStockClient = Pick<
  typeof db,
  "inventory" | "product" | "lowStockAlert"
>;

export type LowStockEvaluationResult =
  | { status: "triggered"; alert: LowStockAlert }
  | { status: "cleared"; alert: LowStockAlert }
  | { status: "unchanged" };

type EvaluateLowStockInput = {
  productId: string;
  outletId: string;
  note?: string;
};

/**
 * Evaluate current stock against the product's minimum threshold.
 * Creates or clears low stock alerts with daily deduplication.
 */
export async function evaluateLowStock(
  input: EvaluateLowStockInput,
  client: LowStockClient = db,
): Promise<LowStockEvaluationResult> {
  const product = await client.product.findUnique({
    where: { id: input.productId },
    select: { minStock: true },
  });

  if (!product || product.minStock <= 0) {
    return { status: "unchanged" } as LowStockEvaluationResult;
  }

  const inventory = await client.inventory.findUnique({
    where: {
      productId_outletId: {
        productId: input.productId,
        outletId: input.outletId,
      },
    },
    select: { quantity: true },
  });

  const quantity = inventory?.quantity ?? 0;
  const threshold = product.minStock;
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);

  const existingAlert = await client.lowStockAlert.findFirst({
    where: {
      productId: input.productId,
      outletId: input.outletId,
      triggeredAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    orderBy: {
      triggeredAt: "desc",
    },
  });

  if (quantity <= threshold) {
    if (existingAlert) {
      if (existingAlert.clearedAt) {
        const reopened = await client.lowStockAlert.update({
          where: { id: existingAlert.id },
          data: {
            clearedAt: null,
            note: input.note ?? existingAlert.note,
          },
        });
        return { status: "triggered", alert: reopened };
      }
      return { status: "unchanged" };
    }

    const created = await client.lowStockAlert.create({
      data: {
        productId: input.productId,
        outletId: input.outletId,
        note: input.note,
      },
    });
    return { status: "triggered", alert: created };
  }

  if (existingAlert && !existingAlert.clearedAt) {
    const cleared = await client.lowStockAlert.update({
      where: { id: existingAlert.id },
      data: {
        clearedAt: now,
      },
    });
    return { status: "cleared", alert: cleared };
  }

  return { status: "unchanged" };
}
