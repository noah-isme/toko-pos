import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/server/db";
import {
  getOutletAccessFromContext,
  protectedOutletProcedure,
  protectedProcedure,
  requireOutletAccess,
  router,
} from "@/server/api/trpc";
import {
  assertAdminOrOwner,
} from "@/server/api/utils/access";
import { Role } from "@/server/db/enums";
import {
  outletListOutputSchema,
  outletUpsertInputSchema,
} from "@/server/api/schemas/outlets";

export const outletsRouter = router({
  list: protectedOutletProcedure
    .output(outletListOutputSchema)
    .query(async ({ ctx }) => {
      const { role, outletIds } = getOutletAccessFromContext(ctx);

      const outlets = await db.outlet.findMany({
        where: role === Role.CASHIER ? { id: { in: outletIds } } : undefined,
        orderBy: {
          name: "asc",
        },
      });

      return outletListOutputSchema.parse(
        outlets.map((outlet) => ({
          id: outlet.id,
          name: outlet.name,
          code: outlet.code,
          address: outlet.address ?? null,
          createdAt: outlet.createdAt.toISOString(),
          updatedAt: outlet.updatedAt.toISOString(),
        })),
      );
    }),
  upsert: protectedOutletProcedure
    .input(outletUpsertInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { role } = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(role);

      const outlet = await db.outlet.upsert({
        where: {
          id: input.id ?? "",
        },
        update: {
          name: input.name,
          code: input.code,
          address: input.address,
        },
        create: {
          name: input.name,
          code: input.code,
          address: input.address,
        },
      });

      return outlet;
    }),
  getStockSnapshot: requireOutletAccess(({ input }) => input.outletId)
    .input(
      z.object({
        outletId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const inventory = await db.inventory.findMany({
        where: {
          outletId: input.outletId,
        },
        include: {
          product: true,
        },
      });

      return inventory.map((row) => ({
        productId: row.productId,
        productName: row.product.name,
        sku: row.product.sku,
        quantity: row.quantity,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
      }));
    }),
  adjustStock: requireOutletAccess(({ input }) => input.outletId)
    .input(
      z.object({
        outletId: z.string(),
        productId: z.string(),
        quantity: z.number().int(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      return await db.$transaction(async (tx) => {
        const existing = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.outletId,
            },
          },
        });

        if (
          input.quantity < 0 &&
          (!existing || existing.quantity + input.quantity < 0)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok tidak mencukupi untuk penyesuaian.",
          });
        }

        const inventory = existing
          ? await tx.inventory.update({
              where: { id: existing.id },
              data: {
                quantity: {
                  increment: input.quantity,
                },
              },
            })
          : await tx.inventory.create({
              data: {
                productId: input.productId,
                outletId: input.outletId,
                quantity: input.quantity,
              },
            });

        await tx.stockMovement.create({
          data: {
            inventoryId: inventory.id,
            type: input.quantity >= 0 ? "ADJUSTMENT" : "ADJUSTMENT",
            quantity: input.quantity,
            note: input.note,
            createdById: userId,
            productId: input.productId,
            outletId: input.outletId,
          },
        });

        return inventory;
      });
    }),
  transferStock: requireOutletAccess(({ input }) => [
    input.fromOutletId,
    input.toOutletId,
  ])
    .input(
      z.object({
        productId: z.string(),
        fromOutletId: z.string(),
        toOutletId: z.string(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      if (input.fromOutletId === input.toOutletId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Outlet asal dan tujuan harus berbeda",
        });
      }

      return await db.$transaction(async (tx) => {
        const source = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.fromOutletId,
            },
          },
        });

        if (!source || source.quantity < input.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok di outlet asal tidak mencukupi",
          });
        }

        const updatedSource = await tx.inventory.update({
          where: { id: source.id },
          data: {
            quantity: {
              decrement: input.quantity,
            },
          },
        });

        const target = await tx.inventory.upsert({
          where: {
            productId_outletId: {
              productId: input.productId,
              outletId: input.toOutletId,
            },
          },
          update: {
            quantity: {
              increment: input.quantity,
            },
          },
          create: {
            productId: input.productId,
            outletId: input.toOutletId,
            quantity: input.quantity,
          },
        });

        await tx.stockMovement.createMany({
          data: [
            {
              inventoryId: updatedSource.id,
              type: "TRANSFER_OUT",
              quantity: -input.quantity,
              note: input.note,
              createdById: userId,
              productId: input.productId,
              outletId: input.fromOutletId,
            },
            {
              inventoryId: target.id,
              type: "TRANSFER_IN",
              quantity: input.quantity,
              note: input.note,
              createdById: userId,
              productId: input.productId,
              outletId: input.toOutletId,
            },
          ],
        });

        return {
          from: updatedSource,
          to: target,
        };
      });
    }),
  performOpname: requireOutletAccess(({ input }) => input.outletId)
    .input(
      z.object({
        outletId: z.string(),
        entries: z
          .array(
            z.object({
              productId: z.string(),
              countedQuantity: z.number().int().min(0),
              note: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      return await db.$transaction(async (tx) => {
        const results: Array<{ productId: string; quantity: number; difference: number }> = [];

        for (const entry of input.entries) {
          const existing = await tx.inventory.findUnique({
            where: {
              productId_outletId: {
                productId: entry.productId,
                outletId: input.outletId,
              },
            },
          });

          const previousQuantity = existing?.quantity ?? 0;

          const inventory = existing
            ? await tx.inventory.update({
                where: { id: existing.id },
                data: {
                  quantity: entry.countedQuantity,
                },
              })
            : await tx.inventory.create({
                data: {
                  productId: entry.productId,
                  outletId: input.outletId,
                  quantity: entry.countedQuantity,
                },
              });

          const delta = entry.countedQuantity - previousQuantity;

          if (delta !== 0) {
            await tx.stockMovement.create({
              data: {
                inventoryId: inventory.id,
                type: "ADJUSTMENT",
                quantity: delta,
                note: entry.note,
                createdById: userId,
                productId: inventory.productId,
                outletId: input.outletId,
              },
            });
          }

          results.push({
            productId: inventory.productId,
            quantity: inventory.quantity,
            difference: delta,
          });
        }

        return results;
      });
    }),
  lowStock: requireOutletAccess(({ input }) => input.outletId)
    .input(
      z.object({
        outletId: z.string(),
        threshold: z.number().int().min(0).default(5),
      }),
    )
    .query(async ({ input }) => {
      const inventory = await db.inventory.findMany({
        where: { outletId: input.outletId, quantity: { lt: input.threshold } },
        include: { product: true },
        orderBy: { quantity: 'asc' },
        take: 20,
      });

      return inventory.map((row) => ({
        productId: row.productId,
        productName: row.product.name,
        sku: row.product.sku,
        quantity: row.quantity,
      }));
    }),
  getUserOutlets: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const userOutlets = await db.userOutlet.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          outlet: true,
        },
        orderBy: {
          outlet: {
            name: "asc",
          },
        },
      });

      return userOutlets.map((userOutlet) => ({
        id: userOutlet.id,
        outletId: userOutlet.outletId,
        role: userOutlet.role,
        outlet: {
          id: userOutlet.outlet.id,
          name: userOutlet.outlet.name,
          code: userOutlet.outlet.code,
          address: userOutlet.outlet.address ?? undefined,
        },
      }));
    }),
});
