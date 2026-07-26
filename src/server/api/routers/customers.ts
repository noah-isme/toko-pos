import { Prisma } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { CustomerTier, DiscountApprovalStatus, RefundStatus, Role } from "@prisma/client";

import { db } from "@/server/db";
import {
  getOutletAccessFromContext,
  protectedOutletProcedure,
  requireOutletAccess,
  router,
} from "@/server/api/trpc";
import { assertAdminOrOwner } from "@/server/api/utils/access";

const toNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
};

const customerListInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  search: z.string().optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  isActive: z.boolean().optional(),
  take: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const customerCreateInputSchema = z.object({
  name: z.string().min(1, { message: "Nama wajib diisi" }),
  email: z.string().email({ message: "Email tidak valid" }).optional().or(z.literal("")),
  phone: z.string().min(10, { message: "Nomor telepon minimal 10 digit" }).optional().or(z.literal("")),
  membershipCard: z.string().optional().or(z.literal("")),
  tier: z.nativeEnum(CustomerTier).default(CustomerTier.REGULAR),
  birthDate: z.string().datetime().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
});

const customerUpdateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { message: "Nama wajib diisi" }).optional(),
  email: z.string().email({ message: "Email tidak valid" }).optional().or(z.literal("")),
  phone: z.string().min(10, { message: "Nomor telepon minimal 10 digit" }).optional().or(z.literal("")),
  membershipCard: z.string().optional().or(z.literal("")),
  tier: z.nativeEnum(CustomerTier).optional(),
  birthDate: z.string().datetime().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

const customerPointAdjustInputSchema = z.object({
  customerId: z.string().min(1),
  points: z.number().int(),
  type: z.enum(["EARNED", "REDEEMED", "EXPIRED", "ADJUSTED"]),
  reference: z.string().optional(),
  outletId: z.string().min(1),
});

