# 🔌 Owner Dashboard API Integration Guide

## Overview

This document provides step-by-step instructions for integrating the Owner Dashboard with production APIs, replacing the current mock data implementation with real-time data from your backend.

---

## 📋 Prerequisites

Before starting integration:

- [ ] Backend APIs are deployed and accessible
- [ ] TRPC routers are configured
- [ ] Database schema supports analytics queries
- [ ] Authentication/authorization is working
- [ ] You have access to API documentation

---

## 🗺️ Integration Roadmap

### Phase 1: Basic Data (Week 1)
1. KPI metrics
2. Sales chart data
3. Outlet performance

### Phase 2: Operational Data (Week 2)
4. Low stock alerts
5. Shift monitoring
6. Activity log

### Phase 3: Advanced Features (Week 3)
7. Real-time updates
8. Export functionality
9. Performance optimization

---

## 🔧 Step-by-Step Integration

## 1. KPI Metrics Integration

### Current Implementation (Mock)

```typescript
// src/app/dashboard/owner/page.tsx (lines ~35-62)
const kpiData = {
  totalSales: {
    value: "28.5M",
    trend: { value: 12, direction: "up" as const },
  },
  // ...
};
```

### Backend Requirements

Create TRPC route: `api.analytics.getKpiSummary`

**Input Schema**:
```typescript
// src/server/api/routers/analytics.ts
const kpiSummaryInput = z.object({
  outletId: z.string().optional(), // undefined = all outlets
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  compareWithPrevious: z.boolean().default(true),
});
```

**Output Schema**:
```typescript
const kpiSummaryOutput = z.object({
  totalSales: z.object({
    current: z.number(),
    previous: z.number().optional(),
    trend: z.object({
      value: z.number(), // percentage
      direction: z.enum(["up", "down", "neutral"]),
    }).optional(),
  }),
  totalTransactions: z.object({
    current: z.number(),
    previous: z.number().optional(),
    trend: z.object({
      value: z.number(),
      direction: z.enum(["up", "down", "neutral"]),
    }).optional(),
  }),
  itemsSold: z.object({
    current: z.number(),
    previous: z.number().optional(),
    trend: z.object({
      value: z.number(),
      direction: z.enum(["up", "down", "neutral"]),
    }).optional(),
  }),
  profit: z.object({
    current: z.number(),
    previous: z.number().optional(),
    trend: z.object({
      value: z.number(),
      direction: z.enum(["up", "down", "neutral"]),
    }).optional(),
  }),
});
```

**Example Query**:
```typescript
export const analyticsRouter = createTRPCRouter({
  getKpiSummary: protectedProcedure
    .input(kpiSummaryInput)
    .output(kpiSummaryOutput)
    .query(async ({ input, ctx }) => {
      const { outletId, dateRange, compareWithPrevious } = input;
      
      // Query current period sales
      const currentSales = await ctx.db.sale.aggregate({
        where: {
          ...(outletId && { outletId }),
          soldAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
          status: "COMPLETED",
        },
        _sum: {
          totalNet: true,
        },
        _count: {
          id: true,
        },
      });

      // Calculate previous period if needed
      let previousSales;
      if (compareWithPrevious) {
        const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
        const previousFrom = new Date(dateRange.from.getTime() - periodLength);
        const previousTo = new Date(dateRange.to.getTime() - periodLength);
        
        previousSales = await ctx.db.sale.aggregate({
          where: {
            ...(outletId && { outletId }),
            soldAt: {
              gte: previousFrom,
              lte: previousTo,
            },
            status: "COMPLETED",
          },
          _sum: {
            totalNet: true,
          },
          _count: {
            id: true,
          },
        });
      }

      // Calculate items sold
      const itemsSold = await ctx.db.saleItem.aggregate({
        where: {
          sale: {
            ...(outletId && { outletId }),
            soldAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
            status: "COMPLETED",
          },
        },
        _sum: {
          quantity: true,
        },
      });

      // Helper to calculate trend
      const calculateTrend = (current: number, previous?: number) => {
        if (!previous || previous === 0) return undefined;
        const change = ((current - previous) / previous) * 100;
        return {
          value: Math.abs(change),
          direction: change >= 0 ? "up" as const : "down" as const,
        };
      };

      // Calculate profit (requires cost data)
      const profit = await ctx.db.saleItem.aggregate({
        where: {
          sale: {
            ...(outletId && { outletId }),
            soldAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
            status: "COMPLETED",
          },
        },
        _sum: {
          subtotal: true,
          // Subtract cost if available in schema
        },
      });

      return {
        totalSales: {
          current: currentSales._sum.totalNet ?? 0,
          previous: previousSales?._sum.totalNet,
          trend: calculateTrend(
            currentSales._sum.totalNet ?? 0,
            previousSales?._sum.totalNet
          ),
        },
        totalTransactions: {
          current: currentSales._count.id,
          previous: previousSales?._count.id,
          trend: calculateTrend(
            currentSales._count.id,
            previousSales?._count.id
          ),
        },
        itemsSold: {
          current: itemsSold._sum.quantity ?? 0,
          previous: undefined, // Calculate if needed
          trend: undefined,
        },
        profit: {
          current: profit._sum.subtotal ?? 0,
          previous: undefined,
          trend: undefined,
        },
      };
    }),
});
```

