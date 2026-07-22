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
let supplierId: string;
let productIdA: string;
let productIdB: string;
let inventoryAId: string;

const TEST_SUFFIX = String(Date.now()).slice(-6);

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `rcv-${role.toLowerCase()}-${TEST_SUFFIX}@test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("Supplier receiving (receiveStock)", () => {
  beforeAll(async () => {
    const admin = await db.user.create({
      data: {
        name: "Rcv Admin",
        email: `rcv-admin-${TEST_SUFFIX}@test.local`,
        role: Role.ADMIN,
      },
    });
    adminUserId = admin.id;

    const cashier = await db.user.create({
      data: {
        name: "Rcv Cashier",
        email: `rcv-cashier-${TEST_SUFFIX}@test.local`,
        role: Role.CASHIER,
      },
    });
    cashierUserId = cashier.id;

    const [outletA, outletB] = await Promise.all([
      db.outlet.create({
        data: { name: "Rcv Outlet A", code: `RCV-A-${TEST_SUFFIX}`, address: "A" },
      }),
      db.outlet.create({
        data: { name: "Rcv Outlet B", code: `RCV-B-${TEST_SUFFIX}`, address: "B" },
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

    const supplier = await db.supplier.create({
      data: { name: "Rcv Supplier", email: "rcv-supplier@test.local", phone: "0123" },
    });
    supplierId = supplier.id;

    const [productA, productB] = await Promise.all([
      db.product.create({
        data: {
          name: "Rcv Product A",
          sku: `RCV-PROD-A-${TEST_SUFFIX}`,
          price: 15000,
          costPrice: 8000,
          isActive: true,
        },
      }),
      db.product.create({
        data: {
          name: "Rcv Product B",
          sku: `RCV-PROD-B-${TEST_SUFFIX}`,
          price: 25000,
          costPrice: 12000,
          isActive: true,
        },
      }),
    ]);
    productIdA = productA.id;
    productIdB = productB.id;

    const invA = await db.inventory.create({
      data: { productId: productIdA, outletId: outletAId, quantity: 5, costPrice: 8000 },
    });
    inventoryAId = invA.id;
  });

  afterAll(async () => {
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
    await db.supplier.deleteMany({
      where: { id: supplierId },
    });
    await db.outlet.deleteMany({
      where: { id: { in: [outletAId, outletBId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [adminUserId, cashierUserId] } },
    });
  });

  it("receives stock: increments inventory, updates costPrice, creates PURCHASE movement", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    const result = await caller.outlets.receiveStock({
      outletId: outletAId,
      supplierId,
      invoiceNumber: "INV-TEST-001",
      notes: "Penerimaan tes",
      items: [
        { productId: productIdA, quantity: 10, costPrice: 7500 },
        { productId: productIdB, quantity: 5, costPrice: 11000 },
      ],
    });

    expect(result.supplierName).toBe("Rcv Supplier");
    expect(result.invoiceNumber).toBe("INV-TEST-001");
    expect(result.items).toHaveLength(2);

    const itemA = result.items.find((i) => i.productId === productIdA);
    expect(itemA?.quantity).toBe(10);
    expect(itemA?.costPrice).toBe(7500);
    expect(itemA?.newStockLevel).toBe(15); // 5 + 10

    const itemB = result.items.find((i) => i.productId === productIdB);
    expect(itemB?.quantity).toBe(5);
    expect(itemB?.newStockLevel).toBe(5); // no prior inventory

    // Verify DB state
    const invA = await db.inventory.findUnique({ where: { id: inventoryAId } });
    expect(invA?.quantity).toBe(15);
    expect(Number(invA?.costPrice)).toBe(7500);

    const invB = await db.inventory.findUnique({
      where: {
        productId_outletId: { productId: productIdB, outletId: outletAId },
      },
    });
    expect(invB?.quantity).toBe(5);
    expect(Number(invB?.costPrice)).toBe(11000);

    // Verify product costPrice updated
    const productA = await db.product.findUnique({ where: { id: productIdA } });
    expect(Number(productA?.costPrice)).toBe(7500);

    // Verify stock movements
    const movements = await db.stockMovement.findMany({
      where: {
        outletId: outletAId,
        type: "PURCHASE",
        productId: { in: [productIdA, productIdB] },
      },
    });
    expect(movements).toHaveLength(2);

    const moveA = movements.find((m) => m.productId === productIdA);
    expect(moveA?.quantity).toBe(10);
    expect(moveA?.reference).toBe("INV-INV-TEST-001");
    expect(moveA?.note).toContain("Rcv Supplier");

    const moveB = movements.find((m) => m.productId === productIdB);
    expect(moveB?.quantity).toBe(5);
  });

  it("links product to supplier if not already linked", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    // Create a fresh product with no supplier
    const freshProduct = await db.product.create({
      data: {
        name: "Rcv Fresh Product",
        sku: `RCV-FRESH-${TEST_SUFFIX}`,
        price: 5000,
        costPrice: 2000,
        isActive: true,
      },
    });

    const before = await db.product.findUnique({ where: { id: freshProduct.id } });
    expect(before?.supplierId).toBeNull();

    await caller.outlets.receiveStock({
      outletId: outletAId,
      supplierId,
      items: [{ productId: freshProduct.id, quantity: 1, costPrice: 2000 }],
    });

    const after = await db.product.findUnique({ where: { id: freshProduct.id } });
    expect(after?.supplierId).toBe(supplierId);

    await db.stockMovement.deleteMany({
      where: { productId: freshProduct.id },
    });
    await db.inventory.deleteMany({
      where: { productId: freshProduct.id },
    });
    await db.product.delete({ where: { id: freshProduct.id } });
  });

  it("does not relink product if already has a supplier", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    // Assign a different supplier
    const otherSupplier = await db.supplier.create({
      data: { name: "Other Supplier" },
    });

    await db.product.update({
      where: { id: productIdA },
      data: { supplierId: otherSupplier.id },
    });

    await caller.outlets.receiveStock({
      outletId: outletAId,
      supplierId,
      items: [{ productId: productIdA, quantity: 1, costPrice: 8000 }],
    });

    const after = await db.product.findUnique({ where: { id: productIdA } });
    expect(after?.supplierId).toBe(otherSupplier.id); // not overwritten

    await db.supplier.delete({ where: { id: otherSupplier.id } });
  });

  it("blocks cashier from receiving into unauthorized outlet", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletBId,
        supplierId,
        items: [{ productId: productIdA, quantity: 1, costPrice: 8000 }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to receive into any outlet", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    const result = await caller.outlets.receiveStock({
      outletId: outletBId,
      supplierId,
      items: [{ productId: productIdA, quantity: 3, costPrice: 9000 }],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.newStockLevel).toBe(3); // no prior inventory in B

    const inv = await db.inventory.findUnique({
      where: {
        productId_outletId: { productId: productIdA, outletId: outletBId },
      },
    });
    expect(inv?.quantity).toBe(3);
  });

  it("rejects unknown supplier", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletAId,
        supplierId: "nonexistent",
        items: [{ productId: productIdA, quantity: 1, costPrice: 8000 }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects unknown product", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletAId,
        supplierId,
        items: [{ productId: "nonexistent", quantity: 1, costPrice: 8000 }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects empty items array", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletAId,
        supplierId,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects zero or negative quantity", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletAId,
        supplierId,
        items: [{ productId: productIdA, quantity: 0, costPrice: 8000 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects negative costPrice", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    await expect(
      caller.outlets.receiveStock({
        outletId: outletAId,
        supplierId,
        items: [{ productId: productIdA, quantity: 1, costPrice: -100 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("works without invoice number (reference is undefined)", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

    const result = await caller.outlets.receiveStock({
      outletId: outletAId,
      supplierId,
      items: [{ productId: productIdA, quantity: 2, costPrice: 8000 }],
    });

    expect(result.invoiceNumber).toBeNull();

    const movements = await db.stockMovement.findMany({
      where: {
        outletId: outletAId,
        type: "PURCHASE",
        productId: productIdA,
        reference: null,
      },
    });
    expect(movements.length).toBeGreaterThanOrEqual(1);
  });
});
