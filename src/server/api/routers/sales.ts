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
import {
  protectedProcedure,
  router,
  requireActiveShift,
} from "@/server/api/trpc";
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
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Transaksi tidak ditemukan",
    });
  }

  return sale.outletId;
};

export const salesRouter = router({
  getDailySummary: protectedProcedure
    .input(dailySummaryInputSchema)
    .output(dailySummaryOutputSchema)
    .query(async ({ input, ctx }) => {
      console.log("\n\n🚀🚀🚀 ===== getDailySummary CALLED ===== 🚀🚀🚀");
      console.log("📥 INPUT:", JSON.stringify(input, null, 2));
      console.log("👤 USER:", ctx.session.user.id, "-", ctx.session.user.name);
      console.log("=================================================\n");

      try {
        console.log("STEP 1: Parsing date...");
        // Parse date string as local date to avoid timezone issues
        // If date is "2025-12-03", we want 2025-12-03 00:00:00 LOCAL, not UTC
        let baseDate: Date;
        if (input.date) {
          // Handle both ISO datetime string and YYYY-MM-DD format
          const dateStr = input.date.includes("T")
            ? input.date.split("T")[0] // Extract date part from ISO string
            : input.date;

          // Parse YYYY-MM-DD as local date
          const [year, month, day] = dateStr.split("-").map(Number);
          baseDate = new Date(year, month - 1, day);

          // Validate parsed date
          if (isNaN(baseDate.getTime())) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid date: ${input.date}`,
            });
          }
        } else {
          baseDate = new Date();
        }
        console.log("STEP 2: Calculating date range...");
        const rangeStart = startOfDay(baseDate);
        const rangeEnd = endOfDay(baseDate);
        console.log(
          "  Range:",
          rangeStart.toISOString(),
          "to",
          rangeEnd.toISOString(),
        );

        // Get user's role and accessible outlets
        console.log("STEP 3: Fetching user from database...");
        const user = await db.user.findUnique({
          where: { id: ctx.session.user.id },
          include: {
            userOutlets: {
              where: { isActive: true },
              include: { outlet: true },
            },
          },
        });

        if (!user) {
          console.log("  ❌ User not found!");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User tidak ditemukan",
          });
        }
        console.log("  ✓ User found:", user.id, "-", user.role);

        // Build where clause based on role
        console.log("STEP 4: Building where clause...");
        const whereClause: Prisma.SaleWhereInput = {
          soldAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        };

        // If outletId is specified, filter by that outlet
        if (input.outletId) {
          // Check if user has access to this outlet
          const hasAccess = user.userOutlets.some(
            (uo) => uo.outletId === input.outletId,
          );
          if (!hasAccess && user.role === "CASHIER") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Anda tidak memiliki akses ke outlet ini",
            });
          }
          whereClause.outletId = input.outletId;
        } else {
          // No specific outlet - filter by accessible outlets
          const accessibleOutletIds = user.userOutlets.map((uo) => uo.outletId);

          if (accessibleOutletIds.length > 0) {
            whereClause.outletId = { in: accessibleOutletIds };
          } else {
          }
        }

        // CASHIER: Only see their own transactions
        // OWNER/ADMIN: See all transactions in accessible outlets
        if (user.role === "CASHIER") {
          whereClause.cashierId = ctx.session.user.id;
        } else {
        }
        console.log("  ✓ Where clause:", JSON.stringify(whereClause, null, 2));

        console.log("STEP 5: Querying sales from database...");
        const sales = await db.sale.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            payments: true,
          },
          orderBy: {
            soldAt: "desc",
          },
        });
        console.log("  ✓ Found", sales.length, "sales");

        console.log("STEP 6: Calculating totals...");
        const totals = sales.reduce(
          (acc, sale) => {
            const totalItems = sale.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
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
        console.log("  ✓ Totals calculated:", totals);

        console.log("STEP 7: Building response object...");
        const response = {
          date: rangeStart.toISOString(),
          totals,
          sales: sales.map((sale) => ({
            id: sale.id,
            outletId: sale.outletId,
            receiptNumber: sale.receiptNumber,
            totalNet: Number(sale.totalNet),
            soldAt: sale.soldAt.toISOString(),
            paymentMethods: sale.payments.map((payment) => payment.method),
            items: sale.items.map((item) => ({
              productName: item.product?.name || "Unknown",
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
          })),
        };

        console.log("STEP 8: Validating response against schema...");
        // Validate response against schema
        try {
          const validatedResponse = dailySummaryOutputSchema.parse(response);

          // Log response summary
          console.log("\n🎉🎉🎉 ===== getDailySummary SUCCESS ===== 🎉🎉🎉");
          console.log("📊 RESPONSE:", {
            date: validatedResponse.date,
            salesCount: validatedResponse.sales.length,
            totalNet: validatedResponse.totals.totalNet,
            totalItems: validatedResponse.totals.totalItems,
            totalGross: validatedResponse.totals.totalGross,
            totalDiscount: validatedResponse.totals.totalDiscount,
          });
          console.log(
            "🔥 FIRST SALE:",
            validatedResponse.sales[0]
              ? {
                  receipt: validatedResponse.sales[0].receiptNumber,
                  total: validatedResponse.sales[0].totalNet,
                  items: validatedResponse.sales[0].items.length,
                }
              : "NO SALES",
          );
          console.log("=================================================\n\n");

          return validatedResponse;
        } catch (validationError) {
          console.error("\n\n🔥🔥🔥 VALIDATION ERROR 🔥🔥🔥");
          console.error("Error:", validationError);
          console.error(
            "Message:",
            validationError instanceof Error
              ? validationError.message
              : String(validationError),
          );
          if (
            validationError &&
            typeof validationError === "object" &&
            "issues" in validationError
          ) {
            console.error(
              "Zod Issues:",
              JSON.stringify(validationError.issues, null, 2),
            );
          }
          console.error(
            "Response that failed:",
            JSON.stringify(response, null, 2),
          );
          console.error(
            "=================================================\n\n",
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Response validation failed",
            cause: validationError,
          });
        }
      } catch (error) {
        // Catch any unexpected errors
        console.error("\n\n💥💥💥 ===== getDailySummary ERROR ===== 💥💥💥");
        console.error(
          "Type:",
          error instanceof Error ? error.constructor.name : typeof error,
        );
        console.error(
          "❌ ERROR MESSAGE:",
          error instanceof Error ? error.message : String(error),
        );
        console.error("📥 INPUT WAS:", {
          date: input.date,
          outletId: input.outletId,
        });
        if (error instanceof Error) {
          console.error("📚 STACK TRACE:");
          console.error(error.stack);
        } else {
          console.error("📚 RAW ERROR:", error);
        }
        console.error("=================================================\n\n");

        // Re-throw as TRPCError if not already one
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          cause: error,
        });
      }
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
                  total: toDecimal(
                    item.unitPrice * item.quantity - item.discount,
                  ),
                  taxAmount:
                    input.applyTax &&
                    (item.taxable ?? true) &&
                    financials.taxableBase > 0
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaksi tidak ditemukan",
          });
        }

        if (sale.status !== SaleStatus.COMPLETED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transaksi sudah diproses sebelumnya",
          });
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

        const totalItems = sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaksi tidak ditemukan",
          });
        }

        if (sale.status !== SaleStatus.COMPLETED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transaksi tidak dapat direfund",
          });
        }

        if (sale.refunds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Refund sudah diproses",
          });
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

        const totalItems = sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

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

      const currentBuckets = new Map<
        string,
        { totalNet: number; count: number }
      >();
      const previousBuckets = new Map<
        string,
        { totalNet: number; count: number }
      >();

      for (const sale of sales) {
        const soldAt =
          sale.soldAt instanceof Date ? sale.soldAt : new Date(sale.soldAt);
        const bucketDate = startOfDay(soldAt);
        const bucketKey = bucketDate.toISOString();
        const target =
          bucketDate >= currentPeriodStart ? currentBuckets : previousBuckets;
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
          : ((summary.currentTotalNet - summary.previousTotalNet) /
              summary.previousTotalNet) *
            100;

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
