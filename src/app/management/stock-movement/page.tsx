"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  Filter,
  Download,
  ChevronDown,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StockMovement {
  id: string;
  type: "in" | "out" | "transfer";
  product: string;
  quantity: number;
  outlet: string;
  fromOutlet?: string;
  toOutlet?: string;
  actor: string;
  actorRole: string;
  timestamp: Date;
  reason: string;
  notes?: string;
}

// Mock data
const mockMovements: StockMovement[] = [
  {
    id: "1",
    type: "in",
    product: "Gula Pasir 1kg",
    quantity: 12,
    outlet: "BSD",
    actor: "Admin",
    actorRole: "Admin",
    timestamp: new Date("2025-12-02T11:23:00"),
    reason: "Supplier",
    notes: "Restock mingguan",
  },
  {
    id: "2",
    type: "out",
    product: "Kopi Bubuk 200g",
    quantity: 3,
    outlet: "BSD",
    actor: "Ani",
    actorRole: "Kasir",
    timestamp: new Date("2025-12-02T11:25:00"),
    reason: "Penjualan",
    notes: "",
  },
  {
    id: "3",
    type: "transfer",
    product: "Air Mineral 600ml",
    quantity: 15,
    fromOutlet: "BSD",
    toOutlet: "BR2",
    outlet: "BSD",
    actor: "Owner",
    actorRole: "Owner",
    timestamp: new Date("2025-12-02T14:30:00"),
    reason: "Transfer",
    notes: "",
  },
  {
    id: "4",
    type: "out",
    product: "Beras Premium 5kg",
    quantity: 2,
    outlet: "BR2",
    actor: "Admin",
    actorRole: "Admin",
    timestamp: new Date("2025-12-01T08:10:00"),
    reason: "Edit Manual",
    notes: "Barang retur rusak",
  },
  {
    id: "5",
    type: "in",
    product: "Teh Botol Sosro",
    quantity: 24,
    outlet: "BSD",
    actor: "Admin",
    actorRole: "Admin",
    timestamp: new Date("2025-12-01T09:15:00"),
    reason: "Supplier",
    notes: "Stock ready drink",
  },
];

