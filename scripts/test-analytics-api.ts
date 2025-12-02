#!/usr/bin/env tsx
/**
 * Manual API Testing Script for Analytics Endpoints
 *
 * This script tests all Owner Dashboard analytics endpoints manually
 * without requiring a running server. It directly calls the TRPC procedures.
 *
 * Usage:
 *   pnpm tsx scripts/test-analytics-api.ts
 */

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { startOfDay, endOfDay, subDays } from "date-fns";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n");
  log("═".repeat(80), colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log("═".repeat(80), colors.cyan);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function formatJSON(obj: any) {
  return JSON.stringify(obj, null, 2);
}

// ============================================================================
// Test Configuration
// ============================================================================

interface TestConfig {
  userId?: string;
  outletId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  log("🚀 Analytics API Testing Script", colors.bright + colors.magenta);
  log("━".repeat(80), colors.magenta);

  try {
    // Step 1: Find test user and outlet
    logSection("Step 1: Setup Test Environment");

    const user = await db.user.findFirst({
      where: {
        role: { in: [Role.OWNER, Role.ADMIN] },
      },
    });

    if (!user) {
      logError("No owner or admin user found in database");
      logInfo("Please create a user first or run: pnpm prisma db seed");
      process.exit(1);
    }

    logSuccess(`Found user: ${user.name || user.email} (${user.role})`);

    const outlet = await db.outlet.findFirst();

    const outletId = outlet?.id;
    if (outlet) {
      logSuccess(`Found outlet: ${outlet.name}`);
    } else {
      logWarning("No outlet found - will test with all outlets");
    }

    // Create mock session
    const mockSession: Session = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    // Create caller
    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller({ ...ctx, session: mockSession });

    // Test configuration
    const config: TestConfig = {
      userId: user.id,
      outletId: outletId,
      dateRange: {
        from: startOfDay(subDays(new Date(), 7)),
        to: endOfDay(new Date()),
      },
    };

    logInfo(
      `Test Date Range: ${config.dateRange.from.toISOString()} to ${config.dateRange.to.toISOString()}`,
    );

    // Step 2: Test KPI Summary
    logSection("Step 2: Test KPI Summary");
    await testKpiSummary(caller, config);

    // Step 3: Test Sales Trend
    logSection("Step 3: Test Sales Trend");
    await testSalesTrend(caller, config);

    // Step 4: Test Category Breakdown
    logSection("Step 4: Test Category Breakdown");
    await testCategoryBreakdown(caller, config);

    // Step 5: Test Outlet Performance
    logSection("Step 5: Test Outlet Performance");
    await testOutletPerformance(caller, config);

    // Step 6: Test Low Stock Alerts
    logSection("Step 6: Test Low Stock Alerts");
    await testLowStockAlerts(caller, config);

    // Step 7: Test Shift Activity
    logSection("Step 7: Test Shift Activity");
    await testShiftActivity(caller, config);

    // Step 8: Test Activity Log
    logSection("Step 8: Test Activity Log");
    await testActivityLog(caller, config);

    // Summary
    logSection("Test Summary");
    logSuccess("All analytics endpoints tested successfully! 🎉");
    logInfo("Check the output above for detailed results");
  } catch (error) {
    logError(
      `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// Test Functions
// ============================================================================

async function testKpiSummary(caller: any, config: TestConfig) {
  try {
    logInfo("Testing KPI Summary endpoint...");

    // Test 1: All outlets with comparison
    log("\n📊 Test 1: All outlets with comparison");
    const result1 = await caller.analytics.getKpiSummary({
      dateRange: config.dateRange,
      compareWithPrevious: true,
    });

    logSuccess("Response received");
    console.log(
      formatJSON({
        totalSales: result1.totalSales.current,
        totalTransactions: result1.totalTransactions.current,
        itemsSold: result1.itemsSold.current,
        profit: result1.profit.current,
        avgTransaction: result1.averageTransactionValue.current,
        topCategory: result1.topSellingCategory,
      }),
    );

    if (result1.totalSales.trend) {
      log(
        `   Trend: ${result1.totalSales.trend.direction} ${result1.totalSales.trend.value}%`,
        colors.cyan,
      );
    }

    // Test 2: Specific outlet
    if (config.outletId) {
      log("\n📊 Test 2: Specific outlet");
      const result2 = await caller.analytics.getKpiSummary({
        outletId: config.outletId,
        dateRange: config.dateRange,
        compareWithPrevious: false,
      });

      logSuccess("Response received");
      console.log(
        formatJSON({
          totalSales: result2.totalSales.current,
          totalTransactions: result2.totalTransactions.current,
        }),
      );
    }

    // Test 3: Today only
    log("\n📊 Test 3: Today only");
    const result3 = await caller.analytics.getKpiSummary({
      dateRange: {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      },
      compareWithPrevious: true,
    });

    logSuccess("Response received");
    console.log(
      formatJSON({
        totalSales: result3.totalSales.current,
        totalTransactions: result3.totalTransactions.current,
      }),
    );
  } catch (error) {
    logError(
      `KPI Summary test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testSalesTrend(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Sales Trend endpoint...");

    const granularities = ["hour", "day", "week", "month"] as const;

    for (const granularity of granularities) {
      log(`\n📈 Testing granularity: ${granularity}`);

      const result = await caller.analytics.getSalesTrend({
        outletId: config.outletId,
        dateRange: config.dateRange,
        granularity,
      });

      logSuccess(`Received ${result.length} data points`);

      if (result.length > 0) {
        console.log("   Sample data point:");
        console.log(formatJSON(result[0]));
      }
    }
  } catch (error) {
    logError(
      `Sales Trend test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testCategoryBreakdown(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Category Breakdown endpoint...");

    const result = await caller.analytics.getCategoryBreakdown({
      outletId: config.outletId,
      dateRange: config.dateRange,
    });

    logSuccess(`Received ${result.length} categories`);

    if (result.length > 0) {
      console.log("\n📊 Category Breakdown:");
      result.forEach((cat: any, index: number) => {
        console.log(
          `   ${index + 1}. ${cat.category}: Rp ${cat.sales.toLocaleString()} (${cat.percentage}%)`,
        );
      });

      // Verify percentages sum to ~100
      const totalPercentage = result.reduce(
        (sum: number, cat: any) => sum + cat.percentage,
        0,
      );
      log(`   Total percentage: ${totalPercentage.toFixed(1)}%`, colors.cyan);
    }
  } catch (error) {
    logError(
      `Category Breakdown test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testOutletPerformance(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Outlet Performance endpoint...");

    const result = await caller.analytics.getOutletPerformance({
      dateRange: config.dateRange,
    });

    logSuccess(`Received ${result.length} outlets`);

    if (result.length > 0) {
      console.log("\n🏪 Outlet Performance:");
      result.forEach((outlet: any, index: number) => {
        console.log(`   ${index + 1}. ${outlet.outletName}`);
        console.log(`      Sales: Rp ${outlet.sales.toLocaleString()}`);
        console.log(`      Transactions: ${outlet.transactions}`);
        console.log(
          `      Trend: ${outlet.trend.direction} ${outlet.trend.value}%`,
        );
      });
    }
  } catch (error) {
    logError(
      `Outlet Performance test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testLowStockAlerts(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Low Stock Alerts endpoint...");

    // Test 1: All outlets
    log("\n⚠️  Test 1: All outlets");
    const result1 = await caller.analytics.getLowStockAlerts({
      threshold: 10,
      limit: 10,
    });

    logSuccess(`Received ${result1.length} low stock items`);

    if (result1.length > 0) {
      console.log("\n   Low Stock Items:");
      result1.forEach((item: any, index: number) => {
        console.log(`   ${index + 1}. ${item.productName} (${item.sku})`);
        console.log(`      Outlet: ${item.outletName}`);
        console.log(
          `      Stock: ${item.currentStock} (Status: ${item.status})`,
        );
      });
    } else {
      logInfo("No low stock items found - all inventory levels are healthy!");
    }

    // Test 2: Specific outlet
    if (config.outletId) {
      log("\n⚠️  Test 2: Specific outlet");
      const result2 = await caller.analytics.getLowStockAlerts({
        outletId: config.outletId,
        threshold: 20,
        limit: 5,
      });

      logSuccess(`Received ${result2.length} low stock items`);
    }
  } catch (error) {
    logError(
      `Low Stock Alerts test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testShiftActivity(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Shift Activity endpoint...");

    // Test 1: Today's shifts
    log("\n🔄 Test 1: Today's shifts");
    const result1 = await caller.analytics.getShiftActivity({
      date: new Date(),
    });

    logSuccess(`Received ${result1.length} shift sessions`);

    if (result1.length > 0) {
      console.log("\n   Shift Sessions:");
      result1.forEach((session: any, index: number) => {
        console.log(
          `   ${index + 1}. ${session.cashierName} @ ${session.outletName}`,
        );
        console.log(`      Status: ${session.status}`);
        console.log(
          `      Opening Cash: Rp ${session.openingCash.toLocaleString()}`,
        );
        console.log(
          `      Total Sales: Rp ${session.totalSales.toLocaleString()}`,
        );
        console.log(`      Transactions: ${session.totalTransactions}`);
        if (session.status === "closed" && session.difference !== undefined) {
          console.log(
            `      Difference: Rp ${session.difference.toLocaleString()}`,
          );
        }
      });
    } else {
      logInfo("No shift sessions found for today");
    }

    // Test 2: Specific outlet
    if (config.outletId) {
      log("\n🔄 Test 2: Specific outlet");
      const result2 = await caller.analytics.getShiftActivity({
        outletId: config.outletId,
        date: new Date(),
      });

      logSuccess(`Received ${result2.length} shift sessions`);
    }
  } catch (error) {
    logError(
      `Shift Activity test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function testActivityLog(caller: any, config: TestConfig) {
  try {
    logInfo("Testing Activity Log endpoint...");

    // Test 1: Recent activities
    log("\n📝 Test 1: Recent activities (first page)");
    const result1 = await caller.analytics.getActivityLog({
      limit: 10,
      offset: 0,
    });

    logSuccess(
      `Received ${result1.activities.length} activities (Total: ${result1.total})`,
    );
    log(`   Has more: ${result1.hasMore}`, colors.cyan);

    if (result1.activities.length > 0) {
      console.log("\n   Recent Activities:");
      result1.activities.forEach((activity: any, index: number) => {
        console.log(
          `   ${index + 1}. [${activity.type}] ${activity.description}`,
        );
        console.log(`      User: ${activity.user} @ ${activity.outlet}`);
        console.log(
          `      Time: ${new Date(activity.timestamp).toLocaleString()}`,
        );
      });
    }

    // Test 2: Pagination
    if (result1.hasMore) {
      log("\n📝 Test 2: Pagination (second page)");
      const result2 = await caller.analytics.getActivityLog({
        limit: 10,
        offset: 10,
      });

      logSuccess(`Received ${result2.activities.length} activities`);
    }

    // Test 3: Filter by date range
    log("\n📝 Test 3: Filter by date range");
    const result3 = await caller.analytics.getActivityLog({
      dateRange: config.dateRange,
      limit: 5,
      offset: 0,
    });

    logSuccess(
      `Received ${result3.activities.length} activities in date range`,
    );

    // Test 4: Filter by outlet
    if (config.outletId) {
      log("\n📝 Test 4: Filter by outlet");
      const result4 = await caller.analytics.getActivityLog({
        outletId: config.outletId,
        limit: 5,
        offset: 0,
      });

      logSuccess(`Received ${result4.activities.length} activities for outlet`);
    }
  } catch (error) {
    logError(
      `Activity Log test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

// ============================================================================
// Run Tests
// ============================================================================

main()
  .then(() => {
    log("\n✨ All tests completed!", colors.bright + colors.green);
    process.exit(0);
  })
  .catch((error) => {
    logError("\n💥 Test suite failed!");
    console.error(error);
    process.exit(1);
  });