### Frontend Integration

Replace mock data with TRPC query:

```typescript
// src/app/dashboard/owner/page.tsx
"use client";

import { api } from "@/trpc/client";

export default function OwnerDashboardPage() {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  // Replace mock data with real query
  const { data: kpiData, isLoading: isKpiLoading } = api.analytics.getKpiSummary.useQuery(
    {
      outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
      dateRange,
      compareWithPrevious: true,
    },
    {
      refetchInterval: 30_000, // Refresh every 30 seconds
      staleTime: 20_000, // Consider data stale after 20 seconds
    }
  );

  // Format for KpiCard components
  const formattedKpiData = useMemo(() => {
    if (!kpiData) return null;

    return {
      totalSales: {
        value: `${(kpiData.totalSales.current / 1_000_000).toFixed(1)}M`,
        trend: kpiData.totalSales.trend,
      },
      totalTransactions: {
        value: kpiData.totalTransactions.current.toString(),
        trend: kpiData.totalTransactions.trend,
      },
      itemsSold: {
        value: new Intl.NumberFormat("id-ID").format(kpiData.itemsSold.current),
        trend: kpiData.itemsSold.trend,
      },
      profit: {
        value: `${(kpiData.profit.current / 1_000_000).toFixed(1)}M`,
        trend: kpiData.profit.trend,
      },
    };
  }, [kpiData]);

  // Render with loading state
  return (
    <div>
      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {isKpiLoading ? (
          // Loading skeleton
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-card p-6">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="mt-2 h-8 w-32 bg-muted rounded" />
              </div>
            ))}
          </>
        ) : formattedKpiData ? (
          <>
            <KpiCard
              title="Total Penjualan"
              value={`Rp ${formattedKpiData.totalSales.value}`}
              trend={formattedKpiData.totalSales.trend}
              delay={0}
            />
            {/* ... other cards */}
          </>
        ) : null}
      </section>
    </div>
  );
}
```

---

## 2. Sales Chart Integration

### Backend Requirements

Create TRPC route: `api.analytics.getSalesTrend`

**Input Schema**:
```typescript
const salesTrendInput = z.object({
  outletId: z.string().optional(),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  granularity: z.enum(["hourly", "daily", "weekly", "monthly"]).default("daily"),
});
```

**Output Schema**:
```typescript
const salesTrendOutput = z.array(z.object({
  label: z.string(), // "Mon", "Tue" or "00:00", "01:00"
  value: z.number(),
  date: z.date(),
}));
```

**Example Query**:
```typescript
getSalesTrend: protectedProcedure
  .input(salesTrendInput)
  .output(salesTrendOutput)
  .query(async ({ input, ctx }) => {
    const { outletId, dateRange, granularity } = input;

    // Get all sales in range
    const sales = await ctx.db.sale.findMany({
      where: {
        ...(outletId && { outletId }),
        soldAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
        status: "COMPLETED",
      },
      select: {
        soldAt: true,
        totalNet: true,
      },
      orderBy: {
        soldAt: "asc",
      },
    });

    // Aggregate by granularity
    const aggregated = new Map<string, { value: number; date: Date }>();

    sales.forEach((sale) => {
      let key: string;
      let date: Date;

      switch (granularity) {
        case "hourly":
          key = format(sale.soldAt, "HH:00");
          date = startOfHour(sale.soldAt);
          break;
        case "daily":
          key = format(sale.soldAt, "EEE", { locale: idLocale });
          date = startOfDay(sale.soldAt);
          break;
        case "weekly":
          key = `Week ${format(sale.soldAt, "w")}`;
          date = startOfWeek(sale.soldAt);
          break;
        case "monthly":
          key = format(sale.soldAt, "MMM", { locale: idLocale });
          date = startOfMonth(sale.soldAt);
          break;
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.value += sale.totalNet;
      } else {
        aggregated.set(key, { value: sale.totalNet, date });
      }
    });

    return Array.from(aggregated.entries()).map(([label, data]) => ({
      label,
      value: data.value,
      date: data.date,
    }));
  }),
```

