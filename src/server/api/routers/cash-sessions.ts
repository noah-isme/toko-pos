import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PaymentMethod, Prisma, SaleStatus } from "@/server/db/enums";
import {
  cashSessionSchema,
  cashSessionSummarySchema,
  closeCashSessionInputSchema,
  openCashSessionInputSchema,
} from "@/server/api/schemas/cash-sessions";
import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";
import { writeAuditLog } from "@/server/services/audit";

const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

const mapSession = (session: {
  id: string;
  outletId: string;
  userId: string;
  openingCash: Prisma.Decimal;
  closingCash: Prisma.Decimal | null;
  expectedCash: Prisma.Decimal | null;
  difference: Prisma.Decimal | null;
  openTime: Date;
  closeTime: Date | null;
  user?: { id: string; name: string | null } | null;
}) =>
  cashSessionSchema.parse({
    id: session.id,
    outletId: session.outletId,
    userId: session.userId,
    openingCash: Number(session.openingCash),
    closingCash: session.closingCash ? Number(session.closingCash) : null,
    expectedCash: session.expectedCash ? Number(session.expectedCash) : null,
    difference: session.difference ? Number(session.difference) : null,
    openTime: session.openTime.toISOString(),
    closeTime: session.closeTime ? session.closeTime.toISOString() : null,
    user: session.user ?? undefined,
  });

export const cashSessionsRouter = router({
  getActive: protectedProcedure
    .input(
      z.object({
        outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
      }),
    )
    .output(cashSessionSchema.nullable())
    .query(async ({ input }) => {
      const session = await db.cashSession.findFirst({
        where: {
          outletId: input.outletId,
          closeTime: null,
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          openTime: "desc",
        },
      });

      if (!session) {
        return null;
      }

      return mapSession(session);
    }),
  open: protectedProcedure
    .input(openCashSessionInputSchema)
    .output(cashSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const existing = await db.cashSession.findFirst({
        where: {
          outletId: input.outletId,
          closeTime: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Masih ada shift kasir yang aktif untuk outlet ini.",
        });
      }

      const session = await db.cashSession.create({
        data: {
          outletId: input.outletId,
          userId,
          openingCash: toDecimal(input.openingCash),
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      await writeAuditLog({
        action: "SHIFT_OPEN",
        userId,
        outletId: input.outletId,
        entity: "CASH_SESSION",
        entityId: session.id,
        details: {
          openingCash: input.openingCash,
        },
      });

      return mapSession(session);
    }),
  close: protectedProcedure
    .input(closeCashSessionInputSchema)
    .output(cashSessionSummarySchema)
    .mutation(async ({ input }) => {
      const session = await db.cashSession.findUnique({
        where: { id: input.sessionId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift tidak ditemukan" });
      }

      if (session.closeTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Shift sudah ditutup",
        });
      }

      const now = new Date();

      const cashPayments = await db.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          method: PaymentMethod.CASH,
          sale: {
            outletId: session.outletId,
            soldAt: {
              gte: session.openTime,
              lte: now,
            },
            status: SaleStatus.COMPLETED,
          },
        },
      });

      const cashSalesTotal = Number(cashPayments._sum.amount ?? 0);
      const expectedCash = Number(session.openingCash) + cashSalesTotal;
      const difference = input.closingCash - expectedCash;

      const updated = await db.cashSession.update({
        where: { id: session.id },
        data: {
          closingCash: toDecimal(input.closingCash),
          expectedCash: toDecimal(expectedCash),
          difference: toDecimal(difference),
          closeTime: now,
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      const parsed = mapSession(updated);

      await writeAuditLog({
        action: "SHIFT_CLOSE",
        userId: updated.userId,
        outletId: updated.outletId,
        entity: "CASH_SESSION",
        entityId: updated.id,
        details: {
          closingCash: input.closingCash,
          expectedCash,
          difference,
        },
      });

      return cashSessionSummarySchema.parse({
        ...parsed,
        cashSalesTotal,
      });
    }),
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().min(1),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const rangeStart = input.from ? new Date(input.from) : undefined;
      const rangeEnd = input.to ? new Date(input.to) : undefined;

      const sessions = await db.cashSession.findMany({
        where: {
          outletId: input.outletId,
          openTime: rangeStart
            ? {
                gte: rangeStart,
                lte: rangeEnd ?? undefined,
              }
            : undefined,
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          openTime: "desc",
        },
        take: input.limit,
      });

      return sessions.map(mapSession);
    }),
});
