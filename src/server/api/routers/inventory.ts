import { z } from "zod";

import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";

const lowStockAlertSchema = z.object({
  id: z.string(),
  productId: z.string(),
  outletId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  outletName: z.string(),
  quantity: z.number().nullable(),
  minStock: z.number(),
  triggeredAt: z.string(),
  clearedAt: z.string().nullable(),
  note: z.string().nullable(),
});

const inventoryItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
});

export const inventoryRouter = router({
  getAllInventory: protectedProcedure
    .input(
      z.object({
        outletId: z.string().min(1),
      }),
    )
    .output(z.array(inventoryItemSchema))
    .query(async ({ input }) => {
      const inventories = await db.inventory.findMany({
        where: {
          outletId: input.outletId,
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      return inventories.map((inv) =>
        inventoryItemSchema.parse({
          productId: inv.productId,
          quantity: inv.quantity,
        }),
      );
    }),
  setProductMinStock: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        minStock: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await db.product.update({
        where: { id: input.productId },
        data: {
          minStock: input.minStock,
        },
        select: {
          id: true,
          minStock: true,
        },
      });

      return product;
    }),
  listLowStock: protectedProcedure
    .input(
      z.object({
        outletId: z.string().min(1),
        includeCleared: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .output(z.array(lowStockAlertSchema))
    .query(async ({ input }) => {
      const alerts = await db.lowStockAlert.findMany({
        where: {
          outletId: input.outletId,
          clearedAt: input.includeCleared ? undefined : null,
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              minStock: true,
            },
          },
          outlet: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          triggeredAt: "desc",
        },
        take: input.limit,
      });

      const inventoryByProduct = await db.inventory.findMany({
        where: {
          outletId: input.outletId,
          productId: {
            in: alerts.map((alert) => alert.productId),
          },
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      const quantityMap = new Map(
        inventoryByProduct.map((inv) => [inv.productId, inv.quantity]),
      );

      return alerts.map((alert) =>
        lowStockAlertSchema.parse({
          id: alert.id,
          productId: alert.productId,
          outletId: alert.outletId,
          productName: alert.product.name,
          productSku: alert.product.sku,
          outletName: alert.outlet.name,
          quantity: quantityMap.get(alert.productId) ?? null,
          minStock: alert.product.minStock,
          triggeredAt: alert.triggeredAt.toISOString(),
          clearedAt: alert.clearedAt?.toISOString() ?? null,
          note: alert.note ?? null,
        }),
      );
    }),
  acknowledgeLowStock: protectedProcedure
    .input(
      z.object({
        alertId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const alert = await db.lowStockAlert.update({
        where: { id: input.alertId },
        data: {
          clearedAt: new Date(),
          note: "Acknowledged oleh kasir",
        },
        include: {
          product: true,
          outlet: true,
        },
      });

      return {
        id: alert.id,
        clearedAt: alert.clearedAt?.toISOString() ?? null,
        clearedBy: ctx.session?.user.id ?? null,
      };
    }),
});
