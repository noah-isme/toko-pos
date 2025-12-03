"use client";

import { useState } from "react";
import {
  Package,
  Camera,
  Edit,
  Copy,
  Archive,
  Trash2,
  TrendingUp,
  AlertCircle,
  Settings,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StockStatus = "low" | "normal" | "unset" | "out";

type InventoryRecord = {
  outletId: string;
  outletName: string;
  quantity: number;
  minStock: number;
  status: StockStatus;
};

type PromoInfo = {
  name: string;
  discount: number;
  startDate: string;
  endDate: string;
};

type StockMovement = {
  id: string;
  date: string;
  type: "in" | "out" | "transfer";
  quantity: number;
  description: string;
  actor: string;
};

export type ProductDetail = {
  id: string;
  name: string;
  category: string;
  description?: string;
  sku: string;
  barcode?: string;
  unit: string;
  price: number;
  costPrice: number;
  taxType: string;
  margin: number;
  isActive: boolean;
  imageUrl?: string;
  promo?: PromoInfo;
  inventory: InventoryRecord[];
  recentMovements: StockMovement[];
};

interface ProductDetailDrawerProps {
  product: ProductDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: ProductDetail) => void;
  onDuplicate?: (product: ProductDetail) => void;
  onArchive?: (product: ProductDetail) => void;
  onDelete?: (product: ProductDetail) => void;
  onSetMinStock?: (outletId: string, productId: string) => void;
  onViewStockHistory?: (productId: string) => void;
  onRescanBarcode?: (productId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDate = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(d);
};

const StockStatusIndicator = ({ status }: { status: StockStatus }) => {
  const config = {
    low: { color: "text-orange-500", bg: "bg-orange-500/10", label: "Low" },
    normal: { color: "text-green-500", bg: "bg-green-500/10", label: "Normal" },
    unset: {
      color: "text-gray-400",
      bg: "bg-gray-400/10",
      label: "Belum Diatur",
    },
    out: {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Habis",
    },
  };

  const { color, bg, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${bg} ${color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${color === "text-orange-500" ? "bg-orange-500" : color === "text-green-500" ? "bg-green-500" : "bg-gray-400"}`}
      />
      {label}
    </span>
  );
};

const MovementIcon = ({ type }: { type: "in" | "out" | "transfer" }) => {
  if (type === "in") {
    return (
      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
        <TrendingUp className="w-4 h-4 text-green-600" />
      </div>
    );
  }
  if (type === "out") {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
        <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
      <ExternalLink className="w-4 h-4 text-blue-600" />
    </div>
  );
};

export function ProductDetailDrawer({
  product,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onSetMinStock,
  onViewStockHistory,
  onRescanBarcode,
}: ProductDetailDrawerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!product) return null;

  const handleDelete = () => {
    onDelete?.(product);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[520px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle className="text-lg font-semibold truncate">
                    {product.name}
                  </SheetTitle>
                  <Badge
                    variant={product.isActive ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {product.category}
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-6">
              {/* Product Image */}
              {product.imageUrl ? (
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-20 h-20 text-muted-foreground/40" />
                </div>
              )}

              {/* INFORMASI DASAR */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Informasi Dasar
                </h3>
                <dl className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Nama</dt>
                    <dd className="font-medium text-right">{product.name}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Kategori</dt>
                    <dd className="font-medium text-right">
                      {product.category}
                    </dd>
                  </div>
                  {product.description && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Deskripsi</dt>
                      <dd className="font-medium text-right">
                        {product.description}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* IDENTITAS SKU */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Identitas SKU
                </h3>
                <dl className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-mono font-medium">{product.sku}</dd>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <dt className="text-muted-foreground">Barcode</dt>
                    <dd className="flex items-center gap-2">
                      {product.barcode ? (
                        <>
                          <span className="font-mono font-medium">
                            {product.barcode}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onRescanBarcode?.(product.id)}
                          >
                            <Camera className="w-3 h-3 mr-1" />
                            Scan ulang
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Satuan</dt>
                    <dd className="font-medium">{product.unit}</dd>
                  </div>
                </dl>
              </section>

              {/* HARGA & PAJAK */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Harga & Pajak
                </h3>
                <dl className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Harga Jual</dt>
                    <dd className="font-semibold text-base">
                      {formatCurrency(product.price)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Harga Pokok</dt>
                    <dd className="font-medium">
                      {formatCurrency(product.costPrice)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Pajak PPN</dt>
                    <dd className="font-medium">{product.taxType}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Margin (estimasi)</dt>
                    <dd className="font-semibold text-green-600">
                      {product.margin}%
                    </dd>
                  </div>
                </dl>
              </section>

              {/* PROMO AKTIF */}
              {product.promo && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Promo Aktif
                  </h3>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          {product.promo.name} – {product.promo.discount}%
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Periode: {formatDate(product.promo.startDate)} –{" "}
                          {formatDate(product.promo.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* STOK PER OUTLET */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Stok Per Outlet
                </h3>
                <div className="space-y-2">
                  {product.inventory.length > 0 ? (
                    product.inventory.map((inv) => (
                      <div
                        key={inv.outletId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {inv.outletName}
                            </span>
                            <StockStatusIndicator status={inv.status} />
                          </div>
                          <p className="text-2xl font-bold">{inv.quantity}</p>
                        </div>
                        {inv.status === "unset" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onSetMinStock?.(inv.outletId, product.id)
                            }
                          >
                            <Settings className="w-3 h-3 mr-1.5" />
                            Atur Min Stock
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Belum ada data stok
                    </p>
                  )}
                </div>
              </section>

              {/* RIWAYAT TERAKHIR */}
              {product.recentMovements.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Riwayat Terakhir
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {product.recentMovements.slice(0, 3).map((movement) => (
                      <div
                        key={movement.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <MovementIcon type={movement.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {formatDate(movement.date)} •{" "}
                            {movement.quantity > 0 ? "+" : ""}
                            {movement.quantity} {movement.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {movement.actor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {onViewStockHistory && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3"
                      onClick={() => onViewStockHistory(product.id)}
                    >
                      Lihat seluruh pergerakan stok
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  )}
                </section>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-background">
            <div className="flex items-center gap-2">
              <Button onClick={() => onEdit?.(product)} className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit Produk
              </Button>
              <Button variant="outline" onClick={() => onDuplicate?.(product)}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => onArchive?.(product)}>
                <Archive className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <strong>{product.name}</strong> akan dihapus secara
              permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