const refundApprovalInputSchema = z.object({
  refundId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

const discountApprovalInputSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

const discountApprovalListInputSchema = z.object({
  outletId: z.string().min(1),
  status: z.nativeEnum(DiscountApprovalStatus).optional(),
  take: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const refundApprovalListInputSchema = z.object({
  outletId: z.string().min(1),
  status: z.nativeEnum(RefundStatus).optional(),
  take: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const mapCustomer = (customer: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  membershipCard: string | null;
  tier: CustomerTier;
  points: number;
  totalSpent: Prisma.Decimal;
  visitCount: number;
  lastVisitAt: Date | null;
  birthDate: Date | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  membershipCard: customer.membershipCard,
  tier: customer.tier,
  points: customer.points,
  totalSpent: toNumber(customer.totalSpent),
  visitCount: customer.visitCount,
  lastVisitAt: customer.lastVisitAt?.toISOString() ?? null,
  birthDate: customer.birthDate?.toISOString() ?? null,
  notes: customer.notes,
  isActive: customer.isActive,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
});

const mapDiscountApproval = (approval: {
  id: string;
  saleId: string | null;
  cashierId: string;
  approverId: string | null;
  requestedAmount: Prisma.Decimal;
  requestedPercent: Prisma.Decimal;
  reason: string | null;
  status: DiscountApprovalStatus;
  requestedAt: Date;
  approvedAt: Date | null;
  cashier: { id: string; name: string | null };
  approver: { id: string; name: string | null } | null;
  sale: { id: string; receiptNumber: string } | null;
}) => ({
  id: approval.id,
  saleId: approval.saleId,
  cashierId: approval.cashierId,
  approverId: approval.approverId,
  requestedAmount: toNumber(approval.requestedAmount),
  requestedPercent: toNumber(approval.requestedPercent),
  reason: approval.reason,
  status: approval.status,
  requestedAt: approval.requestedAt.toISOString(),
  approvedAt: approval.approvedAt?.toISOString() ?? null,
  cashier: { id: approval.cashier.id, name: approval.cashier.name },
  approver: approval.approver ? { id: approval.approver.id, name: approval.approver.name } : null,
  sale: approval.sale ? { id: approval.sale.id, receiptNumber: approval.sale.receiptNumber } : null,
});

const mapRefundApproval = (refund: {
  id: string;
  saleId: string;
  amount: Prisma.Decimal;
  reason: string | null;
  status: RefundStatus;
  approvedById: string | null;
  processedAt: Date;
  createdById: string | null;
  sale: { id: string; receiptNumber: string; totalNet: Prisma.Decimal };
  approvedBy: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null } | null;
}) => ({
  id: refund.id,
  saleId: refund.saleId,
  amount: toNumber(refund.amount),
  reason: refund.reason,
  status: refund.status,
  approvedById: refund.approvedById,
  processedAt: refund.processedAt.toISOString(),
  createdById: refund.createdById,
  sale: {
    id: refund.sale.id,
    receiptNumber: refund.sale.receiptNumber,
    totalNet: toNumber(refund.sale.totalNet),
  },
  approvedBy: refund.approvedBy ? { id: refund.approvedBy.id, name: refund.approvedBy.name } : null,
  createdBy: refund.createdBy ? { id: refund.createdBy.id, name: refund.createdBy.name } : null,
});

export const customersRouter = router({
  list: requireOutletAccess(({ input }) => input.outletId)
    .input(customerListInputSchema)
    .query(async ({ input, ctx }) => {
      const outletAccess = getOutletAccessFromContext(ctx);
      const { outletId, search, tier, isActive, take, cursor } = input;

      const where: Record<string, unknown> = {
        sales: { some: { outletId } },
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { membershipCard: { contains: search, mode: "insensitive" } },
        ];
      }

      if (tier) where.tier = tier;
      if (isActive !== undefined) where.isActive = isActive;

      const customers = await db.customer.findMany({
        where,
        take: take + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (customers.length > take) {
        const nextItem = customers.pop();
        nextCursor = nextItem!.id;
      }

      return {
        customers: customers.map(mapCustomer),
        nextCursor,
      };
    }),

  getById: protectedOutletProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const customer = await db.customer.findUnique({
        where: { id: input.id },
        include: {
          sales: {
            where: { status: "COMPLETED" },
            orderBy: { soldAt: "desc" },
            take: 10,
            include: {
              items: { include: { product: true } },
              payments: true,
            },
          },
          pointHistory: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pelanggan tidak ditemukan" });
      }

      return {
        ...mapCustomer(customer),
        sales: customer.sales.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
          status: sale.status,
          items: sale.items.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            total: Number(item.total),
          })),
          payments: sale.payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
          })),
        })),
        pointHistory: customer.pointHistory.map((ph) => ({
          id: ph.id,
          points: ph.points,
          type: ph.type,
          reference: ph.reference,
          createdAt: ph.createdAt.toISOString(),
        })),
      };
    }),

  create: requireOutletAccess(({ input }) => input.outletId)
    .input(customerCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const outletAccess = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(outletAccess.role);

      const { outletId, ...data } = input;

      const customer = await db.customer.create({
        data: {
          ...data,
          email: data.email || null,
          phone: data.phone || null,
          membershipCard: data.membershipCard || null,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          notes: data.notes || null,
        },
      });

      return mapCustomer(customer);
    }),

  update: requireOutletAccess(({ input }) => input.outletId)
    .input(customerUpdateInputSchema.extend({ outletId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const outletAccess = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(outletAccess.role);

      const { id, outletId, ...data } = input;

      const customer = await db.customer.update({
        where: { id },
        data: {
          ...data,
          email: data.email === "" ? null : data.email,
          phone: data.phone === "" ? null : data.phone,
          membershipCard: data.membershipCard === "" ? null : data.membershipCard,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          notes: data.notes === "" ? null : data.notes,
        },
      });

      return mapCustomer(customer);
    }),

  delete: requireOutletAccess(({ input }) => input.outletId)
    .input(z.object({ id: z.string().min(1), outletId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const outletAccess = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(outletAccess.role);

      const customer = await db.customer.findUnique({
        where: { id: input.id },
        include: { sales: { where: { status: "COMPLETED" }, take: 1 } },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pelanggan tidak ditemukan" });
      }

      if (customer.sales.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tidak dapat menghapus pelanggan yang memiliki riwayat transaksi",
        });
      }

      await db.customer.delete({ where: { id: input.id } });
      return { success: true };
    }),

  adjustPoints: requireOutletAccess(({ input }) => input.outletId)
    .input(customerPointAdjustInputSchema)
    .mutation(async ({ input, ctx }) => {
      const outletAccess = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(outletAccess.role);

      const { customerId, points, type, reference, outletId } = input;

      const customer = await db.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pelanggan tidak ditemukan" });
      }

      const newPoints = Math.max(0, customer.points + points);

      const [updatedCustomer, pointHistory] = await db.$transaction([
        db.customer.update({
          where: { id: customerId },
          data: { points: newPoints },
        }),
        db.pointHistory.create({
          data: {
            customerId,
            points,
            type,
            reference,
          },
        }),
      ]);

      return {
        customer: mapCustomer(updatedCustomer),
        pointHistory: {
          id: pointHistory.id,
          points: pointHistory.points,
          type: pointHistory.type,
          reference: pointHistory.reference,
          createdAt: pointHistory.createdAt.toISOString(),
        },
      };
    }),

  searchByCard: requireOutletAccess(({ input }) => input.outletId)
    .input(z.object({ membershipCard: z.string().min(1), outletId: z.string().min(1) }))
    .query(async ({ input }) => {
      const customer = await db.customer.findUnique({
        where: { membershipCard: input.membershipCard },
        include: {
          sales: {
            where: { status: "COMPLETED" },
            orderBy: { soldAt: "desc" },
            take: 5,
          },
        },
      });

      if (!customer) return null;

      return {
        ...mapCustomer(customer),
        recentSales: customer.sales.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
        })),
      };
    }),

  searchByPhone: requireOutletAccess(({ input }) => input.outletId)
    .input(z.object({ phone: z.string().min(10), outletId: z.string().min(1) }))
    .query(async ({ input }) => {
      const customer = await db.customer.findUnique({
        where: { phone: input.phone },
        include: {
          sales: {
            where: { status: "COMPLETED" },
            orderBy: { soldAt: "desc" },
            take: 5,
          },
        },
      });

      if (!customer) return null;

      return {
        ...mapCustomer(customer),
        recentSales: customer.sales.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalNet: Number(sale.totalNet),
          soldAt: sale.soldAt.toISOString(),
        })),
      };
    }),
});

