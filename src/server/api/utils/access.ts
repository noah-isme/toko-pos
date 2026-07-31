import { TRPCError } from "@trpc/server";

import { db } from "@/server/db";
import { Role } from "@/server/db/enums";

export type UserAccess = {
  role: Role;
  outletIds: string[];
};

const ADMIN_ROLES = new Set<Role>([Role.ADMIN, Role.OWNER]);

export const getUserAccess = async (
  userId: string,
  userEmail?: string | null,
): Promise<UserAccess> => {
  let user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userOutlets: {
        where: { isActive: true },
        select: { outletId: true },
      },
    },
  });

  if (!user && userEmail) {
    user = await db.user.findUnique({
      where: { email: userEmail },
      select: {
        role: true,
        userOutlets: {
          where: { isActive: true },
          select: { outletId: true },
        },
      },
    });
  }

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User tidak ditemukan.",
    });
  }

  let outletIds = user.userOutlets.map((uo) => uo.outletId);

  // If user is ADMIN or OWNER and has no explicit userOutlets mapping, give access to all outlets
  if (outletIds.length === 0 && ADMIN_ROLES.has(user.role)) {
    const allOutlets = await db.outlet.findMany({ select: { id: true } });
    outletIds = allOutlets.map((o) => o.id);
  }

  return {
    role: user.role,
    outletIds,
  };
};

export const assertAdminOrOwner = (role: Role) => {
  if (!ADMIN_ROLES.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Aksi ini hanya untuk admin.",
    });
  }
};

export const ensureCashierOutletAccess = (role: Role, outletIds: string[]) => {
  if (role === Role.CASHIER && outletIds.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tidak ada outlet aktif untuk akun ini.",
    });
  }
};

export const assertOutletAccess = (
  role: Role,
  outletIds: string[],
  outletId: string,
) => {
  if (role === Role.CASHIER && !outletIds.includes(outletId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke outlet ini.",
    });
  }
};

export const buildOutletWhere = (
  role: Role,
  outletIds: string[],
  outletId?: string,
) => {
  if (outletId) {
    assertOutletAccess(role, outletIds, outletId);
    return { outletId };
  }

  if (role === Role.CASHIER) {
    ensureCashierOutletAccess(role, outletIds);
    return { outletId: { in: outletIds } };
  }

  return {};
};
