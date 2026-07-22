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
let productId: string;
const createdTransferIds: string[] = [];

const TEST_SUFFIX = String(Date.now()).slice(-6);

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `st-${role.toLowerCase()}-${TEST_SUFFIX}@test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("Stock Transfer approval workflow", () => {
  beforeAll(async () => {
    const admin = await db.user.create({
      data: {
        name: "ST Admin",
        email: `st-admin-${TEST_SUFFIX}@test.local`,
        role: Role.ADMIN,
      },
    });
    adminUserId = admin.id;

    const cashier = await db.user.create({
      data: {
        name: "ST Cashier",
        email: `st-cashier-${TEST_SUFFIX}@test.local`,
        role: Role.CASHIER,
      },
    });
    cashierUserId = cashier.id;

    const [outletA, outletB] = await Promise.all([
      db.outlet.create({
        data: { name: "ST Outlet A", code: "ST-A", address: "A" },
      }),
      db.outlet.create({
        data: { name: "ST Outlet B", code: "ST-B", address: "B" },
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
    await db.userOutlet.create({
      data: {
        userId: cashierUserId,
        outletId: outletBId,
        role: OutletRole.CASHIER,
        isActive: true,
      },
    });

    const product = await db.product.create({
      data: {
        name: "ST Test Product",
        sku: `ST-TEST-${TEST_SUFFIX}`,
        price: 10000,
        costPrice: 5000,
        isActive: true,
      },
    });
    productId = product.id;

    await db.inventory.create({
      data: {
        productId,
        outletId: outletAId,
        quantity: 10,
      },
    });
  });

  afterAll(async () => {
    // Guard against beforeAll failure — if setup didn't complete, skip cleanup
    if (!adminUserId || !outletAId) return;

    await db.stockTransfer.deleteMany({
      where: { id: { in: createdTransferIds } },
    });
    await db.stockMovement.deleteMany({
      where: { productId },
    });
    await db.inventory.deleteMany({
      where: { productId },
    });
    await db.userOutlet.deleteMany({
      where: { userId: cashierUserId },
    });
    // Clean up sales chain: RefundItem → Refund → Payment → SaleItem → Sale
    const outletSales = await db.sale.findMany({
      where: { outletId: { in: [outletAId, outletBId] } },
      select: { id: true },
    });
    const saleIds = outletSales.map((s) => s.id);
    if (saleIds.length > 0) {
      const refundIds = await db.refund.findMany({
        where: { saleId: { in: saleIds } },
        select: { id: true },
      });
      const rIds = refundIds.map((r) => r.id);
      if (rIds.length > 0) {
        await db.refundItem.deleteMany({ where: { refundId: { in: rIds } } });
        await db.stockMovement.deleteMany({
          where: { relatedRefundId: { in: rIds } },
        });
      }
      await db.refund.deleteMany({ where: { saleId: { in: saleIds } } });
      await db.payment.deleteMany({ where: { saleId: { in: saleIds } } });
      await db.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
      await db.stockMovement.deleteMany({
        where: { relatedSaleId: { in: saleIds } },
      });
      await db.sale.deleteMany({ where: { id: { in: saleIds } } });
    }
    await db.product.deleteMany({ where: { id: productId } });
    await db.outlet.deleteMany({
      where: { id: { in: [outletAId, outletBId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [adminUserId, cashierUserId] } },
    });
  });

  it("creates a pending stock transfer request", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    const transfer = await caller.outlets.createStockTransfer({
      productId,
      fromOutletId: outletAId,
      toOutletId: outletBId,
      quantity: 3,
      notes: "Test transfer",
    });

    expect(transfer.status).toBe("PENDING");
    expect(transfer.transferNumber).toMatch(/^TRF-\d{4}$/);
    expect(transfer.quantity).toBe(3);
    expect(transfer.fromOutletName).toBe("ST Outlet A");
    expect(transfer.toOutletName).toBe("ST Outlet B");
    expect(transfer.productName).toBe("ST Test Product");
    expect(transfer.requestedById).toBe(cashierUserId);
    expect(transfer.notes).toBe("Test transfer");
    createdTransferIds.push(transfer.id);
  });

  it("lists stock transfers", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const transfers = await caller.outlets.listStockTransfers({});

    expect(transfers.length).toBeGreaterThanOrEqual(1);
    const found = transfers.find((t) => t.id === createdTransferIds[0]);
    expect(found).toBeDefined();
    expect(found?.status).toBe("PENDING");
  });

  it("filters stock transfers by status", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const pending = await caller.outlets.listStockTransfers({ status: "PENDING" });
    expect(pending.every((t) => t.status === "PENDING")).toBe(true);

    const completed = await caller.outlets.listStockTransfers({ status: "COMPLETED" });
    expect(completed.every((t) => t.status === "COMPLETED")).toBe(true);
  });

  it("prevents cashier from approving a transfer", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.approveStockTransfer({ id: createdTransferIds[0]! }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("approves a pending transfer as admin", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const approved = await caller.outlets.approveStockTransfer({
      id: createdTransferIds[0]!,
    });

    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe(adminUserId);
    expect(approved.approvedByName).toBe("ST Admin");
    expect(approved.approvedAt).not.toBeNull();
  });

  it("rejects approving a non-pending transfer", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    await expect(
      caller.outlets.approveStockTransfer({ id: createdTransferIds[0]! }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("completes an approved transfer and moves inventory", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    const completed = await caller.outlets.completeStockTransfer({
      id: createdTransferIds[0]!,
    });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();

    const sourceInv = await db.inventory.findUnique({
      where: {
        productId_outletId: { productId, outletId: outletAId },
      },
    });
    expect(sourceInv?.quantity).toBe(7); // 10 - 3

    const targetInv = await db.inventory.findUnique({
      where: {
        productId_outletId: { productId, outletId: outletBId },
      },
    });
    expect(targetInv?.quantity).toBe(3);
  });

  it("rejects completing a non-approved transfer", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.completeStockTransfer({ id: createdTransferIds[0]! }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("creates and rejects a transfer as admin", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const transfer = await caller.outlets.createStockTransfer({
      productId,
      fromOutletId: outletAId,
      toOutletId: outletBId,
      quantity: 1,
    });
    createdTransferIds.push(transfer.id);

    const rejected = await caller.outlets.rejectStockTransfer({ id: transfer.id });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.approvedById).toBe(adminUserId);
  });

  it("prevents creating a transfer with same source and target outlet", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.createStockTransfer({
        productId,
        fromOutletId: outletAId,
        toOutletId: outletAId,
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents completing a transfer with insufficient stock", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const transfer = await caller.outlets.createStockTransfer({
      productId,
      fromOutletId: outletAId,
      toOutletId: outletBId,
      quantity: 999,
    });
    createdTransferIds.push(transfer.id);

    await caller.outlets.approveStockTransfer({ id: transfer.id });

    await expect(
      caller.outlets.completeStockTransfer({ id: transfer.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
