import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { OutletRole, Role } from "@prisma/client";

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

let adminUserId: string;
let cashierUserId: string;
let outletAId: string;
let outletBId: string;
let productIdA: string;
let productIdB: string;
let inventoryAId: string;
let inventoryBId: string;

const TEST_SUFFIX = String(Date.now()).slice(-6);

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `op-${role.toLowerCase()}-${TEST_SUFFIX}@test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("Stock Opname (performOpname)", () => {
  beforeAll(async () => {
    const admin = await db.user.create({
      data: {
        name: "Opname Admin",
        email: `op-admin-${TEST_SUFFIX}@test.local`,
        role: Role.ADMIN,
      },
    });
    adminUserId = admin.id;

    const cashier = await db.user.create({
      data: {
        name: "Opname Cashier",
        email: `op-cashier-${TEST_SUFFIX}@test.local`,
        role: Role.CASHIER,
      },
    });
    cashierUserId = cashier.id;

    const [outletA, outletB] = await Promise.all([
      db.outlet.create({
        data: { name: "Opname Outlet A", code: `OP-A-${TEST_SUFFIX}`, address: "A" },
      }),
      db.outlet.create({
        data: { name: "Opname Outlet B", code: `OP-B-${TEST_SUFFIX}`, address: "B" },
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

    const [productA, productB] = await Promise.all([
      db.product.create({
        data: {
          name: "Opname Product A",
          sku: `OP-PROD-A-${TEST_SUFFIX}`,
          price: 10000,
          isActive: true,
        },
      }),
      db.product.create({
        data: {
          name: "Opname Product B",
          sku: `OP-PROD-B-${TEST_SUFFIX}`,
          price: 20000,
          isActive: true,
        },
      }),
    ]);
    productIdA = productA.id;
    productIdB = productB.id;

    const [invA, invB] = await Promise.all([
      db.inventory.create({
        data: { productId: productIdA, outletId: outletAId, quantity: 10 },
      }),
      db.inventory.create({
        data: { productId: productIdB, outletId: outletAId, quantity: 5 },
      }),
    ]);
    inventoryAId = invA.id;
    inventoryBId = invB.id;
  });

  afterAll(async () => {
    // Guard against beforeAll failure
    if (!adminUserId || !outletAId) return;

    await db.stockMovement.deleteMany({
      where: { outletId: { in: [outletAId, outletBId] } },
    });
    await db.inventory.deleteMany({
      where: { outletId: { in: [outletAId, outletBId] } },
    });
    await db.userOutlet.deleteMany({
      where: { userId: cashierUserId },
    });
    await db.product.deleteMany({
      where: { id: { in: [productIdA, productIdB] } },
    });
    await db.outlet.deleteMany({
      where: { id: { in: [outletAId, outletBId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [adminUserId, cashierUserId] } },
    });
  });

  it("adjusts inventory to counted quantity and creates stock movements", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    const results = await caller.outlets.performOpname({
      outletId: outletAId,
      entries: [
        { productId: productIdA, countedQuantity: 8 },
        { productId: productIdB, countedQuantity: 7 },
      ],
    });

    expect(results).toHaveLength(2);

    const resultA = results.find((r) => r.productId === productIdA);
    expect(resultA?.quantity).toBe(8);
    expect(resultA?.difference).toBe(-2);

    const resultB = results.find((r) => r.productId === productIdB);
    expect(resultB?.quantity).toBe(7);
    expect(resultB?.difference).toBe(2);

    // Verify DB state
    const invA = await db.inventory.findUnique({
      where: { id: inventoryAId },
    });
    expect(invA?.quantity).toBe(8);

    const invB = await db.inventory.findUnique({
      where: { id: inventoryBId },
    });
    expect(invB?.quantity).toBe(7);
  });

  it("creates stock movements only for items with differences", async () => {
    const movements = await db.stockMovement.findMany({
      where: {
        outletId: outletAId,
        productId: { in: [productIdA, productIdB] },
      },
      orderBy: { id: "asc" },
    });

    // Both had differences (-2 and +2), so 2 movements
    expect(movements).toHaveLength(2);

    const moveA = movements.find((m) => m.productId === productIdA);
    expect(moveA?.type).toBe("ADJUSTMENT");
    expect(moveA?.quantity).toBe(-2);

    const moveB = movements.find((m) => m.productId === productIdB);
    expect(moveB?.type).toBe("ADJUSTMENT");
    expect(moveB?.quantity).toBe(2);
  });

  it("does not create stock movement when counted equals system", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    // Set quantities to 8 and 7 (current values), no diff
    const results = await caller.outlets.performOpname({
      outletId: outletAId,
      entries: [
        { productId: productIdA, countedQuantity: 8 },
        { productId: productIdB, countedQuantity: 7 },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.difference === 0)).toBe(true);

    // No new stock movements should be created
    const movementsAfter = await db.stockMovement.findMany({
      where: {
        outletId: outletAId,
        productId: { in: [productIdA, productIdB] },
      },
    });
    expect(movementsAfter).toHaveLength(2); // still only the original 2
  });

  it("blocks cashier from performing opname on unauthorized outlet", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.performOpname({
        outletId: outletBId,
        entries: [{ productId: productIdA, countedQuantity: 5 }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to perform opname on any outlet", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    // Set up inventory in outlet B first
    await db.inventory.create({
      data: { productId: productIdA, outletId: outletBId, quantity: 0 },
    });

    const results = await caller.outlets.performOpname({
      outletId: outletBId,
      entries: [{ productId: productIdA, countedQuantity: 3 }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.quantity).toBe(3);
    expect(results[0]?.difference).toBe(3);
  });

  it("rejects empty entries array", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.performOpname({
        outletId: outletAId,
        entries: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects negative counted quantity", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.performOpname({
        outletId: outletAId,
        entries: [{ productId: productIdA, countedQuantity: -1 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("creates inventory row if it does not exist", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    // Product B has no inventory in outlet B yet
    const results = await caller.outlets.performOpname({
      outletId: outletBId,
      entries: [{ productId: productIdB, countedQuantity: 4 }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.quantity).toBe(4);
    expect(results[0]?.difference).toBe(4);

    const inv = await db.inventory.findUnique({
      where: {
        productId_outletId: {
          productId: productIdB,
          outletId: outletBId,
        },
      },
    });
    expect(inv?.quantity).toBe(4);
  });
});