export const approvalsRouter = router({
  discountApprovals: {
    list: requireOutletAccess(({ input }) => input.outletId)
      .input(discountApprovalListInputSchema)
      .query(async ({ input, ctx }) => {
        const { outletId, status, take, cursor } = input;

        const where: Record<string, unknown> = {
          sale: { outletId },
        };

        if (status) where.status = status;

        const approvals = await db.discountApproval.findMany({
          where,
          take: take + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { requestedAt: "desc" },
          include: {
            cashier: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
            sale: { select: { id: true, receiptNumber: true } },
          },
        });

        let nextCursor: string | undefined;
        if (approvals.length > take) {
          const nextItem = approvals.pop();
          nextCursor = nextItem!.id;
        }

        return {
          approvals: approvals.map(mapDiscountApproval),
          nextCursor,
        };
      }),

    approve: protectedOutletProcedure
      .input(discountApprovalInputSchema)
      .mutation(async ({ input, ctx }) => {
        const outletAccess = getOutletAccessFromContext(ctx);
        assertAdminOrOwner(outletAccess.role);

        const { approvalId, action, reason } = input;

        const approval = await db.discountApproval.findUnique({
          where: { id: approvalId },
          include: { sale: true },
        });

        if (!approval) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Persetujuan diskon tidak ditemukan" });
        }

        if (approval.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Persetujuan sudah diproses" });
        }

        const updated = await db.discountApproval.update({
          where: { id: approvalId },
          data: {
            status: action === "APPROVE" ? "APPROVED" : "REJECTED",
            approverId: ctx.session.user.id,
            approvedAt: new Date(),
            reason: reason ?? approval.reason,
          },
          include: {
            cashier: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
            sale: { select: { id: true, receiptNumber: true } },
          },
        });

        return mapDiscountApproval(updated);
      }),
  },

  refundApprovals: {
    list: requireOutletAccess(({ input }) => input.outletId)
      .input(refundApprovalListInputSchema)
      .query(async ({ input, ctx }) => {
        const { outletId, status, take, cursor } = input;

        const where: Record<string, unknown> = {
          sale: { outletId },
        };

        if (status) where.status = status;

        const refunds = await db.refund.findMany({
          where,
          take: take + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { processedAt: "desc" },
          include: {
            sale: { select: { id: true, receiptNumber: true, totalNet: true } },
            approvedBy: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
        });

        let nextCursor: string | undefined;
        if (refunds.length > take) {
          const nextItem = refunds.pop();
          nextCursor = nextItem!.id;
        }

        return {
          refunds: refunds.map(mapRefundApproval),
          nextCursor,
        };
      }),

    approve: protectedOutletProcedure
      .input(refundApprovalInputSchema)
      .mutation(async ({ input, ctx }) => {
        const outletAccess = getOutletAccessFromContext(ctx);
        assertAdminOrOwner(outletAccess.role);

        const { refundId, action, reason } = input;

        const refund = await db.refund.findUnique({
          where: { id: refundId },
          include: { sale: true },
        });

        if (!refund) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Refund tidak ditemukan" });
        }

        if (refund.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Refund sudah diproses" });
        }

        const updated = await db.$transaction(async (tx) => {
          const updatedRefund = await tx.refund.update({
            where: { id: refundId },
            data: {
              status: action === "APPROVE" ? "APPROVED" : "REJECTED",
              approvedById: ctx.session.user.id,
              processedAt: new Date(),
              reason: reason ?? refund.reason,
            },
            include: {
              sale: { select: { id: true, receiptNumber: true, totalNet: true } },
              approvedBy: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
            },
          });

          if (action === "APPROVE") {
            await tx.sale.update({
              where: { id: refund.saleId },
              data: { status: "REFUNDED" },
            });
          }

          return updatedRefund;
        });

        return mapRefundApproval(updated);
      }),
  },
});