### Frontend Integration

```typescript
// src/app/dashboard/owner/page.tsx

const { data: salesData, isLoading: isSalesLoading } = api.analytics.getSalesTrend.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  dateRange,
  granularity: "daily",
});

// Use in component
<SalesChart
  data={salesData ?? []}
  type="bar"
  title="Penjualan Harian"
  height={300}
/>
```

---

## 3. Category Breakdown Integration

### Backend Requirements

Create TRPC route: `api.analytics.getCategoryBreakdown`

```typescript
getCategoryBreakdown: protectedProcedure
  .input(z.object({
    outletId: z.string().optional(),
    dateRange: z.object({
      from: z.date(),
      to: z.date(),
    }),
  }))
  .output(z.array(z.object({
    name: z.string(),
    value: z.number(),
  })))
  .query(async ({ input, ctx }) => {
    const categories = await ctx.db.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          ...(input.outletId && { outletId: input.outletId }),
          soldAt: {
            gte: input.dateRange.from,
            lte: input.dateRange.to,
          },
          status: "COMPLETED",
        },
      },
      _sum: {
        subtotal: true,
      },
    });

    // Get product details with categories
    const productsWithCategories = await ctx.db.product.findMany({
      where: {
        id: {
          in: categories.map((c) => c.productId),
        },
      },
      include: {
        category: true,
      },
    });

    // Group by category
    const categoryMap = new Map<string, number>();
    categories.forEach((item) => {
      const product = productsWithCategories.find((p) => p.id === item.productId);
      const categoryName = product?.category?.name ?? "Lainnya";
      const existing = categoryMap.get(categoryName) ?? 0;
      categoryMap.set(categoryName, existing + (item._sum.subtotal ?? 0));
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }),
```

---

## 4. Outlet Performance Integration

### Backend Requirements

```typescript
getOutletComparison: protectedProcedure
  .input(z.object({
    dateRange: z.object({
      from: z.date(),
      to: z.date(),
    }),
    includeInactive: z.boolean().default(false),
  }))
  .output(z.array(z.object({
    id: z.string(),
    name: z.string(),
    sales: z.number(),
    transactions: z.number(),
    avgTicket: z.number(),
    trend: z.object({
      value: z.number(),
      direction: z.enum(["up", "down"]),
    }),
  })))
  .query(async ({ input, ctx }) => {
    const outlets = await ctx.db.outlet.findMany({
      where: {
        ...(input.includeInactive ? {} : { isActive: true }),
      },
    });

    const outletPerformance = await Promise.all(
      outlets.map(async (outlet) => {
        const sales = await ctx.db.sale.aggregate({
          where: {
            outletId: outlet.id,
            soldAt: {
              gte: input.dateRange.from,
              lte: input.dateRange.to,
            },
            status: "COMPLETED",
          },
          _sum: {
            totalNet: true,
          },
          _count: {
            id: true,
          },
        });

        // Calculate trend (compare to previous period)
        const periodLength = input.dateRange.to.getTime() - input.dateRange.from.getTime();
        const previousSales = await ctx.db.sale.aggregate({
          where: {
            outletId: outlet.id,
            soldAt: {
              gte: new Date(input.dateRange.from.getTime() - periodLength),
              lt: input.dateRange.from,
            },
            status: "COMPLETED",
          },
          _sum: {
            totalNet: true,
          },
        });

        const currentTotal = sales._sum.totalNet ?? 0;
        const previousTotal = previousSales._sum.totalNet ?? 0;
        const change = previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : 0;

        return {
          id: outlet.id,
          name: outlet.name,
          sales: currentTotal,
          transactions: sales._count.id,
          avgTicket: sales._count.id > 0 ? currentTotal / sales._count.id : 0,
          trend: {
            value: Math.abs(change),
            direction: change >= 0 ? "up" as const : "down" as const,
          },
        };
      })
    );

    return outletPerformance.sort((a, b) => b.sales - a.sales);
  }),
```

---

## 5. Low Stock Integration

### Backend Requirements

Already exists! Use: `api.inventory.listLowStock`

Just ensure it has the correct output format:

