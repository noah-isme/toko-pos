"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Download } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

import {
  KpiCard,
  SalesChart,
  CategoryChart,
  PaymentMethodChart,
  OutletPerformanceTable,
  LowStockWatchlist,
  ShiftMonitoring,
  ActivityLog,
  DateRangePicker,
} from "@/components/dashboard/owner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const mapActionType = (action: string):
  | "stock_in"
  | "stock_out"
  | "transfer"
  | "refund"
  | "product_edit"
  | "user_action"
  | "other" => {
  if (action === "SALE_RECORD") return "stock_out";
  if (action === "SALE_VOID" || action === "SALE_REFUND") return "refund";
  if (action.startsWith("PRODUCT") || action.startsWith("PROMOTION"))
    return "product_edit";
  if (action.startsWith("USER") || action.startsWith("SHIFT") || action.startsWith("OUTLET"))
    return "user_action";
  if (action === "TRANSFER") return "transfer";
  if (action === "IN" || action === "PURCHASE") return "stock_in";
  if (action === "OUT") return "stock_out";
  return "other";
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const outletsQuery = api.outlets.list.useQuery();
  const outletId = selectedOutlet === "all" ? undefined : selectedOutlet;

  const kpiQuery = api.analytics.getKpiSummary.useQuery(
    { outletId, dateRange, compareWithPrevious: true },
    { refetchOnWindowFocus: false },
  );
  const salesTrendQuery = api.analytics.getSalesTrend.useQuery(
    { outletId, dateRange, granularity: "day" },
    { refetchOnWindowFocus: false },
  );
  const categoryQuery = api.analytics.getCategoryBreakdown.useQuery(
    { outletId, dateRange },
    { refetchOnWindowFocus: false },
  );
  const paymentQuery = api.analytics.getPaymentMethodBreakdown.useQuery(
    { outletId, dateRange },
    { refetchOnWindowFocus: false },
  );
  const outletPerfQuery = api.analytics.getOutletPerformance.useQuery(
    { dateRange },
    { refetchOnWindowFocus: false },
  );
  const lowStockQuery = api.analytics.getLowStockAlerts.useQuery(
    { outletId, limit: 10 },
    { refetchOnWindowFocus: false },
  );
  const shiftQuery = api.analytics.getShiftActivity.useQuery(
    { outletId, date: new Date() },
    { refetchOnWindowFocus: false },
  );
  const activityQuery = api.analytics.getActivityLog.useQuery(
    { outletId, dateRange, limit: 10 },
    { refetchOnWindowFocus: false },
  );

  const salesChartData = useMemo(
    () =>
      (salesTrendQuery.data ?? []).map((point) => ({
        label: point.timestamp,
        value: point.sales,
      })),
    [salesTrendQuery.data],
  );

  const categoryChartData = useMemo(
    () =>
      (categoryQuery.data ?? []).map((cat) => ({
        name: cat.category,
        value: cat.sales,
      })),
    [categoryQuery.data],
  );

  const outletPerfData = useMemo(
    () =>
      (outletPerfQuery.data ?? []).map((outlet) => ({
        id: outlet.outletId,
        name: outlet.outletName,
        sales: outlet.sales,
        transactions: outlet.transactions,
        avgTicket: outlet.averageTransactionValue,
        trend: {
          value: outlet.trend?.value ?? 0,
          direction:
            (outlet.trend?.direction ?? "up") === "neutral"
              ? ("up" as const)
              : (outlet.trend?.direction as "up" | "down"),
        },
      })),
    [outletPerfQuery.data],
  );

  const lowStockData = useMemo(
    () =>
      (lowStockQuery.data ?? []).map((item) => ({
        id: item.productId,
        name: item.productName,
        currentStock: item.currentStock,
        minStock: item.reorderPoint ?? 0,
        unit: "pcs",
        severity: item.status,
      })),
    [lowStockQuery.data],
  );

  const shiftData = useMemo(
    () =>
      (shiftQuery.data ?? []).map((shift) => ({
        id: shift.sessionId,
        cashierName: shift.cashierName,
        startTime: new Date(shift.openTime),
        endTime: shift.closeTime ? new Date(shift.closeTime) : undefined,
        sales: shift.totalSales,
        transactions: shift.totalTransactions,
        isActive: shift.status === "active",
      })),
    [shiftQuery.data],
  );

  const activityData = useMemo(
    () =>
      (activityQuery.data?.activities ?? []).map((entry) => ({
        id: entry.id,
        type: mapActionType(entry.type),
        title: entry.description || entry.type,
        user: entry.user,
        timestamp: new Date(entry.timestamp),
        metadata: entry.metadata as
          | { amount?: number; quantity?: number; from?: string; to?: string }
          | undefined,
      })),
    [activityQuery.data],
  );

  const handleExport = () => {
    router.push("/management/reports");
  };

  const handleOutletClick = (outletId: string) => {
    router.push(`/reports/outlet/${outletId}`);
  };

  const handleViewAllStock = () => {
    router.push("/management/products?filter=low-stock");
  };

  const isLoadingCharts =
    salesTrendQuery.isLoading ||
    categoryQuery.isLoading ||
    paymentQuery.isLoading;

  return (
    <div className="flex flex-col gap-6 pb-20 lg:gap-8 lg:pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary lg:h-7 lg:w-7" />
              <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                Dashboard Owner
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground lg:text-base">
              Pantau performa seluruh outlet, shift kasir, dan stok dalam satu
              halaman
            </p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="hidden gap-2 lg:flex"
          >
            <Download className="h-4 w-4" />
            Laporan Lengkap
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground lg:text-base">
                Outlet
              </label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Outlet</SelectItem>
                  {(outletsQuery.data ?? []).map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="hidden text-sm font-medium text-muted-foreground lg:block lg:text-base">
                Periode
              </label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="flex w-full gap-2 lg:hidden"
          >
            <Download className="h-4 w-4" />
            Laporan Lengkap
          </Button>
        </div>
      </div>

      {/* KPI Cards (2x2 Grid) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 lg:gap-6">
        {kpiQuery.isLoading ? (
          <LoadingKpiSkeleton count={4} />
        ) : kpiQuery.error ? (
          <ErrorBanner message="Gagal memuat KPI" error={kpiQuery.error} />
        ) : kpiQuery.data ? (
          <>
            <KpiCard
              title="Total Penjualan"
              value={formatCurrency(kpiQuery.data.totalSales.current)}
              trend={kpiQuery.data.totalSales.trend}
              delay={0}
            />
            <KpiCard
              title="Total Transaksi"
              value={kpiQuery.data.totalTransactions.current}
              trend={kpiQuery.data.totalTransactions.trend}
              delay={1}
            />
            <KpiCard
              title="Item Terjual"
              value={kpiQuery.data.itemsSold.current}
              trend={kpiQuery.data.itemsSold.trend}
              delay={2}
            />
            <KpiCard
              title="Profit"
              value={formatCurrency(kpiQuery.data.profit.current)}
              trend={kpiQuery.data.profit.trend}
              delay={3}
            />
          </>
        ) : null}
      </section>

      {/* Charts Section */}
      {isLoadingCharts ? (
        <LoadingCardSkeleton count={3} />
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SalesChart
            data={salesChartData}
            type="bar"
            title="Penjualan Harian"
            height={300}
          />
          <CategoryChart
            data={categoryChartData}
            title="Kontribusi Kategori"
            height={300}
          />
          <PaymentMethodChart
            data={paymentQuery.data ?? []}
            title="Metode Pembayaran"
            height={300}
          />
        </section>
      )}

      {/* Outlet Performance */}
      <section>
        {outletPerfQuery.isLoading ? (
          <LoadingCardSkeleton count={1} />
        ) : outletPerfQuery.error ? (
          <ErrorBanner
            message="Gagal memuat performa outlet"
            error={outletPerfQuery.error}
          />
        ) : (
          <OutletPerformanceTable
            data={outletPerfData}
            onOutletClick={handleOutletClick}
          />
        )}
      </section>

      {/* Low Stock & Shift Monitoring */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {lowStockQuery.isLoading ? (
          <LoadingCardSkeleton count={1} />
        ) : (
          <LowStockWatchlist
            data={lowStockData}
            maxDisplay={5}
            onViewAll={handleViewAllStock}
          />
        )}
        <ShiftMonitoring data={shiftData} title="Shift Aktif Hari Ini" />
      </section>

      {/* Activity Log */}
      <section>
        {activityQuery.isLoading ? (
          <LoadingCardSkeleton count={1} />
        ) : (
          <ActivityLog
            data={activityData}
            maxDisplay={10}
            title="Aktivitas Terbaru"
          />
        )}
      </section>
    </div>
  );
}

function LoadingKpiSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border bg-card p-6"
        >
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-4 h-8 w-32 rounded bg-muted" />
        </div>
      ))}
    </>
  );
}

function LoadingCardSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-xl border bg-card p-6"
        >
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="mt-4 h-56 rounded bg-muted" />
        </div>
      ))}
    </>
  );
}

function ErrorBanner({ message, error }: { message: string; error: unknown }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
      {error instanceof Error && `: ${error.message}`}
    </div>
  );
}
