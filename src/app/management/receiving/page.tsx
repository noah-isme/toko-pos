"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  X,
  Truck,
  Check,
  Package,
} from "lucide-react";

import { api } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ReceiveItem {
  key: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  costPrice: string;
}

export default function ReceivingPage() {
  const utils = api.useContext();

  const outletsQuery = api.outlets.list.useQuery();
  const suppliersQuery = api.products.suppliers.useQuery();
  const productsQuery = api.products.list.useQuery({ take: 100 });

  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [success, setSuccess] = useState<{
    supplierName: string;
    invoiceNumber: string | null;
    items: Array<{
      productName: string;
      quantity: number;
      newStockLevel: number;
    }>;
  } | null>(null);

  const receiveMutation = api.outlets.receiveStock.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Penerimaan dari ${result.supplierName} berhasil — ${result.items.length} item diterima`,
      );
      setSuccess({
        supplierName: result.supplierName,
        invoiceNumber: result.invoiceNumber,
        items: result.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          newStockLevel: i.newStockLevel,
        })),
      });
      void utils.outlets.getStockSnapshot.invalidate();
      void utils.products.list.invalidate();
      resetForm();
    },
    onError: (err) => {
      toast.error("Gagal mencatat penerimaan", { description: err.message });
    },
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setInvoiceNumber("");
    setNotes("");
    setItems([]);
    setSelectedProductId("");
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }

    const product = productsQuery.data?.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Don't add duplicates
    if (items.some((i) => i.productId === selectedProductId)) {
      toast.error("Produk sudah ada di daftar");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        key: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: "1",
        costPrice: product.costPrice ? String(product.costPrice) : "0",
      },
    ]);
    setSelectedProductId("");
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: string, field: "quantity" | "costPrice", value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    );
  };

  const totalCost = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.costPrice) || 0;
    return sum + qty * price;
  }, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const handleSubmit = () => {
    if (!selectedOutletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }
    if (!selectedSupplierId) {
      toast.error("Pilih supplier terlebih dahulu");
      return;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal satu item");
      return;
    }

    const payload = items.map((item) => ({
      productId: item.productId,
      quantity: parseInt(item.quantity, 10) || 0,
      costPrice: parseFloat(item.costPrice) || 0,
    }));

    for (const item of payload) {
      if (item.quantity < 1) {
        toast.error("Jumlah minimal 1 untuk semua item");
        return;
      }
      if (item.costPrice < 0) {
        toast.error("Harga modal tidak boleh negatif");
        return;
      }
    }

    receiveMutation.mutate({
      outletId: selectedOutletId,
      supplierId: selectedSupplierId,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      items: payload,
    });
  };

  const availableProducts = productsQuery.data?.filter(
    (p) => !items.some((i) => i.productId === p.id),
  );

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Penerimaan Barang</h1>
            <p className="text-muted-foreground mt-1">
              Catat penerimaan stok dari supplier dengan referensi invoice.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Penerimaan Berhasil</CardTitle>
                  <CardDescription>
                    Supplier: {success.supplierName}
                    {success.invoiceNumber && ` • Invoice: ${success.invoiceNumber}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty Diterima</TableHead>
                    <TableHead className="text-right">Stok Sekarang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {success.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        +{item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.newStockLevel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button
                  onClick={() => setSuccess(null)}
                >
                  Penerimaan Baru
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Penerimaan Barang</h1>
          <p className="text-muted-foreground mt-1">
            Catat penerimaan stok dari supplier — stok masuk otomatis, harga modal
            diperbarui, dan StockMovement PURCHASE dicatat.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Detail Penerimaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Outlet</label>
                <Select
                  value={selectedOutletId}
                  onValueChange={setSelectedOutletId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outletsQuery.data?.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Supplier</label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersQuery.data?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nomor Invoice (opsional)</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: INV-2024-001"
                  className="mt-1"
                  maxLength={64}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan (opsional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="mt-1"
                  maxLength={500}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Diterima
            </CardTitle>
            <CardDescription>
              Pilih produk dan masukkan jumlah serta harga modal dari invoice supplier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add item row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk untuk ditambahkan" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={handleAddItem}
                disabled={!selectedProductId}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="w-36">Harga Modal</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const price = parseFloat(item.costPrice) || 0;
                    const subtotal = qty * price;

                    return (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.productSku}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.key, "quantity", e.target.value)
                            }
                            className="h-8 w-20 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.costPrice}
                            onChange={(e) =>
                              updateItem(item.key, "costPrice", e.target.value)
                            }
                            className="h-8 w-32 text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.key)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {items.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Belum ada item. Pilih produk di atas untuk menambahkan.
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <Badge variant="secondary">
                  {items.length} item • {items.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0)} unit
                </Badge>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Nilai Penerimaan</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(totalCost)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetForm} disabled={receiveMutation.isPending}>
            Reset
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              receiveMutation.isPending ||
              !selectedOutletId ||
              !selectedSupplierId ||
              items.length === 0
            }
          >
            {receiveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Catat Penerimaan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