```typescript
listLowStock: protectedProcedure
  .input(z.object({
    outletId: z.string().optional(),
    limit: z.number().default(10),
  }))
  .query(async ({ input, ctx }) => {
    const inventory = await ctx.db.inventory.findMany({
      where: {
        ...(input.outletId && { outletId: input.outletId }),
        OR: [
          { stock: { lte: 0 } },
          {
            AND: [
              { stock: { gt: 0 } },
              { stock: { lte: ctx.db.$queryRaw`product.minStock * 0.5` } },
            ],
          },
        ],
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      take: input.limit,
      orderBy: {
        stock: "asc",
      },
    });

    return inventory.map((item) => ({
      id: item.id,
      name: item.product.name,
      currentStock: item.stock,
      minStock: item.product.minStock ?? 0,
      unit: item.product.unit ?? "pcs",
      severity: item.stock === 0 ? "critical" as const
        : item.stock <= (item.product.minStock ?? 0) * 0.25 ? "critical" as const
        : item.stock <= (item.product.minStock ?? 0) * 0.5 ? "low" as const
        : "warning" as const,
    }));
  }),
```

---

## 6. Shift Monitoring Integration

### Backend Requirements

```typescript
listActiveShifts: protectedProcedure
  .input(z.object({
    outletId: z.string().optional(),
    date: z.string(), // ISO date
  }))
  .output(z.array(z.object({
    id: z.string(),
    cashierName: z.string(),
    startTime: z.date(),
    endTime: z.date().optional(),
    sales: z.number(),
    transactions: z.number(),
    isActive: z.boolean(),
  })))
  .query(async ({ input, ctx }) => {
    const targetDate = new Date(input.date);
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    const shifts = await ctx.db.shift.findMany({
      where: {
        ...(input.outletId && { outletId: input.outletId }),
        openTime: {
          gte: startOfTargetDay,
          lte: endOfTargetDay,
        },
      },
      include: {
        user: true,
        sales: {
          where: {
            status: "COMPLETED",
          },
        },
      },
      orderBy: {
        openTime: "asc",
      },
    });

    return shifts.map((shift) => {
      const totalSales = shift.sales.reduce((sum, sale) => sum + sale.totalNet, 0);
      
      return {
        id: shift.id,
        cashierName: shift.user.name ?? shift.user.email ?? "Unknown",
        startTime: shift.openTime,
        endTime: shift.closeTime ?? undefined,
        sales: totalSales,
        transactions: shift.sales.length,
        isActive: !shift.closeTime,
      };
    });
  }),
```

---

## 7. Activity Log Integration

### Backend Requirements

```typescript
getRecentActivities: protectedProcedure
  .input(z.object({
    outletId: z.string().optional(),
    limit: z.number().default(10),
  }))
  .output(z.array(z.object({
    id: z.string(),
    type: z.enum(["stock_in", "stock_out", "transfer", "refund", "product_edit", "user_action", "other"]),
    title: z.string(),
    description: z.string().optional(),
    user: z.string(),
    timestamp: z.date(),
    metadata: z.object({
      amount: z.number().optional(),
      quantity: z.number().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
  })))
  .query(async ({ input, ctx }) => {
    // Query audit log or activity table
    const activities = await ctx.db.auditLog.findMany({
      where: {
        ...(input.outletId && { outletId: input.outletId }),
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: input.limit,
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: mapActivityType(activity.action),
      title: activity.description,
      description: activity.metadata?.description,
      user: activity.user.name ?? activity.user.email ?? "System",
      timestamp: activity.createdAt,
      metadata: activity.metadata,
    }));
  }),
```

---

## 8. Real-Time Updates

### WebSocket Integration (Optional)

For live updates without polling:

```typescript
// src/lib/pusher.ts or websocket setup
import Pusher from "pusher-js";

export const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

// In component
useEffect(() => {
  const channel = pusher.subscribe(`outlet-${selectedOutlet}`);
  
  channel.bind("new-sale", (data: any) => {
    // Refresh KPI data
    utils.analytics.getKpiSummary.invalidate();
  });

  return () => {
    channel.unbind_all();
    channel.unsubscribe();
  };
}, [selectedOutlet]);
```

---

## 9. Export Functionality

### Backend Requirements

