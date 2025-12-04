"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

import { OperationalOverview } from "@/components/dashboard/operational-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { MiniCharts } from "@/components/dashboard/mini-charts";
import { MobileDock } from "@/components/dashboard/mobile-dock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOutlet } from "@/lib/outlet-context";
import { api } from "@/trpc/client";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { currentOutlet, activeShift } = useOutlet();

  const userName = session?.user?.name ?? session?.user?.email ?? "Pengguna";
  const role = (session?.user?.role ?? "CASHIER") as
    | "OWNER"
    | "ADMIN"
    | "CASHIER";

  // Get today's sales summary
  const {
    data: todaySummary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = api.sales.getDailySummary.useQuery(
    {
      date: new Date().toISOString(),
      outletId: currentOutlet?.id,
    },
    {
      enabled: false, // 🚫 DISABLED - Manual execution only!
      retry: false,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  );

  // Debug logging with useEffect
  useEffect(() => {
    console.log("🔍 Dashboard Query State:", {
      isLoading: isSummaryLoading,
      hasError: !!summaryError,
      hasData: !!todaySummary,
      currentOutlet: currentOutlet?.id,
      timestamp: new Date().toISOString(),
    });

    if (summaryError) {
      console.error("❌ getDailySummary error:", summaryError);
      console.error("Error details:", {
        message: summaryError.message,
        code: summaryError.data?.code,
        httpStatus: summaryError.data?.httpStatus,
      });
    }

    if (todaySummary) {
      console.log("✅ getDailySummary success:", {
        salesCount: todaySummary.sales.length,
        totalNet: todaySummary.totals.totalNet,
        totalItems: todaySummary.totals.totalItems,
        totalGross: todaySummary.totals.totalGross,
        totalDiscount: todaySummary.totals.totalDiscount,
      });
      console.log("📦 Full data:", todaySummary);
    }

    if (!isSummaryLoading && !summaryError && !todaySummary) {
      console.warn("⚠️ Query finished but no data and no error!");
    }
  }, [todaySummary, summaryError, isSummaryLoading, currentOutlet]);

  // Timeout warning
  useEffect(() => {
    if (isSummaryLoading) {
      const timeout = setTimeout(() => {
        console.error("⏰ TIMEOUT: Query still loading after 5 seconds!");
        console.error("This suggests the query is hanging or not completing.");
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isSummaryLoading]);

  // Get low stock alerts
  const { data: lowStockAlerts } = api.inventory.listLowStock.useQuery(
    { outletId: currentOutlet?.id ?? "", limit: 10 },
    { enabled: Boolean(currentOutlet?.id), refetchInterval: 60_000 },
  );

  // Calculate operational metrics
  const operationalData = useMemo(() => {
    console.log("💡 Calculating operational data - START:", {
      hasTodaySummary: !!todaySummary,
      totalsObject: todaySummary?.totals,
      salesArray: todaySummary?.sales,
    });

    const sales = todaySummary?.sales ?? [];
    const revenue = sales.reduce((sum, sale) => sum + sale.totalNet, 0);
    const itemsSold = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    const shiftDuration = activeShift?.openTime
      ? differenceInMinutes(new Date(), new Date(activeShift.openTime))
      : 0;
    const hours = Math.floor(shiftDuration / 60);
    const minutes = shiftDuration % 60;

    const result = {
      revenue,
      transactions: sales.length,
      itemsSold,
      shiftStatus: {
        isActive: Boolean(activeShift),
        startTime: activeShift?.openTime
          ? new Date(activeShift.openTime)
          : undefined,
        duration:
          hours > 0
            ? `${hours}j ${minutes}m`
            : minutes > 0
              ? `${minutes}m`
              : undefined,
      },
    };

    console.log("💡 Operational data - RESULT:", result);

    return result;
  }, [todaySummary, activeShift]);

  // Generate sales chart data (hourly)
  const salesChartData = useMemo(() => {
    const sales = todaySummary?.sales ?? [];
    const hourlyData: Record<string, number> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, "0");
      hourlyData[hour] = 0;
    }

    // Aggregate sales by hour
    sales.forEach((sale) => {
      const hour = format(new Date(sale.soldAt), "HH");
      hourlyData[hour] = (hourlyData[hour] ?? 0) + sale.totalNet;
    });

    // Get current hour and show last 12 hours
    const currentHour = new Date().getHours();
    const startHour = Math.max(0, currentHour - 11);
    const result = [];

    for (let i = startHour; i <= currentHour; i++) {
      const hour = i.toString().padStart(2, "0");
      result.push({
        hour: `${hour}:00`,
        amount: hourlyData[hour] ?? 0,
      });
    }

    return result;
  }, [todaySummary]);

  // Generate top products data
  const topProductsData = useMemo(() => {
    const sales = todaySummary?.sales ?? [];
    const productMap: Record<
      string,
      { id: string; name: string; sold: number; revenue: number }
    > = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.productName;
        if (!productMap[key]) {
          productMap[key] = {
            id: key,
            name: item.productName,
            sold: 0,
            revenue: 0,
          };
        }
        productMap[key].sold += item.quantity;
        // Approximate revenue since we don't have subtotal
        productMap[key].revenue +=
          (sale.totalNet / sale.items.reduce((sum, i) => sum + i.quantity, 0)) *
          item.quantity;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [todaySummary]);

  // Generate alerts
  const alerts = useMemo(() => {
    const result = [];

    if (lowStockAlerts && lowStockAlerts.length > 0) {
      result.push({
        id: "low-stock",
        type: "low-stock" as const,
        title: "Stok Hampir Habis",
        count: lowStockAlerts.length,
        href: "/management/products?filter=low-stock",
        severity: "high" as const,
      });
    }

    // TODO: Add refund pending alert when refund API is available
    // TODO: Add QRIS pending alert when payment API is available

    return result;
  }, [lowStockAlerts]);

  return (
    <>
      <div className="flex flex-col gap-6 pb-20 lg:gap-8 lg:pb-10">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground lg:text-2xl">
                Dashboard
              </h1>
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-wider"
              >
                {role}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentOutlet ? (
                <>
                  Selamat datang,{" "}
                  <span className="font-medium">{userName}</span> •{" "}
                  {currentOutlet.name}
                </>
              ) : (
                "Pilih outlet untuk memulai"
              )}
            </p>
          </div>
          {currentOutlet && (
            <Button
              onClick={() => {
                console.log("🔄 MANUAL REFETCH TRIGGERED");
                void refetchSummary();
              }}
              variant="outline"
              disabled={isSummaryLoading}
            >
              {isSummaryLoading ? "Loading..." : "🔄 Load Data"}
            </Button>
          )}
          {currentOutlet && (
            <Button asChild className="hidden lg:flex">
              <Link href="/cashier" className="gap-2">
                Mulai Transaksi
                <ArrowRight className="h-4 w-4 stroke-[1.5]" />
              </Link>
            </Button>
          )}
        </div>

        {!currentOutlet ? (
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Pilih outlet dari menu di atas untuk melihat dashboard
            </p>
          </div>
        ) : (
          <>
            {/* Operational Overview */}
            <section>
              <OperationalOverview data={operationalData} />
            </section>

            {/* Quick Actions */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Aksi Cepat
              </h2>
              <QuickActions userRole={role} />
            </section>

            {/* Alerts */}
            {alerts.length > 0 && (
              <section>
                <AlertsSection alerts={alerts} />
              </section>
            )}

            {/* Mini Charts */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Analitik Hari Ini
              </h2>
              <MiniCharts
                salesData={salesChartData}
                topProducts={topProductsData}
                isLoading={isSummaryLoading}
              />
            </section>

            {/* Mobile CTA */}
            <section className="lg:hidden">
              <Button asChild className="w-full" size="lg">
                <Link href="/cashier" className="gap-2">
                  Mulai Transaksi
                  <ArrowRight className="h-4 w-4 stroke-[1.5]" />
                </Link>
              </Button>
            </section>
          </>
        )}
      </div>

      {/* Mobile Dock */}
      <MobileDock userRole={role} />
    </>
  );
}
