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
  assertOutletAccess,
  getUserAccess,
} from "@/server/api/utils/access";
import { Role } from "@/server/db/enums";
import {
  outletListOutputSchema,
  outletUpsertInputSchema,
  stockTransferListInputSchema,
  stockTransferListOutputSchema,
  stockTransferItemSchema,
  createStockTransferInputSchema,
  stockTransferActionInputSchema,
  receiveStockInputSchema,
  receiveStockResultSchema,
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
      let userId = ctx.session.user.id;
      const userEmail = ctx.session.user.email;
      const userRole = ctx.session.user.role;

      let userOutlets = await db.userOutlet.findMany({
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

      if (userOutlets.length === 0 && userEmail) {
        const freshUser = await db.user.findUnique({
          where: { email: userEmail },
        });
        if (freshUser) {
          userId = freshUser.id;
          userOutlets = await db.userOutlet.findMany({
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
        }
      }

      if (userOutlets.length === 0) {
        const allOutlets = await db.outlet.findMany({
          orderBy: { name: "asc" },
        });
        return allOutlets.map((outlet) => ({
          id: `auto-${outlet.id}`,
          outletId: outlet.id,
          role: (userRole ?? "OWNER") as "OWNER" | "MANAGER" | "CASHIER",
          outlet: {
            id: outlet.id,
            name: outlet.name,
            code: outlet.code,
            address: outlet.address ?? undefined,
          },
        }));
      }

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

  // -----------------------------------------------------------------
  // Stock Transfer approval workflow (PENDING → APPROVED → COMPLETED)
  // -----------------------------------------------------------------

  listStockTransfers: protectedOutletProcedure
    .input(stockTransferListInputSchema)
    .output(stockTransferListOutputSchema)
    .query(async ({ input }) => {
      const transfers = await db.stockTransfer.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          fromOutlet: true,
          toOutlet: true,
          product: true,
          requestedBy: true,
          approvedBy: true,
        },
        orderBy: {
          requestedAt: "desc",
        },
      });

      return stockTransferListOutputSchema.parse(
        transfers.map((t) => ({
          id: t.id,
          transferNumber: t.transferNumber,
          fromOutletId: t.fromOutletId,
          toOutletId: t.toOutletId,
          fromOutletName: t.fromOutlet.name,
          toOutletName: t.toOutlet.name,
          productId: t.productId,
          productName: t.product.name,
          productSku: t.product.sku,
          quantity: t.quantity,
          costPrice: Number(t.costPrice),
          status: t.status as "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED",
          requestedById: t.requestedById,
          requestedByName: t.requestedBy?.name ?? null,
          approvedById: t.approvedById ?? null,
          approvedByName: t.approvedBy?.name ?? null,
          notes: t.notes,
          requestedAt: t.requestedAt.toISOString(),
          approvedAt: t.approvedAt?.toISOString() ?? null,
          completedAt: t.completedAt?.toISOString() ?? null,
        })),
      );
    }),

  createStockTransfer: requireOutletAccess(({ input }) => [
    input.fromOutletId,
    input.toOutletId,
  ])
    .input(createStockTransferInputSchema)
    .output(stockTransferItemSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      if (input.fromOutletId === input.toOutletId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Outlet asal dan tujuan harus berbeda",
        });
      }

      const product = await db.product.findUnique({
        where: { id: input.productId },
        select: { id: true, name: true, sku: true, costPrice: true },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan",
        });
      }

      const count = await db.stockTransfer.count();
      const transferNumber = `TRF-${String(count + 1).padStart(4, "0")}`;

      const transfer = await db.stockTransfer.create({
        data: {
          transferNumber,
          fromOutletId: input.fromOutletId,
          toOutletId: input.toOutletId,
          productId: input.productId,
          quantity: input.quantity,
          costPrice: product.costPrice ?? 0,
          status: "PENDING",
          requestedById: userId,
          notes: input.notes,
        },
        include: {
          fromOutlet: true,
          toOutlet: true,
          product: true,
          requestedBy: true,
          approvedBy: true,
        },
      });

      return stockTransferItemSchema.parse({
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        fromOutletId: transfer.fromOutletId,
        toOutletId: transfer.toOutletId,
        fromOutletName: transfer.fromOutlet.name,
        toOutletName: transfer.toOutlet.name,
        productId: transfer.productId,
        productName: transfer.product.name,
        productSku: transfer.product.sku,
        quantity: transfer.quantity,
        costPrice: Number(transfer.costPrice),
        status: transfer.status,
        requestedById: transfer.requestedById,
        requestedByName: transfer.requestedBy?.name ?? null,
        approvedById: transfer.approvedById ?? null,
        approvedByName: transfer.approvedBy?.name ?? null,
        notes: transfer.notes,
        requestedAt: transfer.requestedAt.toISOString(),
        approvedAt: transfer.approvedAt?.toISOString() ?? null,
        completedAt: transfer.completedAt?.toISOString() ?? null,
      });
    }),

  approveStockTransfer: protectedProcedure
    .input(stockTransferActionInputSchema)
    .output(stockTransferItemSchema)
    .mutation(async ({ input, ctx }) => {
      const { role } = await getUserAccess(
        ctx.session.user.id,
        ctx.session.user.email,
      );
      assertAdminOrOwner(role);
      const userId = ctx.session.user.id;

      const transfer = await db.stockTransfer.findUnique({
        where: { id: input.id },
      });

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer tidak ditemukan",
        });
      }

      if (transfer.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya transfer dengan status PENDING yang dapat disetujui",
        });
      }

      const updated = await db.stockTransfer.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt: new Date(),
        },
        include: {
          fromOutlet: true,
          toOutlet: true,
          product: true,
          requestedBy: true,
          approvedBy: true,
        },
      });

      return stockTransferItemSchema.parse({
        id: updated.id,
        transferNumber: updated.transferNumber,
        fromOutletId: updated.fromOutletId,
        toOutletId: updated.toOutletId,
        fromOutletName: updated.fromOutlet.name,
        toOutletName: updated.toOutlet.name,
        productId: updated.productId,
        productName: updated.product.name,
        productSku: updated.product.sku,
        quantity: updated.quantity,
        costPrice: Number(updated.costPrice),
        status: updated.status,
        requestedById: updated.requestedById,
        requestedByName: updated.requestedBy?.name ?? null,
        approvedById: updated.approvedById ?? null,
        approvedByName: updated.approvedBy?.name ?? null,
        notes: updated.notes,
        requestedAt: updated.requestedAt.toISOString(),
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        completedAt: updated.completedAt?.toISOString() ?? null,
      });
    }),

  rejectStockTransfer: protectedProcedure
    .input(stockTransferActionInputSchema)
    .output(stockTransferItemSchema)
    .mutation(async ({ input, ctx }) => {
      const { role } = await getUserAccess(
        ctx.session.user.id,
        ctx.session.user.email,
      );
      assertAdminOrOwner(role);

      const transfer = await db.stockTransfer.findUnique({
        where: { id: input.id },
      });

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer tidak ditemukan",
        });
      }

      if (transfer.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya transfer dengan status PENDING yang dapat ditolak",
        });
      }

      const updated = await db.stockTransfer.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
        },
        include: {
          fromOutlet: true,
          toOutlet: true,
          product: true,
          requestedBy: true,
          approvedBy: true,
        },
      });

      return stockTransferItemSchema.parse({
        id: updated.id,
        transferNumber: updated.transferNumber,
        fromOutletId: updated.fromOutletId,
        toOutletId: updated.toOutletId,
        fromOutletName: updated.fromOutlet.name,
        toOutletName: updated.toOutlet.name,
        productId: updated.productId,
        productName: updated.product.name,
        productSku: updated.product.sku,
        quantity: updated.quantity,
        costPrice: Number(updated.costPrice),
        status: updated.status,
        requestedById: updated.requestedById,
        requestedByName: updated.requestedBy?.name ?? null,
        approvedById: updated.approvedById ?? null,
        approvedByName: updated.approvedBy?.name ?? null,
        notes: updated.notes,
        requestedAt: updated.requestedAt.toISOString(),
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        completedAt: updated.completedAt?.toISOString() ?? null,
      });
    }),

  completeStockTransfer: protectedProcedure
    .input(stockTransferActionInputSchema)
    .output(stockTransferItemSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const outletAccess = await getUserAccess(
        userId,
        ctx.session.user.email,
      );

      const transfer = await db.stockTransfer.findUnique({
        where: { id: input.id },
        include: {
          fromOutlet: true,
          toOutlet: true,
          product: true,
        },
      });

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer tidak ditemukan",
        });
      }

      assertOutletAccess(
        outletAccess.role,
        outletAccess.outletIds,
        transfer.fromOutletId,
      );

      if (transfer.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya transfer dengan status APPROVED yang dapat diselesaikan",
        });
      }

      return await db.$transaction(async (tx) => {
        const source = await tx.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: transfer.productId,
              outletId: transfer.fromOutletId,
            },
          },
        });

        if (!source || source.quantity < transfer.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stok di outlet asal tidak mencukupi untuk menyelesaikan transfer",
          });
        }

        const updatedSource = await tx.inventory.update({
          where: { id: source.id },
          data: {
            quantity: {
              decrement: transfer.quantity,
            },
          },
        });

        const target = await tx.inventory.upsert({
          where: {
            productId_outletId: {
              productId: transfer.productId,
              outletId: transfer.toOutletId,
            },
          },
          update: {
            quantity: {
              increment: transfer.quantity,
            },
          },
          create: {
            productId: transfer.productId,
            outletId: transfer.toOutletId,
            quantity: transfer.quantity,
          },
        });

        await tx.stockMovement.createMany({
          data: [
            {
              inventoryId: updatedSource.id,
              type: "TRANSFER_OUT",
              quantity: -transfer.quantity,
              note: `Transfer ${transfer.transferNumber}`,
              createdById: userId,
              productId: transfer.productId,
              outletId: transfer.fromOutletId,
            },
            {
              inventoryId: target.id,
              type: "TRANSFER_IN",
              quantity: transfer.quantity,
              note: `Transfer ${transfer.transferNumber}`,
              createdById: userId,
              productId: transfer.productId,
              outletId: transfer.toOutletId,
            },
          ],
        });

        const completed = await tx.stockTransfer.update({
          where: { id: input.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
          include: {
            fromOutlet: true,
            toOutlet: true,
            product: true,
            requestedBy: true,
            approvedBy: true,
          },
        });

        return stockTransferItemSchema.parse({
          id: completed.id,
          transferNumber: completed.transferNumber,
          fromOutletId: completed.fromOutletId,
          toOutletId: completed.toOutletId,
          fromOutletName: completed.fromOutlet.name,
          toOutletName: completed.toOutlet.name,
          productId: completed.productId,
          productName: completed.product.name,
          productSku: completed.product.sku,
          quantity: completed.quantity,
          costPrice: Number(completed.costPrice),
          status: completed.status,
          requestedById: completed.requestedById,
          requestedByName: completed.requestedBy?.name ?? null,
          approvedById: completed.approvedById ?? null,
          approvedByName: completed.approvedBy?.name ?? null,
          notes: completed.notes,
          requestedAt: completed.requestedAt.toISOString(),
          approvedAt: completed.approvedAt?.toISOString() ?? null,
          completedAt: completed.completedAt?.toISOString() ?? null,
        });
      },
      { timeout: 30000, maxWait: 10000 },
    );
  }),

  // -----------------------------------------------------------------
  // Supplier receiving (penerimaan barang)
  // -----------------------------------------------------------------

  receiveStock: requireOutletAccess(({ input }) => input.outletId)
    .input(receiveStockInputSchema)
    .output(receiveStockResultSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const supplier = await db.supplier.findUnique({
        where: { id: input.supplierId },
        select: { id: true, name: true },
      });

      if (!supplier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplier tidak ditemukan",
        });
      }

      const productIds = input.items.map((i) => i.productId);
      const products = await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, supplierId: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of input.items) {
        if (!productMap.has(item.productId)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Produk dengan ID ${item.productId} tidak ditemukan`,
          });
        }
      }

      const reference = input.invoiceNumber
        ? `INV-${input.invoiceNumber}`
        : undefined;
      const note = input.notes
        ? `Penerimaan dari ${supplier.name}${input.notes ? ` — ${input.notes}` : ""}`
        : `Penerimaan dari ${supplier.name}`;

      return await db.$transaction(
        async (tx) => {
          const results: Array<{
            productId: string;
            productName: string;
            quantity: number;
            costPrice: number;
            newStockLevel: number;
          }> = [];

          for (const item of input.items) {
            const product = productMap.get(item.productId)!;

            // Link product to supplier if not already linked
            if (!product.supplierId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { supplierId: input.supplierId },
              });
            }

            // Update product costPrice
            await tx.product.update({
              where: { id: item.productId },
              data: {
                costPrice: item.costPrice,
              },
            });

            // Upsert inventory (increment existing or create new)
            const existing = await tx.inventory.findUnique({
              where: {
                productId_outletId: {
                  productId: item.productId,
                  outletId: input.outletId,
                },
              },
            });

            const inventory = existing
              ? await tx.inventory.update({
                  where: { id: existing.id },
                  data: {
                    quantity: { increment: item.quantity },
                    costPrice: item.costPrice,
                  },
                })
              : await tx.inventory.create({
                  data: {
                    productId: item.productId,
                    outletId: input.outletId,
                    quantity: item.quantity,
                    costPrice: item.costPrice,
                  },
                });

            await tx.stockMovement.create({
              data: {
                inventoryId: inventory.id,
                type: "PURCHASE",
                quantity: item.quantity,
                reference,
                note,
                createdById: userId,
                productId: item.productId,
                outletId: input.outletId,
              },
            });

            results.push({
              productId: item.productId,
              productName: product.name,
              quantity: item.quantity,
              costPrice: item.costPrice,
              newStockLevel: inventory.quantity,
            });
          }

          return receiveStockResultSchema.parse({
            supplierId: supplier.id,
            supplierName: supplier.name,
            outletId: input.outletId,
            invoiceNumber: input.invoiceNumber ?? null,
            items: results,
          });
        },
        { timeout: 30000, maxWait: 10000 },
      );
    }),
});
