/**
 * Analytics Router for Owner Dashboard
 * Provides KPI metrics, trends, and business intelligence data
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { SaleStatus } from "@prisma/client";
import { startOfDay, endOfDay, startOfWeek } from "date-fns";

// ============================================================================
// Input/Output Schemas
// ============================================================================

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const outletFilterSchema = z.object({
  outletId: z.string().optional(),
  dateRange: dateRangeSchema,
});

// KPI Summary Schemas
const kpiSummaryInputSchema = z.object({
  outletId: z.string().optional(),
  dateRange: dateRangeSchema,
  compareWithPrevious: z.boolean().default(true),
});

const trendSchema = z.object({
  value: z.number(),
  direction: z.enum(["up", "down", "neutral"]),
});

const kpiMetricSchema = z.object({
  current: z.number(),
  previous: z.number().optional(),
  trend: trendSchema.optional(),
});

const kpiSummaryOutputSchema = z.object({
  totalSales: kpiMetricSchema,
  totalTransactions: kpiMetricSchema,
  itemsSold: kpiMetricSchema,
  profit: kpiMetricSchema,
  averageTransactionValue: kpiMetricSchema,
  topSellingCategory: z.string().optional(),
});

// Sales Trend Schemas
const salesTrendInputSchema = outletFilterSchema.extend({
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
});

const salesTrendOutputSchema = z.array(
  z.object({
    timestamp: z.string(),
    sales: z.number(),
    transactions: z.number(),
    items: z.number(),
  }),
);

// Category Breakdown Schemas
const categoryBreakdownInputSchema = outletFilterSchema;

const categoryBreakdownOutputSchema = z.array(
  z.object({
    category: z.string(),
    sales: z.number(),
    transactions: z.number(),
    items: z.number(),
    percentage: z.number(),
  }),
);

// Outlet Performance Schemas
const outletPerformanceInputSchema = z.object({
  dateRange: dateRangeSchema,
});

const outletPerformanceOutputSchema = z.array(
  z.object({
    outletId: z.string(),
    outletName: z.string(),
    sales: z.number(),
    transactions: z.number(),
    items: z.number(),
    profit: z.number(),
    averageTransactionValue: z.number(),
    trend: trendSchema.optional(),
  }),
);

// Low Stock Alerts Schemas
const lowStockAlertsInputSchema = z.object({
  outletId: z.string().optional(),
  threshold: z.number().default(10),
  limit: z.number().default(10),
});

const lowStockAlertsOutputSchema = z.array(
  z.object({
    productId: z.string(),
    productName: z.string(),
    sku: z.string(),
    category: z.string().optional(),
    outletId: z.string(),
    outletName: z.string(),
    currentStock: z.number(),
    reorderPoint: z.number().optional(),
    daysUntilStockout: z.number().optional(),
    status: z.enum(["critical", "low", "warning"]),
  }),
);

// Shift Activity Schemas
const shiftActivityInputSchema = z.object({
  outletId: z.string().optional(),
  date: z.coerce.date().default(() => new Date()),
});

const shiftActivityOutputSchema = z.array(
  z.object({
    sessionId: z.string(),
    outletId: z.string(),
    outletName: z.string(),
    cashierName: z.string(),
    openTime: z.string(),
    closeTime: z.string().optional(),
    openingCash: z.number(),
    closingCash: z.number().optional(),
    expectedCash: z.number().optional(),
    difference: z.number().optional(),
    totalSales: z.number(),
    totalTransactions: z.number(),
    status: z.enum(["active", "closed"]),
  }),
);

// Activity Log Schemas
const activityLogInputSchema = z.object({
  outletId: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  limit: z.number().default(20),
  offset: z.number().default(0),
});

const activityLogOutputSchema = z.object({
  activities: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      type: z.string(),
      user: z.string(),
      outlet: z.string(),
      description: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  total: z.number(),
  hasMore: z.boolean(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTrend(
  current: number,
  previous: number,
): z.infer<typeof trendSchema> {
  if (previous === 0) {
    return { value: 0, direction: "neutral" };
  }

  const percentageChange = ((current - previous) / previous) * 100;

  return {
    value: Math.abs(Math.round(percentageChange * 10) / 10),
    direction:
      percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral",
  };
}

function getPreviousPeriod(dateRange: { from: Date; to: Date }) {
  const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
  return {
    from: new Date(dateRange.from.getTime() - periodLength),
    to: new Date(dateRange.to.getTime() - periodLength),
  };
}

function formatCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// ============================================================================
// Analytics Router
// ============================================================================

export const analyticsRouter = router({
  /**
   * Get KPI Summary
   * Returns key performance indicators with trend comparison
   */
  getKpiSummary: protectedProcedure
    .input(kpiSummaryInputSchema)
    .output(kpiSummaryOutputSchema)
    .query(async ({ input }) => {
      const { outletId, dateRange, compareWithPrevious } = input;

      // Build base where clause
      const baseWhere = {
        ...(outletId && { outletId }),
        status: SaleStatus.COMPLETED,
      };

      // Query current period
      const currentPeriodWhere = {
        ...baseWhere,
        soldAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      };

      const [currentSales, currentItems] = await Promise.all([
        db.sale.aggregate({
          where: currentPeriodWhere,
          _sum: {
            totalNet: true,
            totalGross: true,
            discountTotal: true,
          },
          _count: {
            id: true,
          },
        }),
        db.saleItem.aggregate({
          where: {
            sale: currentPeriodWhere,
          },
          _sum: {
            quantity: true,
          },
        }),
      ]);

      const currentTotalSales = Number(currentSales._sum.totalNet || 0);
      const currentTransactions = currentSales._count.id;
      const currentItemsSold = currentItems._sum.quantity || 0;
      const currentProfit =
        Number(currentSales._sum.totalNet || 0) -
        Number(currentSales._sum.totalGross || 0) +
        Number(currentSales._sum.discountTotal || 0);
      const currentAvgTransaction =
        currentTransactions > 0 ? currentTotalSales / currentTransactions : 0;

      // Get top selling category
      const topCategory = await db.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: currentPeriodWhere,
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 1,
      });

      let topSellingCategory: string | undefined;
      if (topCategory.length > 0 && topCategory[0]) {
        const product = await db.product.findUnique({
          where: { id: topCategory[0].productId },
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        });
        topSellingCategory = product?.category?.name || undefined;
      }

      // Calculate previous period if needed
      let previousData:
        | {
            sales: number;
            transactions: number;
            items: number;
            profit: number;
            avgTransaction: number;
          }
        | undefined;

      if (compareWithPrevious) {
        const previousPeriod = getPreviousPeriod(dateRange);
        const previousPeriodWhere = {
          ...baseWhere,
          soldAt: {
            gte: previousPeriod.from,
            lte: previousPeriod.to,
          },
        };

        const [previousSales, previousItems] = await Promise.all([
          db.sale.aggregate({
            where: previousPeriodWhere,
            _sum: {
              totalNet: true,
              totalGross: true,
              discountTotal: true,
            },
            _count: {
              id: true,
            },
          }),
          db.saleItem.aggregate({
            where: {
              sale: previousPeriodWhere,
            },
            _sum: {
              quantity: true,
            },
          }),
        ]);

        const prevTotalSales = Number(previousSales._sum.totalNet || 0);
        const prevTransactions = previousSales._count.id;
        const prevItemsSold = previousItems._sum.quantity || 0;
        const prevProfit =
          Number(previousSales._sum.totalNet || 0) -
          Number(previousSales._sum.totalGross || 0) +
          Number(previousSales._sum.discountTotal || 0);
        const prevAvgTransaction =
          prevTransactions > 0 ? prevTotalSales / prevTransactions : 0;

        previousData = {
          sales: prevTotalSales,
          transactions: prevTransactions,
          items: prevItemsSold,
          profit: prevProfit,
          avgTransaction: prevAvgTransaction,
        };
      }

      // Build response with trends
      return {
        totalSales: {
          current: formatCurrency(currentTotalSales),
          previous: previousData
            ? formatCurrency(previousData.sales)
            : undefined,
          trend: previousData
            ? calculateTrend(currentTotalSales, previousData.sales)
            : undefined,
        },
        totalTransactions: {
          current: currentTransactions,
          previous: previousData?.transactions,
          trend: previousData
            ? calculateTrend(currentTransactions, previousData.transactions)
            : undefined,
        },
        itemsSold: {
          current: currentItemsSold,
          previous: previousData?.items,
          trend: previousData
            ? calculateTrend(currentItemsSold, previousData.items)
            : undefined,
        },
        profit: {
          current: formatCurrency(currentProfit),
          previous: previousData
            ? formatCurrency(previousData.profit)
            : undefined,
          trend: previousData
            ? calculateTrend(currentProfit, previousData.profit)
            : undefined,
        },
        averageTransactionValue: {
          current: formatCurrency(currentAvgTransaction),
          previous: previousData
            ? formatCurrency(previousData.avgTransaction)
            : undefined,
          trend: previousData
            ? calculateTrend(currentAvgTransaction, previousData.avgTransaction)
            : undefined,
        },
        topSellingCategory,
      };
    }),

  /**
   * Get Sales Trend
   * Returns time-series sales data for charting
   */
  getSalesTrend: protectedProcedure
    .input(salesTrendInputSchema)
    .output(salesTrendOutputSchema)
    .query(async ({ input }) => {
      const { outletId, dateRange, granularity } = input;

      const sales = await db.sale.findMany({
        where: {
          ...(outletId && { outletId }),
          status: SaleStatus.COMPLETED,
          soldAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        include: {
          items: {
            select: {
              quantity: true,
            },
          },
        },
        orderBy: {
          soldAt: "asc",
        },
      });

      // Group by granularity
      const grouped = new Map<
        string,
        { sales: number; transactions: number; items: number }
      >();

      sales.forEach((sale) => {
        let key: string;
        const date = sale.soldAt;

        switch (granularity) {
          case "hour":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
            break;
          case "day":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            break;
          case "week":
            const weekStart = startOfWeek(date);
            key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, "0")}`;
            break;
          case "month":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
          default:
            key = date.toISOString().split("T")[0];
        }

        const existing = grouped.get(key) || {
          sales: 0,
          transactions: 0,
          items: 0,
        };
        existing.sales += Number(sale.totalNet);
        existing.transactions += 1;
        existing.items += sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        grouped.set(key, existing);
      });

      // Convert to array and sort
      return Array.from(grouped.entries())
        .map(([timestamp, data]) => ({
          timestamp,
          sales: formatCurrency(data.sales),
          transactions: data.transactions,
          items: data.items,
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }),

  /**
   * Get Category Breakdown
   * Returns sales by product category
   */
  getCategoryBreakdown: protectedProcedure
    .input(categoryBreakdownInputSchema)
    .output(categoryBreakdownOutputSchema)
    .query(async ({ input }) => {
      const { outletId, dateRange } = input;

      const saleItems = await db.saleItem.findMany({
        where: {
          sale: {
            ...(outletId && { outletId }),
            status: SaleStatus.COMPLETED,
            soldAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        },
        include: {
          product: {
            select: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          sale: {
            select: {
              id: true,
            },
          },
        },
      });

      // Group by category
      const categoryMap = new Map<
        string,
        { sales: number; transactions: Set<string>; items: number }
      >();

      saleItems.forEach((item) => {
        const category = item.product.category?.name || "Uncategorized";
        const existing = categoryMap.get(category) || {
          sales: 0,
          transactions: new Set<string>(),
          items: 0,
        };

        existing.sales += Number(item.total);
        existing.transactions.add(item.sale.id);
        existing.items += item.quantity;
        categoryMap.set(category, existing);
      });

      // Calculate total for percentages
      const totalSales = Array.from(categoryMap.values()).reduce(
        (sum, cat) => sum + cat.sales,
        0,
      );

      // Convert to array and calculate percentages
      return Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          sales: formatCurrency(data.sales),
          transactions: data.transactions.size,
          items: data.items,
          percentage:
            totalSales > 0
              ? Math.round((data.sales / totalSales) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
    }),

  /**
   * Get Outlet Performance
   * Returns performance metrics for all outlets
   */
  getOutletPerformance: protectedProcedure
    .input(outletPerformanceInputSchema)
    .output(outletPerformanceOutputSchema)
    .query(async ({ input }) => {
      const { dateRange } = input;

      // Get all outlets
      const outlets = await db.outlet.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      // Get current period data for all outlets
      const currentPeriodWhere = {
        status: SaleStatus.COMPLETED,
        soldAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      };

      const outletPerformance = await Promise.all(
        outlets.map(async (outlet) => {
          const [currentSales, currentItems] = await Promise.all([
            db.sale.aggregate({
              where: {
                ...currentPeriodWhere,
                outletId: outlet.id,
              },
              _sum: {
                totalNet: true,
                totalGross: true,
                discountTotal: true,
              },
              _count: {
                id: true,
              },
            }),
            db.saleItem.aggregate({
              where: {
                sale: {
                  ...currentPeriodWhere,
                  outletId: outlet.id,
                },
              },
              _sum: {
                quantity: true,
              },
            }),
          ]);

          const sales = Number(currentSales._sum.totalNet || 0);
          const transactions = currentSales._count.id;
          const items = currentItems._sum.quantity || 0;
          const profit =
            Number(currentSales._sum.totalNet || 0) -
            Number(currentSales._sum.totalGross || 0) +
            Number(currentSales._sum.discountTotal || 0);
          const avgTransaction = transactions > 0 ? sales / transactions : 0;

          // Get previous period for trend
          const previousPeriod = getPreviousPeriod(dateRange);
          const previousSales = await db.sale.aggregate({
            where: {
              outletId: outlet.id,
              status: SaleStatus.COMPLETED,
              soldAt: {
                gte: previousPeriod.from,
                lte: previousPeriod.to,
              },
            },
            _sum: {
              totalNet: true,
            },
          });

          const previousTotal = Number(previousSales._sum.totalNet || 0);
          const trend = calculateTrend(sales, previousTotal);

          return {
            outletId: outlet.id,
            outletName: outlet.name,
            sales: formatCurrency(sales),
            transactions,
            items,
            profit: formatCurrency(profit),
            averageTransactionValue: formatCurrency(avgTransaction),
            trend,
          };
        }),
      );

      return outletPerformance.sort((a, b) => b.sales - a.sales);
    }),

  /**
   * Get Low Stock Alerts
   * Returns products with low stock levels
   */
  getLowStockAlerts: protectedProcedure
    .input(lowStockAlertsInputSchema)
    .output(lowStockAlertsOutputSchema)
    .query(async ({ input }) => {
      const { outletId, threshold, limit } = input;

      const inventoryItems = await db.inventory.findMany({
        where: {
          ...(outletId && { outletId }),
          quantity: {
            lte: threshold,
          },
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              minStock: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          outlet: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          quantity: "asc",
        },
        take: limit,
      });

      return inventoryItems.map((item) => {
        const currentStock = item.quantity;
        const reorderPoint = item.product.minStock || threshold;

        let status: "critical" | "low" | "warning";
        if (currentStock === 0) {
          status = "critical";
        } else if (currentStock <= reorderPoint / 2) {
          status = "critical";
        } else if (currentStock <= reorderPoint) {
          status = "low";
        } else {
          status = "warning";
        }

        // Calculate days until stockout based on average daily sales
        const daysUntilStockout = undefined; // TODO: Calculate based on sales velocity

        return {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          category: item.product.category?.name || undefined,
          outletId: item.outletId,
          outletName: item.outlet.name,
          currentStock,
          reorderPoint: item.product.minStock || undefined,
          daysUntilStockout,
          status,
        };
      });
    }),

  /**
   * Get Shift Activity
   * Returns active and recent cash sessions
   */
  getShiftActivity: protectedProcedure
    .input(shiftActivityInputSchema)
    .output(shiftActivityOutputSchema)
    .query(async ({ input }) => {
      const { outletId, date } = input;

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const sessions = await db.cashSession.findMany({
        where: {
          ...(outletId && { outletId }),
          openTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          outlet: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
          sales: {
            where: {
              status: SaleStatus.COMPLETED,
            },
            select: {
              totalNet: true,
            },
          },
        },
        orderBy: {
          openTime: "desc",
        },
      });

      return sessions.map((session) => {
        const totalSales = session.sales.reduce(
          (sum, sale) => sum + Number(sale.totalNet),
          0,
        );
        const isActive = !session.closeTime;

        return {
          sessionId: session.id,
          outletId: session.outletId,
          outletName: session.outlet.name,
          cashierName: session.user.name || "Unknown",
          openTime: session.openTime.toISOString(),
          closeTime: session.closeTime?.toISOString(),
          openingCash: Number(session.openingCash),
          closingCash: session.closingCash
            ? Number(session.closingCash)
            : undefined,
          expectedCash: session.expectedCash
            ? Number(session.expectedCash)
            : undefined,
          difference: session.difference
            ? Number(session.difference)
            : undefined,
          totalSales: formatCurrency(totalSales),
          totalTransactions: session.sales.length,
          status: isActive ? ("active" as const) : ("closed" as const),
        };
      });
    }),

  /**
   * Get Activity Log
   * Returns recent system activities
   */
  getActivityLog: protectedProcedure
    .input(activityLogInputSchema)
    .output(activityLogOutputSchema)
    .query(async ({ input }) => {
      const { outletId, dateRange, limit, offset } = input;

      const where = {
        ...(outletId && { outletId }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        }),
      };

      const [activities, total] = await Promise.all([
        db.activityLog.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
              },
            },
            outlet: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          skip: offset,
        }),
        db.activityLog.count({ where }),
      ]);

      return {
        activities: activities.map((activity) => ({
          id: activity.id,
          timestamp: activity.createdAt.toISOString(),
          type: activity.action,
          user: activity.user?.name || "Unknown",
          outlet: activity.outlet?.name || "System",
          description: `${activity.action} ${activity.entity || ""}`.trim(),
          metadata: activity.details as Record<string, unknown> | undefined,
        })),
        total,
        hasMore: offset + limit < total,
      };
    }),
});
