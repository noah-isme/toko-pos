import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { CustomerTier, OutletRole, PaymentMethod, Role, SaleStatus } from "@prisma/client";

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const TEST_SUFFIX = String(Date.now()).slice(-6);

let adminUserId: string;
let cashierUserId: string;
let outletAId: string;
let outletBId: string;
let productId: string;
/** Has a COMPLETED sale at outlet A, so it is both scoped to A and undeletable. */
let customerWithSaleId: string;
/** No sales at all. */
let customerNoSalesId: string;

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `cust-${role.toLowerCase()}-${TEST_SUFFIX}@test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("Customers & loyalty router", () => {
  beforeAll(async () => {
    const admin = await db.user.create({
      data: {
        name: "Cust Admin",
        email: `cust-admin-${TEST_SUFFIX}@test.local`,
        role: Role.ADMIN,
      },
    });
    adminUserId = admin.id;

    const cashier = await db.user.create({
      data: {
        name: "Cust Cashier",
        email: `cust-cashier-${TEST_SUFFIX}@test.local`,
        role: Role.CASHIER,
      },
    });
    cashierUserId = cashier.id;

    const [outletA, outletB] = await Promise.all([
      db.outlet.create({
        data: { name: "Cust Outlet A", code: `CUST-A-${TEST_SUFFIX}`, address: "A" },
      }),
      db.outlet.create({
        data: { name: "Cust Outlet B", code: `CUST-B-${TEST_SUFFIX}`, address: "B" },
      }),
    ]);
    outletAId = outletA.id;
    outletBId = outletB.id;

    // The cashier is assigned to outlet A only, so outlet B is the RBAC negative.
    await db.userOutlet.create({
      data: {
        userId: cashierUserId,
        outletId: outletAId,
        role: OutletRole.CASHIER,
        isActive: true,
      },
    });

    const category = await db.category.create({
      data: { name: `Cust Category ${TEST_SUFFIX}`, slug: `cust-category-${TEST_SUFFIX}` },
    });

    const product = await db.product.create({
      data: {
        name: "Cust Product",
        sku: `CUST-SKU-${TEST_SUFFIX}`,
        price: 10000,
        costPrice: 6000,
        categoryId: category.id,
      },
    });
    productId = product.id;

    const withSale = await db.customer.create({
      data: {
        name: "Pelanggan Dengan Transaksi",
        phone: `0811${TEST_SUFFIX}`,
        membershipCard: `CARD-A-${TEST_SUFFIX}`,
        tier: CustomerTier.GOLD,
        points: 100,
      },
    });
    customerWithSaleId = withSale.id;

    const noSales = await db.customer.create({
      data: {
        name: "Pelanggan Baru",
        phone: `0822${TEST_SUFFIX}`,
        tier: CustomerTier.REGULAR,
        points: 0,
      },
    });
    customerNoSalesId = noSales.id;

    const sale = await db.sale.create({
      data: {
        receiptNumber: `CUST-RCP-${TEST_SUFFIX}`,
        outletId: outletAId,
        cashierId: cashierUserId,
        customerId: customerWithSaleId,
        status: SaleStatus.COMPLETED,
        totalGross: 10000,
        discountTotal: 0,
        taxAmount: 0,
        totalNet: 10000,
        soldAt: new Date(),
      },
    });

    await db.saleItem.create({
      data: {
        saleId: sale.id,
        productId,
        quantity: 1,
        unitPrice: 10000,
        discount: 0,
        total: 10000,
      },
    });

    await db.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.CASH,
        amount: 10000,
      },
    });
  });

  afterAll(async () => {
    await db.pointHistory.deleteMany({
      where: { customerId: { in: [customerWithSaleId, customerNoSalesId] } },
    });
    await db.payment.deleteMany({ where: { sale: { outletId: outletAId } } });
    await db.saleItem.deleteMany({ where: { sale: { outletId: outletAId } } });
    await db.sale.deleteMany({ where: { outletId: outletAId } });
    await db.customer.deleteMany({
      where: { id: { in: [customerWithSaleId, customerNoSalesId] } },
    });
    await db.customer.deleteMany({
      where: { membershipCard: { contains: TEST_SUFFIX } },
    });
    await db.customer.deleteMany({ where: { name: { contains: TEST_SUFFIX } } });
    await db.product.deleteMany({ where: { sku: `CUST-SKU-${TEST_SUFFIX}` } });
    await db.category.deleteMany({ where: { slug: `cust-category-${TEST_SUFFIX}` } });
    await db.userOutlet.deleteMany({ where: { userId: cashierUserId } });
    await db.outlet.deleteMany({ where: { id: { in: [outletAId, outletBId] } } });
    await db.user.deleteMany({ where: { id: { in: [adminUserId, cashierUserId] } } });
  });

  describe("list", () => {
    it("returns customers that have a sale at the requested outlet", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const result = await caller.customers.list({ outletId: outletAId, take: 100 });
      const ids = result.customers.map((c) => c.id);

      expect(ids).toContain(customerWithSaleId);
    });

    it("includes customers with no sales yet, so a freshly created one is visible", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const created = await caller.customers.create({
        outletId: outletAId,
        name: `Baru Terlihat ${TEST_SUFFIX}`,
        tier: CustomerTier.REGULAR,
      });

      const result = await caller.customers.list({ outletId: outletAId, take: 100 });
      expect(result.customers.map((c) => c.id)).toContain(created.id);

      await db.customer.delete({ where: { id: created.id } });
    });

    it("excludes a customer whose only sale is at another outlet", async () => {
      const admin = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const otherCustomer = await db.customer.create({
        data: { name: `Outlet B Only ${TEST_SUFFIX}`, tier: CustomerTier.REGULAR },
      });
      const otherSale = await db.sale.create({
        data: {
          receiptNumber: `CUST-B-RCP-${TEST_SUFFIX}`,
          outletId: outletBId,
          cashierId: adminUserId,
          customerId: otherCustomer.id,
          status: SaleStatus.COMPLETED,
          totalGross: 5000,
          discountTotal: 0,
          taxAmount: 0,
          totalNet: 5000,
          soldAt: new Date(),
        },
      });

      const result = await admin.customers.list({ outletId: outletAId, take: 100 });
      expect(result.customers.map((c) => c.id)).not.toContain(otherCustomer.id);

      await db.sale.delete({ where: { id: otherSale.id } });
      await db.customer.delete({ where: { id: otherCustomer.id } });
    });

    it("filters by tier", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const result = await caller.customers.list({
        outletId: outletAId,
        tier: CustomerTier.GOLD,
        take: 100,
      });

      expect(result.customers.every((c) => c.tier === CustomerTier.GOLD)).toBe(true);
      expect(result.customers.map((c) => c.id)).toContain(customerWithSaleId);
    });

    it("filters by search term against name", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const result = await caller.customers.list({
        outletId: outletAId,
        search: "Dengan Transaksi",
        take: 100,
      });

      expect(result.customers.map((c) => c.id)).toContain(customerWithSaleId);
      expect(result.customers.map((c) => c.id)).not.toContain(customerNoSalesId);
    });

    it("denies a cashier listing an outlet they are not assigned to", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      await expect(
        caller.customers.list({ outletId: outletBId, take: 10 }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("create / update / delete", () => {
    it("creates a customer and normalises blank optional fields to null", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const created = await caller.customers.create({
        outletId: outletAId,
        name: `Kosong Opsional ${TEST_SUFFIX}`,
        email: "",
        phone: "",
        membershipCard: "",
        notes: "",
        tier: CustomerTier.SILVER,
      });

      expect(created.email).toBeNull();
      expect(created.phone).toBeNull();
      expect(created.membershipCard).toBeNull();
      expect(created.notes).toBeNull();
      expect(created.tier).toBe(CustomerTier.SILVER);
      expect(created.points).toBe(0);

      await db.customer.delete({ where: { id: created.id } });
    });

    it("denies a cashier creating a customer (admin/owner only)", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      await expect(
        caller.customers.create({
          outletId: outletAId,
          name: `Tidak Boleh ${TEST_SUFFIX}`,
          tier: CustomerTier.REGULAR,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("updates tier and name", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const updated = await caller.customers.update({
        id: customerNoSalesId,
        outletId: outletAId,
        name: "Pelanggan Baru Diperbarui",
        tier: CustomerTier.PLATINUM,
      });

      expect(updated.name).toBe("Pelanggan Baru Diperbarui");
      expect(updated.tier).toBe(CustomerTier.PLATINUM);

      await caller.customers.update({
        id: customerNoSalesId,
        outletId: outletAId,
        name: "Pelanggan Baru",
        tier: CustomerTier.REGULAR,
      });
    });

    it("rejects an invalid email", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      await expect(
        caller.customers.create({
          outletId: outletAId,
          name: `Email Salah ${TEST_SUFFIX}`,
          email: "bukan-email",
          tier: CustomerTier.REGULAR,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("refuses to delete a customer that has transaction history", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      await expect(
        caller.customers.delete({ id: customerWithSaleId, outletId: outletAId }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const stillThere = await db.customer.findUnique({
        where: { id: customerWithSaleId },
      });
      expect(stillThere).not.toBeNull();
    });

    it("deletes a customer with no transaction history", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const throwaway = await db.customer.create({
        data: { name: `Hapus Saya ${TEST_SUFFIX}`, tier: CustomerTier.REGULAR },
      });

      const result = await caller.customers.delete({
        id: throwaway.id,
        outletId: outletAId,
      });
      expect(result.success).toBe(true);

      const gone = await db.customer.findUnique({ where: { id: throwaway.id } });
      expect(gone).toBeNull();
    });
  });

  describe("adjustPoints", () => {
    it("adds points and records a PointHistory row", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const before = await db.customer.findUniqueOrThrow({
        where: { id: customerNoSalesId },
      });

      const result = await caller.customers.adjustPoints({
        customerId: customerNoSalesId,
        outletId: outletAId,
        points: 50,
        type: "EARNED",
        reference: `TEST-${TEST_SUFFIX}`,
      });

      expect(result.customer.points).toBe(before.points + 50);
      expect(result.pointHistory.points).toBe(50);
      expect(result.pointHistory.type).toBe("EARNED");

      const history = await db.pointHistory.findMany({
        where: { customerId: customerNoSalesId, reference: `TEST-${TEST_SUFFIX}` },
      });
      expect(history).toHaveLength(1);
    });

    it("subtracts points when given a negative amount", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const before = await db.customer.findUniqueOrThrow({
        where: { id: customerWithSaleId },
      });

      const result = await caller.customers.adjustPoints({
        customerId: customerWithSaleId,
        outletId: outletAId,
        points: -30,
        type: "REDEEMED",
      });

      expect(result.customer.points).toBe(before.points - 30);
    });

    it("clamps the balance at zero instead of going negative", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const result = await caller.customers.adjustPoints({
        customerId: customerNoSalesId,
        outletId: outletAId,
        points: -999_999,
        type: "REDEEMED",
      });

      expect(result.customer.points).toBe(0);
    });

    it("rejects an unknown customer", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      await expect(
        caller.customers.adjustPoints({
          customerId: "does-not-exist",
          outletId: outletAId,
          points: 10,
          type: "EARNED",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("denies a cashier adjusting points", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      await expect(
        caller.customers.adjustPoints({
          customerId: customerNoSalesId,
          outletId: outletAId,
          points: 10,
          type: "EARNED",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("lookup", () => {
    it("finds a customer by membership card", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      const found = await caller.customers.searchByCard({
        membershipCard: `CARD-A-${TEST_SUFFIX}`,
        outletId: outletAId,
      });

      expect(found?.id).toBe(customerWithSaleId);
      expect(found?.recentSales.length).toBeGreaterThanOrEqual(1);
    });

    it("returns null for an unknown membership card", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      const found = await caller.customers.searchByCard({
        membershipCard: `NOPE-${TEST_SUFFIX}`,
        outletId: outletAId,
      });

      expect(found).toBeNull();
    });

    it("finds a customer by phone", async () => {
      const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));

      const found = await caller.customers.searchByPhone({
        phone: `0811${TEST_SUFFIX}`,
        outletId: outletAId,
      });

      expect(found?.id).toBe(customerWithSaleId);
    });

    it("returns sale history and point history from getById", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      const detail = await caller.customers.getById({ id: customerWithSaleId });

      expect(detail.id).toBe(customerWithSaleId);
      expect(detail.sales.length).toBeGreaterThanOrEqual(1);
      expect(detail.sales[0]!.items.length).toBeGreaterThanOrEqual(1);
      expect(detail.sales[0]!.payments.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(detail.pointHistory)).toBe(true);
    });

    it("rejects getById for an unknown customer", async () => {
      const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));

      await expect(
        caller.customers.getById({ id: "does-not-exist" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
