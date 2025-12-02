"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Store, Download } from "lucide-react";
import { startOfDay, endOfDay, subDays } from "date-fns";

import {
  KpiCard,
  SalesChart,
  CategoryChart,
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

// Mock data - in production, this would come from TRPC queries
const MOCK_OUTLETS = [
  { id: "all", name: "Semua Outlet" },
  { id: "bsd", name: "BSD" },
  { id: "br2", name: "BR2" },
  { id: "warehouse", name: "Gudang Pusat" },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  // Generate mock data based on selections
  const mockData = useMemo(() => {
    // KPI Data
    const kpiData = {
      totalSales: {
        value: "28.5M",
        trend: { value: 12, direction: "up" as const },
      },
      totalTransactions: {
        value: "912",
        trend: { value: 5, direction: "up" as const },
      },
      itemsSold: {
        value: "3,889",
        trend: { value: 8, direction: "up" as const },
      },
      profit: {
        value: "8.3M",
        trend: { value: 15, direction: "up" as const },
      },
    };

    // Sales chart data (daily)
    const salesChartData = [
      { label: "Sen", value: 3200000 },
      { label: "Sel", value: 3800000 },
      { label: "Rab", value: 4200000 },
      { label: "Kam", value: 3900000 },
      { label: "Jum", value: 5100000 },
      { label: "Sab", value: 4800000 },
      { label: "Min", value: 3560000 },
    ];

    // Category composition data
    const categoryData = [
      { name: "Minuman", value: 12280000 },
      { name: "Sembako", value: 7996800 },
      { name: "ATK", value: 3998400 },
      { name: "Lainnya", value: 4284000 },
    ];

    // Outlet performance data
    const outletPerformanceData = [
      {
        id: "bsd",
        name: "BSD",
        sales: 12500000,
        transactions: 380,
        avgTicket: 32800,
        trend: { value: 8, direction: "up" as const },
      },
      {
        id: "br2",
        name: "BR2",
        sales: 9200000,
        transactions: 295,
        avgTicket: 31100,
        trend: { value: 3, direction: "up" as const },
      },
      {
        id: "warehouse",
        name: "Gudang Pusat",
        sales: 6800000,
        transactions: 237,
        avgTicket: 28900,
        trend: { value: 2, direction: "down" as const },
      },
    ];

    // Low stock data
    const lowStockData = [
      {
        id: "1",
        name: "Air Mineral 600ml",
        currentStock: 0,
        minStock: 50,
        unit: "btl",
        severity: "critical" as const,
      },
      {
        id: "2",
        name: "Gula Pasir 1kg",
        currentStock: 3,
        minStock: 20,
        unit: "kg",
        severity: "critical" as const,
      },
      {
        id: "3",
        name: "Rokok Surya",
        currentStock: 2,
        minStock: 10,
        unit: "bks",
        severity: "low" as const,
      },
      {
        id: "4",
        name: "Minyak Goreng 2L",
        currentStock: 8,
        minStock: 30,
        unit: "btl",
        severity: "low" as const,
      },
      {
        id: "5",
        name: "Beras Premium 5kg",
        currentStock: 12,
        minStock: 25,
        unit: "sak",
        severity: "warning" as const,
      },
    ];

    // Shift monitoring data
    const shiftData = [
      {
        id: "1",
        cashierName: "Ani",
        startTime: new Date(new Date().setHours(8, 0, 0, 0)),
        endTime: new Date(new Date().setHours(11, 0, 0, 0)),
        sales: 1200000,
        transactions: 102,
        isActive: false,
      },
      {
        id: "2",
        cashierName: "Budi",
        startTime: new Date(new Date().setHours(11, 0, 0, 0)),
        endTime: new Date(new Date().setHours(15, 0, 0, 0)),
        sales: 1800000,
        transactions: 143,
        isActive: false,
      },
      {
        id: "3",
        cashierName: "Sari",
        startTime: new Date(new Date().setHours(15, 0, 0, 0)),
        sales: 320000,
        transactions: 28,
        isActive: true,
      },
    ];

    // Activity log data
    const activityData = [
      {
        id: "1",
        type: "stock_in" as const,
        title: "Stok masuk ke BSD",
        description: "12 item berbagai produk",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        metadata: { quantity: 12 },
      },
      {
        id: "2",
        type: "transfer" as const,
        title: "Transfer stok antar outlet",
        description: "15 item dipindahkan",
        user: "Owner",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        metadata: { quantity: 15, from: "BSD", to: "BR2" },
      },
      {
        id: "3",
        type: "refund" as const,
        title: "Pengembalian dana",
        description: "Transaksi dibatalkan oleh kasir",
        user: "Kasir Ani",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        metadata: { amount: 30000 },
      },
      {
        id: "4",
        type: "product_edit" as const,
        title: 'Produk "Beras Premium 5kg" diedit',
        description: "Perubahan harga jual",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        id: "5",
        type: "stock_out" as const,
        title: "Stok keluar dari BR2",
        description: "8 item terjual",
        user: "Kasir Budi",
        timestamp: new Date(Date.now() - 1000 * 60 * 75),
        metadata: { quantity: 8 },
      },
      {
        id: "6",
        type: "user_action" as const,
        title: "Admin baru ditambahkan",
        description: "User Dedi ditambahkan sebagai Admin",
        user: "Owner",
        timestamp: new Date(Date.now() - 1000 * 60 * 90),
      },
    ];

    return {
      kpiData,
      salesChartData,
      categoryData,
      outletPerformanceData,
      lowStockData,
      shiftData,
      activityData,
    };
  }, [selectedOutlet, dateRange]);

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export data", { selectedOutlet, dateRange });
  };

  const handleOutletClick = (outletId: string) => {
    router.push(`/reports/outlet/${outletId}`);
  };

  const handleViewAllStock = () => {
    router.push("/management/products?filter=low-stock");
  };

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
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Outlet Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground lg:text-base">
                Outlet
              </label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_OUTLETS.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <label className="hidden text-sm font-medium text-muted-foreground lg:block lg:text-base">
                Periode
              </label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {/* Mobile Export Button */}
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="flex w-full gap-2 lg:hidden"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <KpiCard
          title="Total Penjualan"
          value={`Rp ${mockData.kpiData.totalSales.value}`}
          trend={mockData.kpiData.totalSales.trend}
          delay={0}
        />
        <KpiCard
          title="Total Transaksi"
          value={mockData.kpiData.totalTransactions.value}
          trend={mockData.kpiData.totalTransactions.trend}
          delay={1}
        />
        <KpiCard
          title="Item Terjual"
          value={mockData.kpiData.itemsSold.value}
          trend={mockData.kpiData.itemsSold.trend}
          delay={2}
        />
        <KpiCard
          title="Profit"
          value={`Rp ${mockData.kpiData.profit.value}`}
          trend={mockData.kpiData.profit.trend}
          delay={3}
        />
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesChart
          data={mockData.salesChartData}
          type="bar"
          title="Penjualan Harian"
          height={300}
        />
        <CategoryChart
          data={mockData.categoryData}
          title="Kontribusi Kategori"
          height={300}
        />
      </section>

      {/* Outlet Performance */}
      <section>
        <OutletPerformanceTable
          data={mockData.outletPerformanceData}
          onOutletClick={handleOutletClick}
        />
      </section>

      {/* Low Stock & Shift Monitoring */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LowStockWatchlist
          data={mockData.lowStockData}
          maxDisplay={5}
          onViewAll={handleViewAllStock}
        />
        <ShiftMonitoring
          data={mockData.shiftData}
          title="Shift Aktif Hari Ini"
        />
      </section>

      {/* Activity Log */}
      <section>
        <ActivityLog
          data={mockData.activityData}
          maxDisplay={10}
          title="Aktivitas Terbaru"
        />
      </section>
    </div>
  );
}
