/**
 * Analytics API Test Suite
 * Tests for Owner Dashboard analytics endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import type { Session } from "next-auth";
import { SaleStatus, Role, PaymentMethod } from "@prisma/client";
import { startOfDay, endOfDay, subDays } from "date-fns";

// Test data IDs
let testUserId: string;
let testOutletId: string;
let testProductId: string;
let testCashSessionId: string;
let testSaleIds: string[] = [];

// Mock session
const mockSession: Session = {
  user: {
    id: "",
    name: "Test Owner",
    email: "owner@test.com",
    role: Role.OWNER,
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe("Analytics API Tests", () => {
  // ============================================================================
  // Setup & Teardown
  // ============================================================================

  beforeAll(async () => {
    console.log("🔧 Setting up test data...");

    // Create test user
    const user = await db.user.create({
      data: {
        name: "Test Owner",
        email: "owner@test.com",
        role: Role.OWNER,
      },
    });
    testUserId = user.id;
    mockSession.user.id = user.id;

    // Create test outlet
    const outlet = await db.outlet.create({
      data: {
        name: "Test Outlet",
        code: "TEST-OUTLET-001",
        address: "Test Address",
      },
    });
    testOutletId = outlet.id;

    // Create test product
    const product = await db.product.create({
      data: {
        name: "Test Product",
        sku: "TEST-001",
        price: 100000,
        costPrice: 75000,
        isActive: true,
      },
    });
    testProductId = product.id;

    // Create inventory item
    await db.inventory.create({
      data: {
        productId: testProductId,
        outletId: testOutletId,
        quantity: 5, // Low stock
      },
    });

    // Create cash session
    const cashSession = await db.cashSession.create({
      data: {
        outletId: testOutletId,
        userId: testUserId,
        openingCash: 100000,
        openTime: new Date(),
      },
    });
    testCashSessionId = cashSession.id;

    // Create test sales data for the last 7 days
    console.log("📊 Creating test sales data...");
    for (let i = 0; i < 7; i++) {
      const saleDate = subDays(new Date(), i);
      const numberOfSales = 3 + Math.floor(Math.random() * 3); // 3-5 sales per day

      for (let j = 0; j < numberOfSales; j++) {
        const sale = await db.sale.create({
          data: {
            outletId: testOutletId,
            cashierId: testUserId,
            sessionId: testCashSessionId,
            receiptNumber: `TEST-${i}-${j}`,
            totalGross: 100000,
            discountTotal: 0,
            taxAmount: 11000,
            totalNet: 111000,
            status: SaleStatus.COMPLETED,
            soldAt: saleDate,
            items: {
              create: [
                {
                  productId: testProductId,
                  quantity: 1 + j,
                  unitPrice: 100000,
                  discount: 0,
                  total: 100000 * (1 + j),
                },
              ],
            },
            payments: {
              create: [
                {
                  method: PaymentMethod.CASH,
                  amount: 111000,
                },
              ],
            },
          },
        });
        testSaleIds.push(sale.id);
      }
    }

    // Create activity logs
    await db.activityLog.create({
      data: {
        userId: testUserId,
        outletId: testOutletId,
        action: "SALE_CREATED",
        entity: "SALE",
        details: { test: true },
      },
    });

    console.log("✅ Test data setup complete");
    console.log(`   - User ID: ${testUserId}`);
    console.log(`   - Outlet ID: ${testOutletId}`);
    console.log(`   - Product ID: ${testProductId}`);
    console.log(`   - Cash Session ID: ${testCashSessionId}`);
    console.log(`   - Sales Created: ${testSaleIds.length}`);
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up test data...");

    // Delete in correct order to avoid foreign key constraints
    await db.payment.deleteMany({ where: { saleId: { in: testSaleIds } } });
    await db.saleItem.deleteMany({ where: { saleId: { in: testSaleIds } } });
    await db.sale.deleteMany({ where: { id: { in: testSaleIds } } });
    await db.activityLog.deleteMany({ where: { userId: testUserId } });
    await db.cashSession.deleteMany({ where: { id: testCashSessionId } });
    await db.inventory.deleteMany({ where: { outletId: testOutletId } });
    await db.product.deleteMany({ where: { id: testProductId } });
    await db.outlet.deleteMany({ where: { id: testOutletId } });
    await db.user.deleteMany({ where: { id: testUserId } });

    console.log("✅ Cleanup complete");
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const createCaller = async () => {
    const ctx = await createTRPCContext();
    // Override session for testing
    return appRouter.createCaller({ ...ctx, session: mockSession });
  };

  // ============================================================================
  // KPI Summary Tests
  // ============================================================================

  describe("getKpiSummary", () => {
    it("should return KPI summary for all outlets", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getKpiSummary({
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
        compareWithPrevious: true,
      });

      expect(result).toBeDefined();
      expect(result.totalSales).toBeDefined();
      expect(result.totalSales.current).toBeGreaterThan(0);
      expect(result.totalTransactions).toBeDefined();
      expect(result.totalTransactions.current).toBeGreaterThan(0);
      expect(result.itemsSold).toBeDefined();
      expect(result.itemsSold.current).toBeGreaterThan(0);
      expect(result.profit).toBeDefined();
      expect(result.averageTransactionValue).toBeDefined();

      // Check if trend is calculated when comparing
      if (result.totalSales.previous !== undefined) {
        expect(result.totalSales.trend).toBeDefined();
        expect(result.totalSales.trend?.direction).toMatch(
          /^(up|down|neutral)$/,
        );
      }

      console.log("📊 KPI Summary:", {
        totalSales: result.totalSales.current,
        transactions: result.totalTransactions.current,
        items: result.itemsSold.current,
        profit: result.profit.current,
        avgTransaction: result.averageTransactionValue.current,
      });
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getKpiSummary({
        outletId: testOutletId,
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
        compareWithPrevious: false,
      });

      expect(result).toBeDefined();
      expect(result.totalSales.current).toBeGreaterThan(0);
      expect(result.totalSales.previous).toBeUndefined();
      expect(result.totalSales.trend).toBeUndefined();
    });

    it("should return zero values for date range with no sales", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getKpiSummary({
        dateRange: {
          from: startOfDay(subDays(new Date(), 365)),
          to: endOfDay(subDays(new Date(), 360)),
        },
        compareWithPrevious: false,
      });

      expect(result).toBeDefined();
      expect(result.totalSales.current).toBe(0);
      expect(result.totalTransactions.current).toBe(0);
      expect(result.itemsSold.current).toBe(0);
    });
  });

  // ============================================================================
  // Sales Trend Tests
  // ============================================================================

  describe("getSalesTrend", () => {
    it("should return daily sales trend", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getSalesTrend({
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
        granularity: "day",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure of each data point
      result.forEach((point) => {
        expect(point.timestamp).toBeDefined();
        expect(typeof point.sales).toBe("number");
        expect(typeof point.transactions).toBe("number");
        expect(typeof point.items).toBe("number");
      });

      console.log("📈 Sales Trend (Daily):", result.length, "data points");
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getSalesTrend({
        outletId: testOutletId,
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
        granularity: "day",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should support different granularities", async () => {
      const caller = await createCaller();

      const granularities = ["hour", "day", "week", "month"] as const;

      for (const granularity of granularities) {
        const result = await caller.analytics.getSalesTrend({
          dateRange: {
            from: startOfDay(subDays(new Date(), 7)),
            to: endOfDay(new Date()),
          },
          granularity,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        console.log(`   - ${granularity}: ${result.length} data points`);
      }
    });
  });

  // ============================================================================
  // Category Breakdown Tests
  // ============================================================================

  describe("getCategoryBreakdown", () => {
    it("should return sales by category", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getCategoryBreakdown({
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure
      result.forEach((category) => {
        expect(category.category).toBeDefined();
        expect(typeof category.sales).toBe("number");
        expect(typeof category.transactions).toBe("number");
        expect(typeof category.items).toBe("number");
        expect(typeof category.percentage).toBe("number");
        expect(category.percentage).toBeGreaterThanOrEqual(0);
        expect(category.percentage).toBeLessThanOrEqual(100);
      });

      // Check that percentages sum to ~100
      const totalPercentage = result.reduce(
        (sum, cat) => sum + cat.percentage,
        0,
      );
      expect(totalPercentage).toBeGreaterThanOrEqual(99);
      expect(totalPercentage).toBeLessThanOrEqual(101);

      console.log("🏷️  Category Breakdown:", result);
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getCategoryBreakdown({
        outletId: testOutletId,
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Outlet Performance Tests
  // ============================================================================

  describe("getOutletPerformance", () => {
    it("should return performance for all outlets", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getOutletPerformance({
        dateRange: {
          from: startOfDay(subDays(new Date(), 7)),
          to: endOfDay(new Date()),
        },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure
      result.forEach((outlet) => {
        expect(outlet.outletId).toBeDefined();
        expect(outlet.outletName).toBeDefined();
        expect(typeof outlet.sales).toBe("number");
        expect(typeof outlet.transactions).toBe("number");
        expect(typeof outlet.items).toBe("number");
        expect(typeof outlet.profit).toBe("number");
        expect(typeof outlet.averageTransactionValue).toBe("number");
        expect(outlet.trend).toBeDefined();
        expect(outlet.trend?.direction).toMatch(/^(up|down|neutral)$/);
      });

      // Check sorted by sales descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].sales).toBeGreaterThanOrEqual(result[i].sales);
      }

      console.log("🏪 Outlet Performance:", result);
    });
  });

  // ============================================================================
  // Low Stock Alerts Tests
  // ============================================================================

  describe("getLowStockAlerts", () => {
    it("should return low stock items", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getLowStockAlerts({
        threshold: 10,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure
      result.forEach((item) => {
        expect(item.productId).toBeDefined();
        expect(item.productName).toBeDefined();
        expect(item.sku).toBeDefined();
        expect(item.outletId).toBeDefined();
        expect(item.outletName).toBeDefined();
        expect(typeof item.currentStock).toBe("number");
        expect(item.status).toMatch(/^(critical|low|warning)$/);
      });

      // Check sorted by stock ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].currentStock).toBeLessThanOrEqual(
          result[i].currentStock,
        );
      }

      console.log("⚠️  Low Stock Alerts:", result);
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getLowStockAlerts({
        outletId: testOutletId,
        threshold: 10,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // All items should be from the specified outlet
      result.forEach((item) => {
        expect(item.outletId).toBe(testOutletId);
      });
    });

    it("should respect limit parameter", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getLowStockAlerts({
        threshold: 100,
        limit: 3,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // Shift Activity Tests
  // ============================================================================

  describe("getShiftActivity", () => {
    it("should return shift activity for today", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getShiftActivity({
        date: new Date(),
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure
      result.forEach((session) => {
        expect(session.sessionId).toBeDefined();
        expect(session.outletId).toBeDefined();
        expect(session.outletName).toBeDefined();
        expect(session.cashierName).toBeDefined();
        expect(session.openTime).toBeDefined();
        expect(typeof session.openingCash).toBe("number");
        expect(typeof session.totalSales).toBe("number");
        expect(typeof session.totalTransactions).toBe("number");
        expect(session.status).toMatch(/^(active|closed)$/);
      });

      console.log("🔄 Shift Activity:", result);
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getShiftActivity({
        outletId: testOutletId,
        date: new Date(),
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // All sessions should be from the specified outlet
      result.forEach((session) => {
        expect(session.outletId).toBe(testOutletId);
      });
    });
  });

  // ============================================================================
  // Activity Log Tests
  // ============================================================================

  describe("getActivityLog", () => {
    it("should return activity log with pagination", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getActivityLog({
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.hasMore).toBe("boolean");

      // Check structure
      result.activities.forEach((activity) => {
        expect(activity.id).toBeDefined();
        expect(activity.timestamp).toBeDefined();
        expect(activity.type).toBeDefined();
        expect(activity.user).toBeDefined();
        expect(activity.outlet).toBeDefined();
        expect(activity.description).toBeDefined();
      });

      console.log("📝 Activity Log:", {
        count: result.activities.length,
        total: result.total,
        hasMore: result.hasMore,
      });
    });

    it("should filter by outlet", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getActivityLog({
        outletId: testOutletId,
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
    });

    it("should filter by date range", async () => {
      const caller = await createCaller();
      const result = await caller.analytics.getActivityLog({
        dateRange: {
          from: startOfDay(new Date()),
          to: endOfDay(new Date()),
        },
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
    });

    it("should paginate correctly", async () => {
      const caller = await createCaller();

      // Get first page
      const page1 = await caller.analytics.getActivityLog({
        limit: 5,
        offset: 0,
      });

      // Get second page
      const page2 = await caller.analytics.getActivityLog({
        limit: 5,
        offset: 5,
      });

      expect(page1.activities).toBeDefined();
      expect(page2.activities).toBeDefined();

      // Make sure pages are different
      if (page1.activities.length > 0 && page2.activities.length > 0) {
        expect(page1.activities[0].id).not.toBe(page2.activities[0].id);
      }
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle invalid date ranges", async () => {
      const caller = await createCaller();

      await expect(
        caller.analytics.getKpiSummary({
          dateRange: {
            from: endOfDay(new Date()),
            to: startOfDay(new Date()),
          },
          compareWithPrevious: false,
        }),
      ).resolves.toBeDefined(); // Should not throw, but return empty/zero results
    });

    it("should handle non-existent outlet", async () => {
      const caller = await createCaller();

      const result = await caller.analytics.getKpiSummary({
        outletId: "non-existent-id",
        dateRange: {
          from: startOfDay(new Date()),
          to: endOfDay(new Date()),
        },
        compareWithPrevious: false,
      });

      expect(result).toBeDefined();
      expect(result.totalSales.current).toBe(0);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe("Performance", () => {
    it("should execute KPI query within acceptable time", async () => {
      const caller = await createCaller();
      const startTime = Date.now();

      await caller.analytics.getKpiSummary({
        dateRange: {
          from: startOfDay(subDays(new Date(), 30)),
          to: endOfDay(new Date()),
        },
        compareWithPrevious: true,
      });

      const duration = Date.now() - startTime;
      console.log(`   ⏱️  KPI query took ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should execute all queries concurrently", async () => {
      const caller = await createCaller();
      const startTime = Date.now();

      await Promise.all([
        caller.analytics.getKpiSummary({
          dateRange: {
            from: startOfDay(subDays(new Date(), 7)),
            to: endOfDay(new Date()),
          },
          compareWithPrevious: true,
        }),
        caller.analytics.getSalesTrend({
          dateRange: {
            from: startOfDay(subDays(new Date(), 7)),
            to: endOfDay(new Date()),
          },
          granularity: "day",
        }),
        caller.analytics.getCategoryBreakdown({
          dateRange: {
            from: startOfDay(subDays(new Date(), 7)),
            to: endOfDay(new Date()),
          },
        }),
      ]);

      const duration = Date.now() - startTime;
      console.log(`   ⏱️  Concurrent queries took ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
