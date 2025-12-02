import { TRPCError } from "@trpc/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { z } from "zod";

import { PaymentMethod, Prisma, SaleStatus } from "@/server/db/enums";
import { env } from "@/env";
import { generateReceiptPdf } from "@/lib/pdf";
import {
  dailySummaryInputSchema,
  dailySummaryOutputSchema,
  forecastInputSchema,
  forecastOutputSchema,
  listRecentInputSchema,
  recentSalesOutputSchema,
  recordSaleInputSchema,
  recordSaleOutputSchema,
  printReceiptInputSchema,
  printReceiptOutputSchema,
  refundSaleInputSchema,
  refundSaleOutputSchema,
  saleActionOutputSchema,
  receiptListInputSchema,
  receiptListOutputSchema,
  weeklyTrendInputSchema,
  weeklyTrendOutputSchema,
  voidSaleInputSchema,
} from "@/server/api/schemas/sales";
import {
  SaleValidationError,
  calculateFinancials,
  ensurePaymentsCoverTotal,
  enforceDiscountLimit,
  normalizePaperSize,
} from "@/server/api/services/sales-validation";
import { db } from "@/server/db";
import { protectedProcedure, router, requireActiveShift } from "@/server/api/trpc";
import { writeAuditLog } from "@/server/services/audit";
import { evaluateLowStock } from "@/server/services/lowStock";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

type RecordSaleInput = z.infer<typeof recordSaleInputSchema>;
type VoidSaleInput = z.infer<typeof voidSaleInputSchema>;
type RefundSaleInput = z.infer<typeof refundSaleInputSchema>;

const resolveSaleOutlet = async (saleId: string) => {
  const sale = await db.sale.findUnique({
    where: { id: saleId },
    select: { outletId: true },
  });

  if (!sale) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
  }

  return sale.outletId;
};

