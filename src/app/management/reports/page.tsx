"use client";

import { useState, useMemo } from "react";
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
  ShoppingCart,
  Package,
  DollarSign,
} from "lucide-react";

interface DailySales {
  date: string;
  sales: number;
  transactions: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface ShiftData {
  shift: string;
  timeRange: string;
  duration: string;
  sales: number;
  items: number;
  transactions: number;
}

// Mock data
const dailySalesData: DailySales[] = [
  { date: "28 Nov", sales: 2800000, transactions: 95 },
  { date: "29 Nov", sales: 3200000, transactions: 110 },
  { date: "30 Nov", sales: 2950000, transactions: 102 },
  { date: "01 Des", sales: 3450000, transactions: 125 },
  { date: "02 Des", sales: 3560000, transactions: 128 },
];

const topItemsData: TopItem[] = [
  { name: "Air Mineral 600ml", quantity: 45, revenue: 225000 },
  { name: "Beras Premium 5kg", quantity: 22, revenue: 1540000 },
  { name: "Kopi Bubuk 200g", quantity: 18, revenue: 360000 },
  { name: "Gula Pasir 1kg", quantity: 16, revenue: 240000 },
  { name: "Minyak Goreng 2L", quantity: 14, revenue: 420000 },
];

const shiftData: ShiftData[] = [
  {
    shift: "Shift Ani",
    timeRange: "08:00 – 11:00",
    duration: "3 jam",
    sales: 780000,
    items: 65,
    transactions: 28,
  },
  {
    shift: "Shift Budi",
    timeRange: "11:00 – 15:00",
    duration: "4 jam",
    sales: 1200000,
    items: 110,
    transactions: 45,
  },
  {
    shift: "Shift Sore",
    timeRange: "15:00 – 20:00",
    duration: "5 jam",
    sales: 980000,
    items: 92,
    transactions: 38,
  },
  {
    shift: "Shift Malam",
    timeRange: "20:00 – 22:00",
    duration: "2 jam",
    sales: 600000,
    items: 111,
    transactions: 17,
  },
];

export default function ReportsPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>("BSD");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSales = dailySalesData.reduce((sum, day) => sum + day.sales, 0);
    const totalTransactions = dailySalesData.reduce(
      (sum, day) => sum + day.transactions,
      0,
    );
    const totalItems = topItemsData.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const avgPerTransaction = totalSales / totalTransactions;

    return {
      totalSales,
      totalTransactions,
      totalItems,
      avgPerTransaction,
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const exportPDF = () => {
    console.log("Export PDF clicked");
    // Implementation for PDF export
  };

  const exportCSV = () => {
    console.log("Export CSV clicked");
    // Implementation for CSV export
  };

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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BSD">BSD</SelectItem>
                  <SelectItem value="BR2">BR2</SelectItem>
                  <SelectItem value="Gudang Pusat">Gudang Pusat</SelectItem>
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
                  <SelectItem value="custom">Custom</SelectItem>
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
                    {formatCurrency(metrics.totalSales)}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                <span>+12.5% dari periode sebelumnya</span>
              </div>
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
                    {metrics.totalTransactions}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-blue-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                <span>+8.3% dari periode sebelumnya</span>
              </div>
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
                    {metrics.totalItems} item
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-purple-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                <span>+15.2% dari periode sebelumnya</span>
              </div>
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
                    {formatCurrency(metrics.avgPerTransaction)}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-orange-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                <span>+3.7% dari periode sebelumnya</span>
              </div>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySalesData}>
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
                    formatter={(value: number) => [
                      formatCurrency(value),
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
            </CardContent>
          </Card>

          {/* Transactions Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tren Transaksi Harian</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
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
              <div className="space-y-3">
                {topItemsData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
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
            </CardContent>
          </Card>

          {/* Shift Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Analisis Per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shiftData.map((shift) => (
                  <div
                    key={shift.shift}
                    className="rounded-lg border bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{shift.shift}</h4>
                        <p className="text-xs text-muted-foreground">
                          {shift.timeRange} • {shift.duration}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-green-600">
                          {formatCurrency(shift.sales)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded bg-white p-2 text-center">
                        <div className="text-muted-foreground">Item</div>
                        <div className="font-bold mt-1">{shift.items}</div>
                      </div>
                      <div className="rounded bg-white p-2 text-center">
                        <div className="text-muted-foreground">Transaksi</div>
                        <div className="font-bold mt-1">
                          {shift.transactions}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