```typescript
exportDashboardData: protectedProcedure
  .input(z.object({
    outletId: z.string().optional(),
    dateRange: z.object({
      from: z.date(),
      to: z.date(),
    }),
    format: z.enum(["csv", "xlsx", "json"]).default("csv"),
  }))
  .mutation(async ({ input, ctx }) => {
    // Gather all data
    const data = await gatherAllDashboardData(input, ctx);
    
    // Generate file
    const fileBuffer = await generateExportFile(data, input.format);
    
    // Return download URL or buffer
    return {
      url: await uploadToStorage(fileBuffer, input.format),
      filename: `dashboard-${format(new Date(), "yyyy-MM-dd")}.${input.format}`,
    };
  }),
```

### Frontend Integration

```typescript
const exportMutation = api.analytics.exportDashboardData.useMutation();

const handleExport = async () => {
  const result = await exportMutation.mutateAsync({
    outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
    dateRange,
    format: "csv",
  });
  
  // Trigger download
  window.open(result.url, "_blank");
};
```

---

## 🧪 Testing Integration

### Test Each Endpoint

```typescript
// test/api/analytics.test.ts
import { describe, it, expect } from "vitest";
import { createCaller } from "@/server/api/root";

describe("Analytics API", () => {
  it("should return KPI summary", async () => {
    const caller = createCaller({ /* mock context */ });
    
    const result = await caller.analytics.getKpiSummary({
      dateRange: {
        from: new Date("2024-01-01"),
        to: new Date("2024-01-07"),
      },
    });
    
    expect(result.totalSales.current).toBeGreaterThan(0);
    expect(result.totalSales.trend).toBeDefined();
  });
});
```

---

## 📊 Performance Optimization

### Database Indexing

Ensure these indexes exist:

```sql
-- Sales queries
CREATE INDEX idx_sale_outlet_date ON sale(outlet_id, sold_at);
CREATE INDEX idx_sale_status_date ON sale(status, sold_at);

-- Inventory queries
CREATE INDEX idx_inventory_outlet_stock ON inventory(outlet_id, stock);

-- Shift queries
CREATE INDEX idx_shift_outlet_open ON shift(outlet_id, open_time);

-- Audit log queries
CREATE INDEX idx_audit_outlet_created ON audit_log(outlet_id, created_at);
```

### Caching Strategy

```typescript
// Use React Query caching
{
  refetchInterval: 30_000, // 30s for KPIs
  staleTime: 20_000,       // Consider stale after 20s
  cacheTime: 300_000,      // Keep in cache for 5 minutes
}

// Or implement Redis caching on backend
const cachedData = await redis.get(`kpi:${outletId}:${dateKey}`);
if (cachedData) return JSON.parse(cachedData);
```

---

## 🚨 Error Handling

### Frontend Error Boundaries

```typescript
// src/components/dashboard/owner/error-boundary.tsx
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-900">
            Failed to load dashboard
          </h3>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Query Error Handling

```typescript
const { data, isLoading, error } = api.analytics.getKpiSummary.useQuery(
  { /* params */ },
  {
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      toast.error("Failed to load KPI data", {
        description: error.message,
      });
    },
  }
);
```

---

## ✅ Integration Checklist

### Backend
- [ ] All TRPC routes created
- [ ] Input/output schemas defined
- [ ] Database queries optimized
- [ ] Indexes created
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Caching strategy implemented
- [ ] Unit tests written

### Frontend
- [ ] Mock data removed
- [ ] TRPC queries integrated
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Empty states designed
- [ ] Refetch intervals configured
- [ ] Real-time updates (if applicable)
- [ ] Export functionality working

### Testing
- [ ] All endpoints tested
- [ ] Frontend integration tested
- [ ] E2E tests passing
- [ ] Performance profiled
- [ ] Load tested
- [ ] Error scenarios tested

### Documentation
- [ ] API endpoints documented
- [ ] Integration guide updated
- [ ] Troubleshooting guide written
- [ ] Deployment notes added

---

## 🚀 Deployment

### Environment Variables

```bash
# .env.production
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
PUSHER_KEY="..."
PUSHER_CLUSTER="..."
```

### Build & Deploy

```bash
# Test build
npm run build

# Run migrations
npm run db:migrate

# Deploy
vercel deploy --prod
```

---

## 📞 Support

If you encounter issues during integration:

1. Check the [Troubleshooting Guide](./OWNER_DASHBOARD.md#-troubleshooting)
2. Review API logs for errors
3. Test endpoints with Postman/Thunder Client
4. Contact backend team for API issues
5. File a GitHub issue with details

---

**Integration Status**: 🔄 Ready to Start

**Estimated Time**: 2-3 weeks

**Priority**: High

**Last Updated**: 2024