export const salesRouter = router({
  getDailySummary: protectedProcedure
    .input(dailySummaryInputSchema)
    .output(dailySummaryOutputSchema)
    .query(async ({ input, ctx }) => {
      const baseDate = input.date ? new Date(input.date) : new Date();
      const rangeStart = startOfDay(baseDate);
      const rangeEnd = endOfDay(baseDate);

      const sales = await db.sale.findMany({
        where: {
          soldAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
          outletId: input.outletId ?? undefined,
          cashierId: ctx.session?.user.id,
        },
        include: {
          items: true,
          payments: true,
        },
        orderBy: {
          soldAt: "desc",
        },
      });

      const totals = sales.reduce(
        (acc, sale) => {
          const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          const cashPaid = sale.payments
            .filter((payment) => payment.method === PaymentMethod.CASH)
            .reduce((sum, payment) => sum + Number(payment.amount), 0);

          acc.totalGross += Number(sale.totalGross);
          acc.totalDiscount += Number(sale.discountTotal);
          acc.totalNet += Number(sale.totalNet);
          acc.totalItems += totalItems;
          acc.totalCash += cashPaid;
          acc.totalTax += sale.taxAmount ? Number(sale.taxAmount) : 0;

          return acc;
        },
        {
          totalGross: 0,
          totalDiscount: 0,
          totalNet: 0,
          totalItems: 0,
          totalCash: 0,
          totalTax: 0,
        },
      );

      return dailySummaryOutputSchema.parse({
        date: rangeStart.toISOString(),
        totals,
        sales: sales.map((sale) => ({
          id: sale.id,
          outletId: sale.outletId,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
          paymentMethods: sale.payments.map((payment) => payment.method),
        })),
      });
    }),
  listRecent: protectedProcedure
    .input(listRecentInputSchema)
    .output(recentSalesOutputSchema)
    .query(async ({ input, ctx }) => {
      // Get user's current outlet from database (first active outlet)
      const userOutlet = await db.userOutlet.findFirst({
        where: {
          userId: ctx.session.user.id,
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

      if (!userOutlet) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User tidak memiliki akses ke outlet manapun",
        });
      }

      const sales = await db.sale.findMany({
        where: {
          outletId: userOutlet.outletId,
        },
        take: input.limit,
        orderBy: {
          soldAt: "desc",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return recentSalesOutputSchema.parse(
        sales.map((sale) => ({
          id: sale.id,
          outletId: sale.outletId,
          receiptNumber: sale.receiptNumber,
          soldAt: sale.soldAt.toISOString(),
          totalNet: Number(sale.totalNet),
          totalItems: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          status: sale.status,
          items: sale.items.map((item) => ({
            productName: item.product?.name ?? "Produk",
            quantity: item.quantity,
          })),
        })),
      );
    }),
  getReceiptsByOutlet: protectedProcedure
    .input(receiptListInputSchema)
    .output(receiptListOutputSchema)
    .query(async ({ input, ctx }) => {
      const membership = await db.userOutlet.findFirst({
        where: {
          userId: ctx.session.user.id,
          outletId: input.outletId,
          isActive: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses ke outlet ini",
        });
      }

      const sales = await db.sale.findMany({
        where: {
          outletId: input.outletId,
        },
        orderBy: {
          soldAt: "desc",
        },
        include: {
          cashier: {
            select: { name: true },
          },
          payments: true,
          session: true,
        },
        take: input.limit,
      });

      return receiptListOutputSchema.parse(
        sales.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          soldAt: sale.soldAt.toISOString(),
          cashierName: sale.cashier?.name ?? null,
          totalNet: Number(sale.totalNet),
          paymentMethods: sale.payments.map((payment) => payment.method),
          status: sale.status,
          shiftOpenedAt: sale.session?.openTime
            ? sale.session.openTime.toISOString()
            : null,
        })),
      );
    }),
  recordSale: protectedProcedure
    .input(recordSaleInputSchema)
    .use(
      requireActiveShift(({ input }: { input: RecordSaleInput }) => ({
        outletId: input.outletId,
      })),
    )
    .output(recordSaleOutputSchema)
    .mutation(async ({ input: rawInput, ctx }) => {
      const input = recordSaleInputSchema.parse(rawInput);
      try {
        if (!ctx.activeShift) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Shift kasir belum aktif.",
          });
        }

        const financials = calculateFinancials({
          items: input.items,
          discountTotal: input.discountTotal,
          applyTax: input.applyTax,
          taxRate: input.taxRate,
          taxMode: input.taxMode,
        });

        enforceDiscountLimit(
          financials.totalGross,
          financials.totalDiscount,
          env.DISCOUNT_LIMIT_PERCENT,
        );

        ensurePaymentsCoverTotal(input.payments, financials.totalNet);

        const affectedKeys = new Set<string>();

        const sale = await db.$transaction(async (tx) => {
          const createdSale = await tx.sale.create({
            data: {
              receiptNumber: input.receiptNumber,
              outletId: input.outletId,
              cashierId: ctx.session?.user.id,
              sessionId: ctx.activeShift.id,
              soldAt: input.soldAt ? new Date(input.soldAt) : new Date(),
            totalGross: toDecimal(financials.totalGross),
            discountTotal: toDecimal(financials.totalDiscount),
            totalNet: toDecimal(financials.totalNet),
            taxRate:
              input.applyTax && input.taxRate
                ? toDecimal(input.taxRate)
                : undefined,
            taxAmount: financials.taxAmount
              ? toDecimal(financials.taxAmount)
              : undefined,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: toDecimal(item.unitPrice),
                discount: toDecimal(item.discount),
                total: toDecimal(item.unitPrice * item.quantity - item.discount),
                taxAmount:
                  input.applyTax && (item.taxable ?? true) && financials.taxableBase > 0
                    ? toDecimal(
                        ((item.unitPrice * item.quantity - item.discount) /
                          financials.taxableBase) *
                          financials.taxAmount,
                      )
                    : undefined,
              })),
            },
            payments: {
              create: input.payments.map((payment) => ({
                method: payment.method,
                amount: toDecimal(payment.amount),
                reference: payment.reference,
              })),
            },
          },
          include: {
            items: true,
            payments: true,
          },
        });

          await Promise.all(
            input.items.map(async (item) => {
              const inventory = await tx.inventory.upsert({
                where: {
                  productId_outletId: {
                    productId: item.productId,
                    outletId: input.outletId,
                  },
                },
                create: {
                  productId: item.productId,
                  outletId: input.outletId,
                  quantity: -item.quantity,
                  costPrice: toDecimal(item.unitPrice),
                },
                update: {
                  quantity: {
                    decrement: item.quantity,
                  },
                },
              });

              await tx.stockMovement.create({
                data: {
                  inventoryId: inventory.id,
                  type: "SALE",
                  quantity: -item.quantity,
                  reference: createdSale.id,
                  note: `Penjualan ${createdSale.receiptNumber}`,
                  createdById: ctx.session?.user.id,
                  productId: item.productId,
                  outletId: input.outletId,
                  relatedSaleId: createdSale.id,
                },
              });

              affectedKeys.add(`${item.productId}:${input.outletId}`);
            }),
          );

          const lowStockResults = await Promise.all(
            Array.from(affectedKeys).map((key) => {
              const [productId, outletId] = key.split(":");
              return evaluateLowStock(
                {
                  productId,
                  outletId,
                },
                tx,
              );
            }),
          );

          for (const result of lowStockResults) {
            if (result && result.status === "triggered") {
              const alert = result.alert;
              await writeAuditLog(
                {
                  action: "LOW_STOCK_TRIGGER",
                  userId: ctx.session?.user.id,
                  outletId: alert.outletId,
                  entity: "LOW_STOCK_ALERT",
                  entityId: alert.id,
                  details: {
                    productId: alert.productId,
                  },
                },
                tx,
              );
            }
          }

          await writeAuditLog(
            {
              action: "SALE_RECORD",
              userId: ctx.session?.user.id,
              outletId: input.outletId,
              entity: "SALE",
              entityId: createdSale.id,
              details: {
                receiptNumber: createdSale.receiptNumber,
                totalNet: Number(createdSale.totalNet),
              },
            },
            tx,
          );

          return createdSale;
        });

        return recordSaleOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
          taxAmount: sale.taxAmount ? Number(sale.taxAmount) : null,
        });
      } catch (error) {
        if (error instanceof SaleValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        throw error;
      }
    }),
  printReceipt: protectedProcedure
    .input(printReceiptInputSchema)
    .output(printReceiptOutputSchema)
    .mutation(async ({ input }) => {
      const sale = await db.sale.findUnique({
        where: {
          id: input.saleId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          outlet: true,
          cashier: true,
        },
      });

      if (!sale) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
      }

      const paperSize = normalizePaperSize(input.paperSize);
      const pdf = await generateReceiptPdf({
        sale,
        items: sale.items,
        payments: sale.payments,
        paperSize,
      });

      return printReceiptOutputSchema.parse({
        filename: `${sale.receiptNumber}.pdf`,
        base64: Buffer.from(pdf).toString("base64"),
      });
    }),
  voidSale: protectedProcedure
    .input(voidSaleInputSchema)
    .use(
      requireActiveShift(async ({ input }: { input: VoidSaleInput }) => ({
        outletId: await resolveSaleOutlet(input.saleId),
      })),
    )
    .output(saleActionOutputSchema)
    .mutation(async ({ input: rawInput, ctx }) => {
      const input = voidSaleInputSchema.parse(rawInput);
      return await db.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: {
            id: input.saleId,
          },
          include: {
            items: true,
          },
        });

        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
        }

        if (sale.status !== SaleStatus.COMPLETED) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi sudah diproses sebelumnya" });
        }

        let restockedQuantity = 0;
        const affectedKeys = new Set<string>();

        for (const item of sale.items) {
          restockedQuantity += item.quantity;
          const inventory = await tx.inventory.upsert({
            where: {
              productId_outletId: {
                productId: item.productId,
                outletId: sale.outletId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              outletId: sale.outletId,
              quantity: item.quantity,
              costPrice: toDecimal(Number(item.unitPrice)),
            },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              reference: sale.id,
              note: `Void struk ${sale.receiptNumber}`,
              createdById: ctx.session?.user.id,
              productId: item.productId,
              outletId: sale.outletId,
              relatedSaleId: sale.id,
            },
          });

          affectedKeys.add(`${item.productId}:${sale.outletId}`);
        }

        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: SaleStatus.VOIDED,
            updatedAt: new Date(),
          },
        });

        const lowStockResults = await Promise.all(
          Array.from(affectedKeys).map((key) => {
            const [productId, outletId] = key.split(":");
            return evaluateLowStock({ productId, outletId }, tx);
          }),
        );

        for (const result of lowStockResults) {
          if (result && result.status === "triggered") {
            const alert = result.alert;
            await writeAuditLog(
              {
                action: "LOW_STOCK_TRIGGER",
                userId: ctx.session?.user.id,
                outletId: alert.outletId,
                entity: "LOW_STOCK_ALERT",
                entityId: alert.id,
                details: {
                  productId: alert.productId,
                },
              },
              tx,
            );
          }
        }

        await writeAuditLog(
          {
            action: "SALE_VOID",
            userId: ctx.session?.user.id,
            outletId: sale.outletId,
            entity: "SALE",
            entityId: sale.id,
            details: {
              receiptNumber: sale.receiptNumber,
              reason: input.reason,
              restockedQuantity,
            },
          },
          tx,
        );

        return saleActionOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          totalItems,
          restockedQuantity,
          status: SaleStatus.VOIDED,
        });
      });
    }),
  refundSale: protectedProcedure
    .input(refundSaleInputSchema)
    .use(
      requireActiveShift(async ({ input }: { input: RefundSaleInput }) => ({
        outletId: await resolveSaleOutlet(input.saleId),
      })),
    )
    .output(refundSaleOutputSchema)
    .mutation(async ({ input: rawInput, ctx }) => {
      const input = refundSaleInputSchema.parse(rawInput);
      return await db.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: {
            id: input.saleId,
          },
          include: {
            items: true,
            refunds: true,
          },
        });

        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan" });
        }

        if (sale.status !== SaleStatus.COMPLETED) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi tidak dapat direfund" });
        }

        if (sale.refunds.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Refund sudah diproses" });
        }

        const refundAmount = input.amount ?? Number(sale.totalNet);
        let restockedQuantity = 0;
        const affectedKeys = new Set<string>();

        for (const item of sale.items) {
          restockedQuantity += item.quantity;
          const inventory = await tx.inventory.upsert({
            where: {
              productId_outletId: {
                productId: item.productId,
                outletId: sale.outletId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              outletId: sale.outletId,
              quantity: item.quantity,
              costPrice: toDecimal(Number(item.unitPrice)),
            },
          });

          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              reference: sale.id,
              note: `Refund struk ${sale.receiptNumber}`,
              createdById: ctx.session?.user.id,
              productId: item.productId,
              outletId: sale.outletId,
              relatedSaleId: sale.id,
            },
          });

          affectedKeys.add(`${item.productId}:${sale.outletId}`);
        }

        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: SaleStatus.REFUNDED,
            updatedAt: new Date(),
          },
        });

        const refund = await tx.refund.create({
          data: {
            saleId: sale.id,
            amount: toDecimal(refundAmount),
            reason: input.reason,
            approvedById: ctx.session?.user.id,
            createdById: ctx.session?.user.id,
            items: {
              create: sale.items.map((item) => ({
                saleItemId: item.id,
                quantity: item.quantity,
              })),
            },
          },
        });

        const lowStockResults = await Promise.all(
          Array.from(affectedKeys).map((key) => {
            const [productId, outletId] = key.split(":");
            return evaluateLowStock({ productId, outletId }, tx);
          }),
        );

        for (const result of lowStockResults) {
          if (result && result.status === "triggered") {
            const alert = result.alert;
            await writeAuditLog(
              {
                action: "LOW_STOCK_TRIGGER",
                userId: ctx.session?.user.id,
                outletId: alert.outletId,
                entity: "LOW_STOCK_ALERT",
                entityId: alert.id,
                details: {
                  productId: alert.productId,
                },
              },
              tx,
            );
          }
        }

        await writeAuditLog(
          {
            action: "SALE_REFUND",
            userId: ctx.session?.user.id,
            outletId: sale.outletId,
            entity: "REFUND",
            entityId: refund.id,
            details: {
              receiptNumber: sale.receiptNumber,
              amount: refundAmount,
              reason: input.reason,
            },
          },
          tx,
        );

        return refundSaleOutputSchema.parse({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          totalItems,
          restockedQuantity,
          status: SaleStatus.REFUNDED,
          refundAmount,
        });
      });
    }),
  forecastNextDay: protectedProcedure
    .input(forecastInputSchema)
    .output(forecastOutputSchema)
    .query(async ({ input }) => {
      const today = startOfDay(new Date());
      const weekAgo = addDays(today, -7);

      const aggregates = await db.sale.groupBy({
        by: ["outletId"],
        where: {
          soldAt: {
            gte: weekAgo,
            lt: today,
          },
          outletId: input.outletId,
        },
        _sum: {
          totalNet: true,
        },
        _count: {
          _all: true,
        },
      });

      const summary = aggregates[0];

      if (!summary || !summary._sum.totalNet) {
        return {
          suggestedFloat: 0,
        };
      }

      const averageDailySales = Number(summary._sum.totalNet) / 7;

      return forecastOutputSchema.parse({
        suggestedFloat: Number(averageDailySales.toFixed(2)),
      });
    }),
  getWeeklyTrend: protectedProcedure
    .input(weeklyTrendInputSchema)
    .output(weeklyTrendOutputSchema)
    .query(async ({ input }) => {
      const now = endOfDay(new Date());
      const currentPeriodStart = startOfDay(addDays(now, -6));
      const previousPeriodStart = startOfDay(addDays(currentPeriodStart, -7));

      const sales = await db.sale.findMany({
        where: {
          soldAt: {
            gte: previousPeriodStart,
            lte: now,
          },
          outletId: input.outletId ?? undefined,
          status: SaleStatus.COMPLETED,
          payments: input.paymentMethod
            ? {
                some: {
                  method: input.paymentMethod,
                },
              }
            : undefined,
        },
        include: {
          payments: true,
        },
      });

      const currentBuckets = new Map<string, { totalNet: number; count: number }>();
      const previousBuckets = new Map<string, { totalNet: number; count: number }>();

      for (const sale of sales) {
        const soldAt = sale.soldAt instanceof Date ? sale.soldAt : new Date(sale.soldAt);
        const bucketDate = startOfDay(soldAt);
        const bucketKey = bucketDate.toISOString();
        const target = bucketDate >= currentPeriodStart ? currentBuckets : previousBuckets;
        const existing = target.get(bucketKey) ?? { totalNet: 0, count: 0 };
        existing.totalNet += Number(sale.totalNet);
        existing.count += 1;
        target.set(bucketKey, existing);
      }

      const series = Array.from({ length: 7 }, (_, index) => {
        const day = startOfDay(addDays(currentPeriodStart, index));
        const key = day.toISOString();
        const stats = currentBuckets.get(key) ?? { totalNet: 0, count: 0 };
        return {
          date: key,
          totalNet: Number(stats.totalNet.toFixed(2)),
          transactionCount: stats.count,
        };
      });

      const summary = series.reduce(
        (acc, point) => {
          acc.currentTotalNet += point.totalNet;
          acc.currentTransactionCount += point.transactionCount;
          return acc;
        },
        {
          currentTotalNet: 0,
          currentTransactionCount: 0,
          previousTotalNet: 0,
          previousTransactionCount: 0,
        },
      );

      for (let i = 0; i < 7; i++) {
        const day = startOfDay(addDays(previousPeriodStart, i));
        const key = day.toISOString();
        const stats = previousBuckets.get(key) ?? { totalNet: 0, count: 0 };
        summary.previousTotalNet += stats.totalNet;
        summary.previousTransactionCount += stats.count;
      }

      const changePercent =
        summary.previousTotalNet === 0
          ? summary.currentTotalNet > 0
            ? 100
            : 0
          : ((summary.currentTotalNet - summary.previousTotalNet) / summary.previousTotalNet) * 100;

      return weeklyTrendOutputSchema.parse({
        series,
        summary: {
          currentTotalNet: Number(summary.currentTotalNet.toFixed(2)),
          previousTotalNet: Number(summary.previousTotalNet.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          currentTransactionCount: summary.currentTransactionCount,
          previousTransactionCount: summary.previousTransactionCount,
        },
      });
    }),
});
