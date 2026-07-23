"use client";

import { useState, useMemo } from "react";
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  ArrowUpDown,
  Filter,
  Download,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/client";

type MovementType =
  | "IN"
  | "OUT"
  | "ADJUSTMENT"
  | "SALE"
  | "RETURN"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "INITIAL"
  | "PURCHASE";

type DisplayCategory = "in" | "out" | "transfer" | "adjustment";

const TYPE_LABELS: Record<MovementType, string> = {
  IN: "Stok Masuk",
  OUT: "Stok Keluar",
  ADJUSTMENT: "Penyesuaian",
  SALE: "Penjualan",
  RETURN: "Retur",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  INITIAL: "Stok Awal",
  PURCHASE: "Pembelian",
};

const FILTER_TYPE_MAP: Record<string, MovementType[]> = {
  in: ["IN", "INITIAL", "PURCHASE", "RETURN"],
  out: ["OUT", "SALE"],
  transfer: ["TRANSFER_IN", "TRANSFER_OUT"],
  adjustment: ["ADJUSTMENT"],
};

function getDisplayType(type: MovementType): DisplayCategory {
  switch (type) {
    case "IN":
    case "INITIAL":
    case "PURCHASE":
    case "RETURN":
      return "in";
    case "OUT":
    case "SALE":
      return "out";
    case "TRANSFER_IN":
    case "TRANSFER_OUT":
      return "transfer";
    case "ADJUSTMENT":
      return "adjustment";
  }
}

function getMovementIcon(category: DisplayCategory) {
  switch (category) {
    case "in":
      return <ArrowUp className="h-5 w-5 text-green-600" />;
    case "out":
      return <ArrowDown className="h-5 w-5 text-red-600" />;
    case "transfer":
      return <ArrowLeftRight className="h-5 w-5 text-blue-600" />;
    case "adjustment":
      return <ArrowUpDown className="h-5 w-5 text-orange-600" />;
  }
}

function getMovementColor(category: DisplayCategory) {
  switch (category) {
    case "in":
      return "text-green-600 bg-green-50 border-green-200";
    case "out":
      return "text-red-600 bg-red-50 border-red-200";
    case "transfer":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "adjustment":
      return "text-orange-600 bg-orange-50 border-orange-200";
  }
}

function formatQuantity(category: DisplayCategory, quantity: number) {
  const abs = Math.abs(quantity);
  switch (category) {
    case "in":
      return `+${abs}`;
    case "out":
      return `-${abs}`;
    case "transfer":
      return `${abs}`;
    case "adjustment":
      return `${quantity > 0 ? "+" : ""}${quantity}`;
  }
}

