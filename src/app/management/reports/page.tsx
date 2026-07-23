"use client";

import { useState, useMemo } from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  format,
  differenceInHours,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Package,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function getPeriodRange(period: string) {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), granularity: "hour" as const };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now), granularity: "day" as const };
    default:
      return { from: startOfWeek(now), to: endOfDay(now), granularity: "day" as const };
  }
}

function TrendIndicator({ trend }: { trend?: { value: number; direction: string } }) {
  if (!trend) return null;
  const isUp = trend.direction === "up";
  const isDown = trend.direction === "down";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const colorClass = isUp
    ? "text-green-600"
    : isDown
      ? "text-red-600"
      : "text-gray-500";
  const sign = isUp ? "+" : isDown ? "" : "";
  return (
    <div className={`mt-3 flex items-center text-xs ${colorClass}`}>
      <Icon className="mr-1 h-3 w-3" />
      <span>
        {sign}
        {trend.value.toFixed(1)}% dari periode sebelumnya
      </span>
    </div>
  );
}

export default function ReportsPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");

  const periodRange = useMemo(
    () => getPeriodRange(selectedPeriod),
    [selectedPeriod],
  );

  const outletId = selectedOutlet === "all" ? undefined : selectedOutlet;

  const outletsQuery = api.outlets.list.useQuery();
  const kpiQuery = api.analytics.getKpiSummary.useQuery(
    { outletId, dateRange: periodRange, compareWithPrevious: true },
    { refetchOnWindowFocus: false },
  );
  const salesTrendQuery = api.analytics.getSalesTrend.useQuery(
    { outletId, dateRange: periodRange, granularity: periodRange.granularity },
    { refetchOnWindowFocus: false },
  );
  const topProductsQuery = api.analytics.getTopProducts.useQuery(
    { outletId, dateRange: periodRange, limit: 10 },
    { refetchOnWindowFocus: false },
  );
  const shiftQuery = api.analytics.getShiftActivity.useQuery(
    { outletId, date: new Date() },
    { refetchOnWindowFocus: false },
  );

  const chartData = useMemo(() => {
    return (salesTrendQuery.data ?? []).map((point) => {
      const date = new Date(point.timestamp);
      return {
        date:
          periodRange.granularity === "hour"
            ? format(date, "HH:mm")
            : format(date, "dd MMM"),
        sales: point.sales,
        transactions: point.transactions,
      };
    });
  }, [salesTrendQuery.data, periodRange.granularity]);

  const exportPDF = () => {
    console.log("Export PDF clicked");
  };

  const exportCSV = () => {
    console.log("Export CSV clicked");
  };

  const kpi = kpiQuery.data;
  const isLoading = kpiQuery.isLoading;
  const isError = kpiQuery.isError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Laporan & Analitik</h1>
              <p className="text-muted-foreground mt-1">
                Pantau performa outlet berdasarkan rentang tanggal & shift.
              </p>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Outlet</SelectItem>
                  {outletsQuery.data?.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {isError && (
          <Card>
            <CardContent className="flex h-32 flex-col items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-muted-foreground">Gagal memuat data laporan</p>
            </CardContent>
          </Card>
        )}

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Penjualan
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      formatCurrency(kpi?.totalSales.current ?? 0)
                    )}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              {kpi && <TrendIndicator trend={kpi.totalSales.trend} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Transaksi
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      kpi?.totalTransactions.current ?? 0
                    )}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              {kpi && <TrendIndicator trend={kpi.totalTransactions.trend} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Item Terjual
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      `${kpi?.itemsSold.current ?? 0} item`
                    )}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              {kpi && <TrendIndicator trend={kpi.itemsSold.trend} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Rata-rata / Transaksi
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      formatCurrency(kpi?.averageTransactionValue.current ?? 0)
                    )}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              {kpi && (
                <TrendIndicator trend={kpi.averageTransactionValue.trend} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Grafik Penjualan Harian</CardTitle>
            </CardHeader>
            <CardContent>
              {salesTrendQuery.isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Tidak ada data penjualan pada periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#888888"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#888888"
                      tickFormatter={(value: number) => {
                        if (value >= 1000000) return `${value / 1000000}jt`;
                        if (value >= 1000) return `${value / 1000}rb`;
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        "Penjualan",
                      ]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Transactions Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tren Transaksi Harian</CardTitle>
            </CardHeader>
            <CardContent>
              {salesTrendQuery.isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Tidak data transaksi pada periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#888888"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Items & Shift Analytics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Items */}
          <Card>
            <CardHeader>
              <CardTitle>Item Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
              {topProductsQuery.isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (topProductsQuery.data ?? []).length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  Belum ada penjualan pada periode ini
                </div>
              ) : (
                <div className="space-y-3">
                  {(topProductsQuery.data ?? []).map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {item.productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {item.quantity} terjual
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shift Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Analisis Per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              {shiftQuery.isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (shiftQuery.data ?? []).length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  Belum ada data shift hari ini
                </div>
              ) : (
                <div className="space-y-3">
                  {(shiftQuery.data ?? []).map((shift) => {
                    const open = new Date(shift.openTime);
                    const close = shift.closeTime
                      ? new Date(shift.closeTime)
                      : new Date();
                    const duration = differenceInHours(close, open);
                    const timeRange = `${format(open, "HH:mm")} – ${shift.closeTime ? format(close, "HH:mm") : "..."}`;

                    return (
                      <div
                        key={shift.sessionId}
                        className="rounded-lg border bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">
                              {shift.cashierName}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {timeRange} • {duration} jam •{" "}
                              {shift.status === "active" ? "Aktif" : "Tutup"}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-green-600">
                              {formatCurrency(shift.totalSales)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded bg-white p-2 text-center">
                            <div className="text-muted-foreground">
                              Transaksi
                            </div>
                            <div className="font-bold mt-1">
                              {shift.totalTransactions}
                            </div>
                          </div>
                          <div className="rounded bg-white p-2 text-center">
                            <div className="text-muted-foreground">
                              Kas Buka
                            </div>
                            <div className="font-bold mt-1">
                              {formatCurrency(shift.openingCash)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