export default function StockMovementPage() {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Group movements by date
  const groupedMovements = useMemo(() => {
    let filtered = mockMovements;

    // Apply filters
    if (selectedProduct !== "all") {
      filtered = filtered.filter((m) => m.product === selectedProduct);
    }
    if (selectedOutlet !== "all") {
      filtered = filtered.filter((m) => m.outlet === selectedOutlet);
    }
    if (selectedType !== "all") {
      filtered = filtered.filter((m) => m.type === selectedType);
    }

    // Group by date
    const grouped = new Map<string, StockMovement[]>();
    filtered.forEach((movement) => {
      const dateKey = movement.timestamp.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(movement);
    });

    // Sort by date descending
    return Array.from(grouped.entries()).sort(
      (a, b) =>
        new Date(b[1][0].timestamp).getTime() -
        new Date(a[1][0].timestamp).getTime(),
    );
  }, [selectedProduct, selectedOutlet, selectedType, dateRange]);

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
    // Implementation for CSV export
    const csvData = mockMovements.map((m) => ({
      Tanggal: m.timestamp.toLocaleString("id-ID"),
      Tipe: m.type === "in" ? "Masuk" : m.type === "out" ? "Keluar" : "Transfer",
      Produk: m.product,
      Jumlah: m.quantity,
      Outlet: m.outlet,
      Oleh: m.actor,
      Alasan: m.reason,
      Catatan: m.notes || "-",
    }));
    console.log("Export CSV:", csvData);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowUp className="h-5 w-5 text-green-600" />;
      case "out":
        return <ArrowDown className="h-5 w-5 text-red-600" />;
      case "transfer":
        return <ArrowLeftRight className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case "in":
        return "text-green-600 bg-green-50 border-green-200";
      case "out":
        return "text-red-600 bg-red-50 border-red-200";
      case "transfer":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const FilterSection = () => (
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
              <SelectItem value="Gula Pasir 1kg">Gula Pasir 1kg</SelectItem>
              <SelectItem value="Kopi Bubuk 200g">Kopi Bubuk 200g</SelectItem>
              <SelectItem value="Air Mineral 600ml">Air Mineral 600ml</SelectItem>
              <SelectItem value="Beras Premium 5kg">Beras Premium 5kg</SelectItem>
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
              <SelectItem value="BSD">BSD</SelectItem>
              <SelectItem value="BR2">BR2</SelectItem>
              <SelectItem value="Gudang Pusat">Gudang Pusat</SelectItem>
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
            <FilterSection />
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
                <FilterSection />
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Ledger List */}
        <div className="space-y-6">
          {groupedMovements.length === 0 ? (
            <Card>
              <CardContent className="flex h-32 items-center justify-center">
                <p className="text-muted-foreground">
                  Tidak ada pergerakan stok yang sesuai filter
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedMovements.map(([date, movements]) => (
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
                  {movements.map((movement) => {
                    const isExpanded = expandedItems.has(movement.id);

                    return (
                      <Card
                        key={movement.id}
                        className={`cursor-pointer border-l-4 transition-all hover:shadow-md ${getMovementColor(
                          movement.type,
                        )}`}
                        onClick={() => toggleExpand(movement.id)}
                      >
                        <CardContent className="p-4">
                          {/* Desktop Layout */}
                          <div className="hidden md:flex md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white">
                                {getMovementIcon(movement.type)}
                              </div>

                              {/* Info */}
                              <div className="flex-1">
                                <div className="mb-2 flex items-center gap-3">
                                  <span className="font-bold text-lg">
                                    {movement.type === "in"
                                      ? `+${movement.quantity}`
                                      : movement.type === "out"
                                        ? `-${movement.quantity}`
                                        : movement.quantity}{" "}
                                    stok{" "}
                                    {movement.type === "in"
                                      ? "masuk dari"
                                      : movement.type === "out"
                                        ? "keluar"
                                        : "transfer"}
                                  </span>
                                  <Badge variant="secondary">
                                    {movement.reason}
                                  </Badge>
                                </div>

                                <div className="space-y-1 text-sm text-gray-700">
                                  <div>
                                    <span className="font-medium">Produk:</span>{" "}
                                    {movement.product}
                                  </div>
                                  {movement.type === "transfer" ? (
                                    <div>
                                      <span className="font-medium">
                                        Transfer:
                                      </span>{" "}
                                      {movement.fromOutlet} → {movement.toOutlet}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-medium">Outlet:</span>{" "}
                                      {movement.outlet}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Oleh:</span>{" "}
                                    {movement.actor} ({movement.actorRole}) •{" "}
                                    {movement.timestamp.toLocaleTimeString(
                                      "id-ID",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </div>
                                  {movement.notes && (
                                    <div>
                                      <span className="font-medium">
                                        Catatan:
                                      </span>{" "}
                                      {movement.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expand Icon */}
                            {movement.notes && (
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
                              {getMovementIcon(movement.type)}
                              <span className="font-bold">
                                {movement.type === "in"
                                  ? `+${movement.quantity}`
                                  : movement.type === "out"
                                    ? `-${movement.quantity}`
                                    : movement.quantity}{" "}
                                {movement.type === "in"
                                  ? "Masuk"
                                  : movement.type === "out"
                                    ? "Keluar"
                                    : "Transfer"}
                              </span>
                            </div>

                            <div className="space-y-1 text-sm">
                              <div className="font-medium">{movement.product}</div>
                              {movement.type === "transfer" ? (
                                <div className="text-gray-600">
                                  {movement.fromOutlet} → {movement.toOutlet}
                                </div>
                              ) : (
                                <div className="text-gray-600">
                                  {movement.outlet}
                                </div>
                              )}
                              <div className="text-gray-600">
                                {movement.actor} •{" "}
                                {movement.timestamp.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              {movement.notes && (
                                <div className="mt-2 rounded bg-white/50 p-2 text-xs">
                                  {movement.notes}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
