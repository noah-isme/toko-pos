import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { db } from "@/server/db";
import { Role } from "@/server/db/enums";
import { router, protectedProcedure } from "@/server/api/trpc";
import { getUserAccess, assertAdminOrOwner } from "@/server/api/utils/access";
import { writeAuditLog } from "@/server/services/audit";
import {
  userCreateInputSchema,
  userDeleteInputSchema,
  userListOutputSchema,
  userOutletAssignmentInputSchema,
  userOutletAssignmentRemoveInputSchema,
  userOutletsOutputSchema,
  userUpdateInputSchema,
} from "@/server/api/schemas/users";

const PASSWORD_HASH_ROUNDS = 10;

/**
 * Counts dependent records that block a hard delete. Sales, refunds, stock
 * movements, cash sessions, and promotion usages use restrict-on-delete so
 * the DB will refuse the delete; surface a clear message before hitting it.
 */
const countBlockingDependencies = async (userId: string) => {
  const [
    sales,
    refundsCreated,
    refundApprovals,
    stockMovements,
    cashSessions,
    promotionUsages,
    requestedTransfers,
    approvedTransfers,
    activityLogs,
  ] = await Promise.all([
    db.sale.count({ where: { cashierId: userId } }),
    db.refund.count({ where: { createdById: userId } }),
    db.refund.count({ where: { approvedById: userId } }),
    db.stockMovement.count({ where: { createdById: userId } }),
    db.cashSession.count({ where: { userId } }),
    db.promotionUsage.count({ where: { userId } }),
    db.stockTransfer.count({ where: { requestedById: userId } }),
    db.stockTransfer.count({ where: { approvedById: userId } }),
    db.activityLog.count({ where: { userId } }),
  ]);

  return (
    sales +
    refundsCreated +
    refundApprovals +
    stockMovements +
    cashSessions +
    promotionUsages +
    requestedTransfers +
    approvedTransfers +
    activityLogs
  );
};

const requireAdminOrOwner = async (userId: string) => {
  const access = await getUserAccess(userId);
  assertAdminOrOwner(access.role);
  return access;
};

export const usersRouter = router({
  list: protectedProcedure.output(userListOutputSchema).query(async ({ ctx }) => {
    await requireAdminOrOwner(ctx.session.user.id);

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        userOutlets: { where: { isActive: true }, select: { id: true } },
      },
    });

    return userListOutputSchema.parse(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.userOutlets.length > 0,
        outletCount: user.userOutlets.length,
        createdAt: user.createdAt.toISOString(),
      })),
    );
  }),

  create: protectedProcedure
    .input(userCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      const existing = await db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email sudah dipakai akun lain.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      await writeAuditLog({
        userId: ctx.session.user.id,
        action: "USER_CREATE",
        entity: "User",
        entityId: user.id,
        details: { name: user.name, email: user.email, role: user.role },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      };
    }),

  update: protectedProcedure
    .input(userUpdateInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      const target = await db.user.findUnique({
        where: { id: input.id },
        select: { id: true, role: true, email: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User tidak ditemukan." });
      }

      if (input.email && input.email !== target.email) {
        const clash = await db.user.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (clash) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email sudah dipakai akun lain.",
          });
        }
      }

      // Last-owner guard: block demoting the final OWNER away from OWNER.
      if (
        input.role &&
        input.role !== Role.OWNER &&
        target.role === Role.OWNER
      ) {
        const ownerCount = await db.user.count({ where: { role: Role.OWNER } });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tidak dapat menurunkan role OWNER terakhir.",
          });
        }
      }

      const data: {
        name?: string;
        email?: string;
        role?: Role;
        passwordHash?: string;
      } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.email !== undefined) data.email = input.email;
      if (input.role !== undefined) data.role = input.role;
      if (input.password !== undefined) {
        data.passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
      }

      const updated = await db.user.update({
        where: { id: input.id },
        data,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      await writeAuditLog({
        userId: ctx.session.user.id,
        action: "USER_UPDATE",
        entity: "User",
        entityId: updated.id,
        details: {
          name: updated.name,
          email: updated.email,
          role: updated.role,
          fieldsChanged: Object.keys(data),
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
      };
    }),

  delete: protectedProcedure
    .input(userDeleteInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tidak dapat menghapus akun sendiri.",
        });
      }

      const target = await db.user.findUnique({
        where: { id: input.id },
        select: { id: true, role: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User tidak ditemukan." });
      }

      if (target.role === Role.OWNER) {
        const ownerCount = await db.user.count({ where: { role: Role.OWNER } });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tidak dapat menghapus OWNER terakhir.",
          });
        }
      }

      const blocking = await countBlockingDependencies(input.id);
      if (blocking > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "User memiliki riwayat transaksi/audit. Cabut akses outlet sebagai pengganti hapus permanen.",
        });
      }

      await db.user.delete({ where: { id: input.id } });

      await writeAuditLog({
        userId: ctx.session.user.id,
        action: "USER_DELETE",
        entity: "User",
        entityId: input.id,
        details: { targetRole: target.role },
      });

      return { id: input.id };
    }),

  getOutletAssignments: protectedProcedure
    .input(userDeleteInputSchema)
    .output(userOutletsOutputSchema)
    .query(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      const assignments = await db.userOutlet.findMany({
        where: { userId: input.id },
        include: { outlet: { select: { id: true, name: true, code: true } } },
        orderBy: { outlet: { name: "asc" } },
      });

      return userOutletsOutputSchema.parse(
        assignments.map((assignment) => ({
          id: assignment.id,
          outletId: assignment.outlet.id,
          outletName: assignment.outlet.name,
          outletCode: assignment.outlet.code,
          role: assignment.role,
          isActive: assignment.isActive,
        })),
      );
    }),

  setOutletAssignment: protectedProcedure
    .input(userOutletAssignmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      const [user, outlet] = await Promise.all([
        db.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
        db.outlet.findUnique({ where: { id: input.outletId }, select: { id: true } }),
      ]);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User tidak ditemukan." });
      }
      if (!outlet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Outlet tidak ditemukan." });
      }

      await db.userOutlet.upsert({
        where: {
          userId_outletId: {
            userId: input.userId,
            outletId: input.outletId,
          },
        },
        update: { role: input.role, isActive: input.isActive },
        create: {
          userId: input.userId,
          outletId: input.outletId,
          role: input.role,
          isActive: input.isActive,
        },
      });

      await writeAuditLog({
        userId: ctx.session.user.id,
        action: "USER_OUTLET_ASSIGN",
        entity: "UserOutlet",
        entityId: input.userId,
        details: {
          targetUserId: input.userId,
          outletId: input.outletId,
          role: input.role,
          isActive: input.isActive,
        },
      });

      return { userId: input.userId, outletId: input.outletId };
    }),

  removeOutletAssignment: protectedProcedure
    .input(userOutletAssignmentRemoveInputSchema)
    .mutation(async ({ input, ctx }) => {
      await requireAdminOrOwner(ctx.session.user.id);

      await db.userOutlet.deleteMany({
        where: {
          userId: input.userId,
          outletId: input.outletId,
        },
      });

      await writeAuditLog({
        userId: ctx.session.user.id,
        action: "USER_OUTLET_REVOKE",
        entity: "UserOutlet",
        entityId: input.userId,
        details: { targetUserId: input.userId, outletId: input.outletId },
      });

      return { userId: input.userId, outletId: input.outletId };
    }),
});
