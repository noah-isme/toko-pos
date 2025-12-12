"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ReceiptText,
  Package,
  BarChart3,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Box,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useOutlet } from "@/lib/outlet-context";
import { api } from "@/trpc/client";
import { AnimatedNumber } from "@/components/ui/count-up";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";

export default function HomePage() {
  const { data: session } = useSession();
  const { currentOutlet, activeShift } = useOutlet();

  // Get stable date string for today (yyyy-MM-dd format, not ISO)
  const todayDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Get today's sales summary
  const { data: todaySummary, isLoading: isSummaryLoading } =
    api.sales.getDailySummary.useQuery(
      {
        date: todayDate,
        outletId: currentOutlet?.id,
      },
      {
        enabled: Boolean(currentOutlet?.id),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Get low stock alerts
  const { data: lowStockAlerts } = api.inventory.listLowStock.useQuery(
    { outletId: currentOutlet?.id ?? "" },
    { enabled: Boolean(currentOutlet?.id) },
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const sales = todaySummary?.sales ?? [];
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.totalNet), 0);
    const transactions = sales.length;
    const items = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );
    return { revenue, transactions, items };
  }, [todaySummary]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat pagi";
    if (hour < 18) return "Selamat siang";
    return "Selamat malam";
  }, []);

  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Hero - Greeting & Today's Snapshot */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-6 shadow-sm lg:p-8">
        <div className="relative z-10 space-y-6">
          {/* Greeting & Actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">
                {greeting}, {session?.user?.name || "User"} 👋
              </h1>
              <p className="text-sm text-gray-600">
                {currentOutlet ? (
                  <>
                    <span className="font-medium">
                      {currentOutlet.name} ({currentOutlet.code})
                    </span>
                    {" • "}
                    {dateStr}
                  </>
                ) : (
                  "Pilih outlet untuk melihat data"
                )}
              </p>
            </div>
          </div>

          {/* Today's KPIs */}
          {currentOutlet && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2.5">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600">
                      Penjualan Hari Ini
                    </p>
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {isSummaryLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        <AnimatedNumber
                          value={metrics.revenue}
                          format={(val) => formatCurrency(val)}
                        />
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2.5">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600">
                      Transaksi
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {isSummaryLoading ? (
                        "..."
                      ) : (
                        <AnimatedNumber value={metrics.transactions} />
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2.5">
                    <Box className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600">
                      Total Item
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {isSummaryLoading ? (
                        "..."
                      ) : (
                        <AnimatedNumber value={metrics.items} />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary CTAs */}
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Link href="/cashier" className="gap-2">
                <ReceiptText className="h-4 w-4" />
                Buka Kasir
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-sm">
              <Link href="/reports/daily" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Laporan Hari Ini
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative */}
        <div
          aria-hidden
          className="absolute -right-20 top-1/2 hidden h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-200/30 blur-3xl lg:block"
        />
      </section>

      {/* Main Modules */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Modul Utama
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Kasir Module */}
          <Card className="group transition-all hover:shadow-md hover:scale-[1.01]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <ReceiptText className="h-6 w-6 text-emerald-600" />
                </div>
                {activeShift && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/10">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                    Shift Aktif
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Kasir</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    {activeShift ? "Shift aktif" : "Belum ada shift aktif"}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    {metrics.transactions} transaksi hari ini
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/cashier">Buka Kasir</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Products Module */}
          <Card className="group transition-all hover:shadow-md hover:scale-[1.01]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                {lowStockAlerts && lowStockAlerts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/10">
                    <AlertCircle className="h-3 w-3" />
                    {lowStockAlerts.length} Low Stock
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Produk</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    Total SKU tersedia
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    {lowStockAlerts?.length ?? 0} produk low stock
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/management/products">Kelola Produk</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Reports Module */}
          <Card className="group transition-all hover:shadow-md hover:scale-[1.01]">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-purple-100 p-3 w-fit">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Laporan
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    Penjualan: {formatCurrency(metrics.revenue)}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    Hari ini: {metrics.transactions} transaksi
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/reports/daily">Buka Laporan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Revenue Trend & Recent Activity */}
      {currentOutlet && (
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Revenue Trend Chart */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Trend Penjualan 7 Hari
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/reports/daily" className="text-xs">
                    Detail →
                  </Link>
                </Button>
              </div>
              {todaySummary?.sales && todaySummary.sales.length > 0 ? (
                <RevenueTrendChart
                  data={Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    // Simulated data - in real app would come from API
                    const dayRevenue =
                      i === 6
                        ? metrics.revenue
                        : Math.random() * metrics.revenue * 1.5;
                    return {
                      date,
                      revenue: dayRevenue,
                    };
                  })}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Belum ada data penjualan
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <RecentActivityFeed
            activities={
              todaySummary?.sales
                ? todaySummary.sales.slice(0, 3).map((sale) => ({
                    id: sale.id,
                    type: "sale" as const,
                    title: `Transaksi ${sale.receiptNumber}`,
                    description: `${sale.items.length} item terjual`,
                    timestamp: new Date(sale.soldAt),
                    amount: Number(sale.totalNet),
                  }))
                : []
            }
          />
        </section>
      )}

      {/* Operational Snapshot */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Snapshot Operasional
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Shift & Cash */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2.5">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Shift & Kas
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {activeShift ? (
                  <>
                    <p>
                      • 1 shift aktif sejak{" "}
                      {new Date(activeShift.openTime).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                    <p>
                      • Kas awal:{" "}
                      {formatCurrency(Number(activeShift.openingCash))}
                    </p>
                  </>
                ) : (
                  <p>• Belum ada shift aktif hari ini</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/cashier">
                  {activeShift ? "Kelola Shift" : "Buka Shift Baru"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Stok & Low Stock
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {lowStockAlerts && lowStockAlerts.length > 0 ? (
                  <>
                    <p>
                      • {lowStockAlerts.length} produk hampir habis{" "}
                    </p>
                    <p className="text-xs text-amber-600">
                      Segera lakukan restocking
                    </p>
                  </>
                ) : (
                  <p>• Semua stok dalam kondisi baik</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/management/stock">
                  {lowStockAlerts && lowStockAlerts.length > 0
                    ? "Lihat Daftar →"
                    : "Kelola Stok"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Transaksi Terakhir
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {todaySummary?.sales && todaySummary.sales.length > 0 ? (
                  <>
                    {todaySummary.sales.slice(0, 2).map((sale) => (
                      <p key={sale.id} className="flex justify-between">
                        <span className="text-xs">
                          • {sale.receiptNumber} •{" "}
                          {new Date(sale.soldAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(sale.totalNet))}
                        </span>
                      </p>
                    ))}
                  </>
                ) : (
                  <p>• Belum ada transaksi hari ini</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/reports/daily">Lihat Semua</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tasks & Checklist */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2.5">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Tugas & Checklist
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Tutup shift saat kasir selesai</p>
                <p>• Export laporan harian</p>
                <p>• Cek stok produk low stock</p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/reports/daily">Lihat Checklist</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Implementation Guide (Small) */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Panduan Implementasi
          </h3>
          <ol className="space-y-1.5 text-sm text-gray-600 list-decimal list-inside">
            <li>Import produk & stok awal</li>
            <li>Atur role & outlet user</li>
            <li>Simulasikan kasir & transaksi</li>
            <li>Mulai pakai di toko sebenarnya</li>
          </ol>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/docs/implementation">
              Baca panduan lengkap
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