export default function StockMovementPage() {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const outletsQuery = api.outlets.list.useQuery();
  const productsQuery = api.products.list.useQuery({ take: 100 });

  const dateFilter = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
      case "week":
        return { dateFrom: startOfWeek(now), dateTo: endOfDay(now) };
      case "month":
        return { dateFrom: startOfMonth(now), dateTo: endOfDay(now) };
      default:
        return {};
    }
  }, [dateRange]);

  const typeFilter = useMemo(() => {
    if (selectedType === "all") return undefined;
    return FILTER_TYPE_MAP[selectedType] ?? undefined;
  }, [selectedType]);

  const movementsQuery = api.products.getStockMovements.useQuery(
    {
      ...(selectedProduct !== "all" ? { productId: selectedProduct } : {}),
      ...(selectedOutlet !== "all" ? { outletId: selectedOutlet } : {}),
      types: typeFilter,
      ...dateFilter,
      limit: 100,
    },
    { refetchOnWindowFocus: false },
  );

  const movements = useMemo(
    () => movementsQuery.data ?? [],
    [movementsQuery.data],
  );

  const groupedMovements = useMemo(() => {
    const grouped = new Map<string, typeof movements>();
    movements.forEach((movement) => {
      const date = new Date(movement.occurredAt);
      const dateKey = date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(movement);
    });
    return Array.from(grouped.entries()).sort(
      (a, b) =>
        new Date(b[1][0]!.occurredAt).getTime() -
        new Date(a[1][0]!.occurredAt).getTime(),
    );
  }, [movements]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const resetFilters = () => {
    setSelectedProduct("all");
    setSelectedOutlet("all");
    setSelectedType("all");
    setDateRange("all");
  };

  const exportCSV = () => {
    const csvData = movements.map((m) => ({
      Tanggal: new Date(m.occurredAt).toLocaleString("id-ID"),
      Tipe: TYPE_LABELS[m.type],
      Produk: m.productName,
      Jumlah: m.quantity,
      Outlet: m.outletName,
      Oleh: m.createdBy ?? "-",
      Catatan: m.note ?? "-",
    }));
    console.log("Export CSV:", csvData);
  };

  const renderFilterSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="product-filter">Produk</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger id="product-filter">
              <SelectValue placeholder="Semua Produk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Produk</SelectItem>
              {productsQuery.data?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="outlet-filter">Outlet</Label>
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger id="outlet-filter">
              <SelectValue placeholder="Semua Outlet" />
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
        </div>

        <div>
          <Label htmlFor="type-filter">Jenis</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="Semua Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="in">Stok Masuk</SelectItem>
              <SelectItem value="out">Stok Keluar</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="adjustment">Penyesuaian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date-filter">Tanggal</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger id="date-filter">
              <SelectValue placeholder="Semua Tanggal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tanggal</SelectItem>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Ekspor CSV
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Pergerakan Stok</h1>
          <p className="text-muted-foreground mt-1">
            Pantau seluruh riwayat keluar/masuk stok antar outlet & kasir.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Desktop Filter */}
        <Card className="mb-6 hidden md:block">
          <CardContent className="pt-6">
            {renderFilterSection()}
          </CardContent>
        </Card>

        {/* Mobile Filter Button */}
        <div className="mb-4 flex justify-between md:hidden">
          <Sheet open={showMobileFilter} onOpenChange={setShowMobileFilter}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filter Pergerakan Stok</SheetTitle>
                <SheetDescription>
                  Saring data berdasarkan produk, outlet, jenis, dan tanggal
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                {renderFilterSection()}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Ledger List */}
        <div className="space-y-6">
          {movementsQuery.isLoading && (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {movementsQuery.isError && (
            <Card>
              <CardContent className="flex h-32 flex-col items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <p className="text-muted-foreground">
                  Gagal memuat data pergerakan stok
                </p>
              </CardContent>
            </Card>
          )}

          {!movementsQuery.isLoading &&
            !movementsQuery.isError &&
            groupedMovements.length === 0 && (
              <Card>
                <CardContent className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">
                    Tidak ada pergerakan stok yang sesuai filter
                  </p>
                </CardContent>
              </Card>
            )}

          {groupedMovements.map(([date, dateMovements]) => (
            <div key={date} className="space-y-3">
              {/* Date Separator */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-300" />
                <div className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-700">
                  {date}
                </div>
                <div className="h-px flex-1 bg-gray-300" />
              </div>

              {/* Movement Cards */}
              <div className="space-y-3">
                {dateMovements.map((movement) => {
                  const category = getDisplayType(movement.type);
                  const isExpanded = expandedItems.has(movement.id);

                  return (
                    <Card
                      key={movement.id}
                      className={`cursor-pointer border-l-4 transition-all hover:shadow-md ${getMovementColor(category)}`}
                      onClick={() => toggleExpand(movement.id)}
                    >
                      <CardContent className="p-4">
                        {/* Desktop Layout */}
                        <div className="hidden md:flex md:items-start md:justify-between">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white">
                              {getMovementIcon(category)}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-3">
                                <span className="font-bold text-lg">
                                  {formatQuantity(category, movement.quantity)}{" "}
                                  stok{" "}
                                  {category === "in"
                                    ? "masuk"
                                    : category === "out"
                                      ? "keluar"
                                      : category === "transfer"
                                        ? "transfer"
                                        : "disesuaikan"}
                                </span>
                                <Badge variant="secondary">
                                  {TYPE_LABELS[movement.type]}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-gray-700">
                                <div>
                                  <span className="font-medium">Produk:</span>{" "}
                                  {movement.productName}
                                </div>
                                <div>
                                  <span className="font-medium">Outlet:</span>{" "}
                                  {movement.outletName}
                                </div>
                                <div>
                                  <span className="font-medium">Oleh:</span>{" "}
                                  {movement.createdBy ?? "Sistem"} •{" "}
                                  {new Date(movement.occurredAt).toLocaleTimeString(
                                    "id-ID",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </div>
                                {movement.note && (
                                  <div>
                                    <span className="font-medium">Catatan:</span>{" "}
                                    {movement.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expand Icon */}
                          {movement.note && (
                            <ChevronDown
                              className={`h-5 w-5 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>

                        {/* Mobile Layout */}
                        <div className="md:hidden">
                          <div className="mb-2 flex items-center gap-2">
                            {getMovementIcon(category)}
                            <span className="font-bold">
                              {formatQuantity(category, movement.quantity)}{" "}
                              {category === "in"
                                ? "Masuk"
                                : category === "out"
                                  ? "Keluar"
                                  : category === "transfer"
                                    ? "Transfer"
                                    : "Penyesuaian"}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="font-medium">
                              {movement.productName}
                            </div>
                            <div className="text-gray-600">
                              {movement.outletName}
                            </div>
                            <div className="text-gray-600">
                              {movement.createdBy ?? "Sistem"} •{" "}
                              {new Date(movement.occurredAt).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </div>
                            {movement.note && (
                              <div className="mt-2 rounded bg-white/50 p-2 text-xs">
                                {movement.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
