"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  AlertTriangle,
  ClipboardCheck,
  Package,
} from "lucide-react";

import { api } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Step = "select" | "count" | "review";

interface CountEntry {
  productId: string;
  productName: string;
  sku: string;
  systemQuantity: number;
  countedQuantity: string;
  note: string;
}

export default function StockOpnamePage() {
  const utils = api.useContext();
  const [step, setStep] = useState<Step>("select");
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [search, setSearch] = useState("");

  const outletsQuery = api.outlets.list.useQuery();
  const inventoryQuery = api.outlets.getStockSnapshot.useQuery(
    { outletId: selectedOutletId },
    { enabled: Boolean(selectedOutletId) },
  );

  const opnameMutation = api.outlets.performOpname.useMutation({
    onSuccess: (results) => {
      const adjusted = results.filter((r) => r.difference !== 0).length;
      toast.success(
        `Opname selesai — ${adjusted} produk disesuaikan dari ${results.length} total`,
      );
      void utils.outlets.getStockSnapshot.invalidate({
        outletId: selectedOutletId,
      });
      void utils.outlets.getStockSnapshot.invalidate();
      resetAll();
    },
    onError: (err) => {
      toast.error("Gagal menyimpan opname", { description: err.message });
    },
  });

  useEffect(() => {
    if (!selectedOutletId && outletsQuery.data?.length) {
      setSelectedOutletId(outletsQuery.data[0]!.id);
    }
  }, [outletsQuery.data, selectedOutletId]);

  // Build entries from inventory snapshot when entering count step
  const startCounting = useCallback(() => {
    if (!inventoryQuery.data) return;
    setEntries(
      inventoryQuery.data.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        systemQuantity: row.quantity,
        countedQuantity: "",
        note: "",
      })),
    );
    setSearch("");
    setStep("count");
  }, [inventoryQuery.data]);

  const resetAll = useCallback(() => {
    setEntries([]);
    setSearch("");
    setStep("select");
  }, []);

  const updateCountedQuantity = (productId: string, value: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.productId === productId ? { ...e, countedQuantity: value } : e,
      ),
    );
  };

  const updateNote = (productId: string, value: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.productId === productId ? { ...e, note: value } : e,
      ),
    );
  };

  // Quick-set: mark a row as counted with the system quantity (no difference)
  const markAsSystem = (productId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.productId === productId
          ? { ...e, countedQuantity: String(e.systemQuantity) }
          : e,
      ),
    );
  };

  // Bulk: mark all uncounted as system quantity
  const markAllAsSystem = () => {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        countedQuantity: e.countedQuantity || String(e.systemQuantity),
      })),
    );
  };

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.productName.toLowerCase().includes(q) ||
        e.sku.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const countedCount = entries.filter((e) => e.countedQuantity !== "").length;
  const allCounted = countedCount === entries.length;

  const reviewEntries = useMemo(
    () =>
      entries
        .map((e) => ({
          ...e,
          counted: parseInt(e.countedQuantity, 10) || 0,
        }))
        .map((e) => ({
          ...e,
          difference: e.counted - e.systemQuantity,
        })),
    [entries],
  );

  const itemsWithDifference = reviewEntries.filter((e) => e.difference !== 0);

  const handlePost = () => {
    const payload = entries.map((e) => ({
      productId: e.productId,
      countedQuantity: parseInt(e.countedQuantity, 10) || 0,
      note: e.note.trim() || undefined,
    }));

    opnameMutation.mutate({
      outletId: selectedOutletId,
      entries: payload,
    });
  };

  // ---- Step: Select Outlet ----
  if (step === "select") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Stock Opname</h1>
            <p className="text-muted-foreground mt-1">
              Hitung stok fisik dan rekonsiliasi dengan catatan sistem.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Pilih Outlet</CardTitle>
              <CardDescription>
                Pilih outlet yang akan dilakukan stock opname.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {outletsQuery.isLoading && (
                <div className="flex items-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memuat daftar outlet...
                </div>
              )}

              <div className="grid gap-2">
                {outletsQuery.data?.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => setSelectedOutletId(outlet.id)}
                    className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                      selectedOutletId === outlet.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{outlet.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {outlet.code}
                        {outlet.address ? ` • ${outlet.address}` : ""}
                      </div>
                    </div>
                    {selectedOutletId === outlet.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {selectedOutletId && (
                <>
                  {inventoryQuery.isLoading && (
                    <div className="flex items-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memuat stok saat ini...
                    </div>
                  )}
                  {inventoryQuery.data && (
                    <div className="rounded-lg bg-muted/50 p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {inventoryQuery.data.length} produk terdaftar di
                          outlet ini
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={startCounting}
                  disabled={!selectedOutletId || !inventoryQuery.data?.length}
                >
                  Mulai Opname
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Step: Count ----
  if (step === "count") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep("select")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Hitung Stok Fisik</h1>
                  <p className="text-sm text-muted-foreground">
                    {outletsQuery.data?.find((o) => o.id === selectedOutletId)
                      ?.name ?? ""}{" "}
                    • {countedCount}/{entries.length} produk dihitung
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllAsSystem}>
                  Tandai Semua Sesuai Sistem
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${entries.length > 0 ? (countedCount / entries.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Sistem</TableHead>
                  <TableHead className="text-right">Hitung Fisik</TableHead>
                  <TableHead className="text-center w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const counted = entry.countedQuantity;
                  const isCounted = counted !== "";
                  const diff =
                    isCounted
                      ? (parseInt(counted, 10) || 0) - entry.systemQuantity
                      : null;

                  return (
                    <TableRow key={entry.productId}>
                      <TableCell className="font-medium">
                        {entry.productName}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {entry.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.systemQuantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          value={counted}
                          onChange={(e) =>
                            updateCountedQuantity(entry.productId, e.target.value)
                          }
                          placeholder="—"
                          className={`ml-auto w-24 text-right ${
                            isCounted && diff !== null && diff !== 0
                              ? "border-amber-400 bg-amber-50"
                              : ""
                          }`}
                        />
                        {isCounted && diff !== null && diff !== 0 && (
                          <span className="mt-1 block text-xs font-medium text-amber-600">
                            {diff > 0 ? `+${diff}` : diff} selisih
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsSystem(entry.productId)}
                          title="Sesuaikan dengan qty sistem"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada produk yang cocok dengan pencarian.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {countedCount} dari {entries.length} produk telah dihitung
            </p>
            <Button
              onClick={() => setStep("review")}
              disabled={!allCounted}
            >
              {allCounted ? (
                <>
                  Tinjau Selisih
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                `Sisa ${entries.length - countedCount} produk`
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step: Review ----
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep("count")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Tinjauan Selisih</h1>
              <p className="text-sm text-muted-foreground">
                {outletsQuery.data?.find((o) => o.id === selectedOutletId)
                  ?.name ?? ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Produk</div>
              <div className="text-2xl font-bold">{reviewEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Ada Selisih</div>
              <div className="text-2xl font-bold text-amber-600">
                {itemsWithDifference.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Sesuai Sistem</div>
              <div className="text-2xl font-bold text-green-600">
                {reviewEntries.length - itemsWithDifference.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items with difference */}
        {itemsWithDifference.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Produk dengan Selisih
              </CardTitle>
              <CardDescription>
                Perubahan stok akan dicatat sebagai StockMovement ADJUSTMENT.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Sistem</TableHead>
                    <TableHead className="text-right">Fisik</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsWithDifference.map((entry) => (
                    <TableRow key={entry.productId}>
                      <TableCell className="font-medium">
                        {entry.productName}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {entry.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.systemQuantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.counted}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            entry.difference > 0
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {entry.difference > 0 ? `+${entry.difference}` : entry.difference}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.note}
                          onChange={(e) =>
                            updateNote(entry.productId, e.target.value)
                          }
                          placeholder="Alasan selisih..."
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All matched */}
        {itemsWithDifference.length === 0 && (
          <Card className="p-8 text-center">
            <Check className="mx-auto h-10 w-10 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">Semua Stok Sesuai</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak ada selisih antara stok fisik dan sistem.
            </p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("count")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Hitung
          </Button>
          <Button
            onClick={handlePost}
            disabled={opnameMutation.isPending}
          >
            {opnameMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Posting Opname
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
