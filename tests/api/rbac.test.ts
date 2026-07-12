import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { OutletRole, Role } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

let adminUserId: string;
let ownerUserId: string;
let cashierUserId: string;
let outletAId: string;
let outletBId: string;
let productId: string;

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `${role.toLowerCase()}@test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("RBAC access checks", () => {
  beforeAll(async () => {
    const [admin, owner, cashier] = await Promise.all([
      db.user.create({
        data: {
          name: "Test Admin",
          email: "admin@test.local",
          role: Role.ADMIN,
        },
      }),
      db.user.create({
        data: {
          name: "Test Owner",
          email: "owner@test.local",
          role: Role.OWNER,
        },
      }),
      db.user.create({
        data: {
          name: "Test Cashier",
          email: "cashier@test.local",
          role: Role.CASHIER,
        },
      }),
    ]);

    adminUserId = admin.id;
    ownerUserId = owner.id;
    cashierUserId = cashier.id;

    const [outletA, outletB] = await Promise.all([
      db.outlet.create({
        data: {
          name: "Test Outlet A",
          code: "TEST-A",
          address: "Outlet A",
        },
      }),
      db.outlet.create({
        data: {
          name: "Test Outlet B",
          code: "TEST-B",
          address: "Outlet B",
        },
      }),
    ]);

    outletAId = outletA.id;
    outletBId = outletB.id;

    await db.userOutlet.create({
      data: {
        userId: cashierUserId,
        outletId: outletAId,
        role: OutletRole.CASHIER,
        isActive: true,
      },
    });

    const product = await db.product.create({
      data: {
        name: "Test Product",
        sku: "TEST-RBAC-001",
        price: 10000,
        isActive: true,
      },
    });
    productId = product.id;

    await db.inventory.create({
      data: {
        productId,
        outletId: outletAId,
        quantity: 2,
      },
    });
  });

  afterAll(async () => {
    await db.stockMovement.deleteMany({
      where: { productId },
    });
    await db.inventory.deleteMany({
      where: { productId },
    });
    await db.userOutlet.deleteMany({
      where: { userId: cashierUserId },
    });
    await db.cashierTaskStatus.deleteMany({
      where: {
        userId: cashierUserId,
        outletId: outletAId,
      },
    });
    await db.product.deleteMany({
      where: { id: productId },
    });
    await db.outlet.deleteMany({
      where: { id: { in: [outletAId, outletBId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [adminUserId, ownerUserId, cashierUserId] } },
    });
  });

  it("limits analytics outlet performance to cashier outlets", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));
    const result = await caller.analytics.getOutletPerformance({
      dateRange: {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.outletId).toBe(outletAId);
  });

  it("allows admin and owner to query any outlet in analytics", async () => {
    const adminCaller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const ownerCaller = await createCaller(buildSession(ownerUserId, Role.OWNER));

    const adminResult = await adminCaller.analytics.getSalesTrend({
      outletId: outletBId,
      dateRange: {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      },
      granularity: "day",
    });
    const ownerResult = await ownerCaller.analytics.getSalesTrend({
      outletId: outletBId,
      dateRange: {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      },
      granularity: "day",
    });

    expect(Array.isArray(adminResult)).toBe(true);
    expect(Array.isArray(ownerResult)).toBe(true);
  });

  it("rejects analytics access for cashier on unauthorized outlet", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.analytics.getSalesTrend({
        outletId: outletBId,
        dateRange: {
          from: startOfDay(new Date()),
          to: endOfDay(new Date()),
        },
        granularity: "day",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("scopes outlet list to cashier outlets", async () => {
    const cashierCaller = await createCaller(
      buildSession(cashierUserId, Role.CASHIER),
    );
    const adminCaller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const cashierOutlets = await cashierCaller.outlets.list();
    const adminOutlets = await adminCaller.outlets.list();

    expect(cashierOutlets).toHaveLength(1);
    expect(cashierOutlets[0]?.id).toBe(outletAId);
    expect(adminOutlets.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks cashier outlet upsert and negative stock adjustments", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.upsert({
        id: outletAId,
        name: "Test Outlet A",
        code: "TEST-A",
        address: "Outlet A",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      caller.outlets.adjustStock({
        outletId: outletAId,
        productId,
        quantity: -3,
        note: "Negative test",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents transfer beyond available stock", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    await expect(
      caller.outlets.transferStock({
        productId,
        fromOutletId: outletAId,
        toOutletId: outletBId,
        quantity: 5,
        note: "Over transfer",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks inventory access for unauthorized outlet", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.inventory.getAllInventory({
        outletId: outletBId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows cashier to acknowledge tasks and see feedback state", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await caller.tasks.updateTaskStatus({
      outletId: outletAId,
      taskId: "open-shift",
      status: "complete",
    });

    const tasks = await caller.tasks.getCashierTasks({
      outletId: outletAId,
    });

    const openShift = tasks.tasks.find((task) => task.id === "open-shift");
    expect(openShift?.status).toBe("complete");
  });

  it("exposes task feedback summary to admins", async () => {
    const adminCaller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const summary = await adminCaller.analytics.getTaskFeedbackSummary({
      outletId: outletAId,
    });

    expect(typeof summary.pendingTasks).toBe("number");
    expect(Array.isArray(summary.recentNotes)).toBe(true);
  });
});
