"use client";

import {
  MoreVertical,
  Edit,
  Settings,
  TrendingUp,
  Trash2,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StockStatus = "low" | "normal" | "unset" | "out";

export type ProductTableRow = {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
  status: StockStatus;
  supplier?: string;
  discount?: number;
  promo?: string;
  taxRate?: number;
};

interface PremiumProductTableProps {
  products: ProductTableRow[];
  onEdit?: (product: ProductTableRow) => void;
  onSetMinStock?: (product: ProductTableRow) => void;
  onViewMovement?: (product: ProductTableRow) => void;
  onViewPromo?: (product: ProductTableRow) => void;
  onViewSupplier?: (product: ProductTableRow) => void;
  onDelete?: (product: ProductTableRow) => void;
  onRowClick?: (product: ProductTableRow) => void;
  visibleColumns?: {
    name: boolean;
    sku: boolean;
    price: boolean;
    stock: boolean;
    supplier: boolean;
    discount: boolean;
    promo: boolean;
    tax: boolean;
  };
}

const defaultVisibleColumns = {
  name: true,
  sku: true,
  price: true,
  stock: true,
  supplier: false,
  discount: false,
  promo: false,
  tax: false,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const StockStatusBadge = ({ status }: { status: StockStatus }) => {
  const config = {
    low: {
      variant: "destructive" as const,
      label: "Low Stock",
      className:
        "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    },
    normal: {
      variant: "default" as const,
      label: "Normal",
      className:
        "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    },
    unset: {
      variant: "secondary" as const,
      label: "Belum Diatur",
      className:
        "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    },
    out: {
      variant: "destructive" as const,
      label: "Habis",
      className:
        "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label}
    </Badge>
  );
};

export function PremiumProductTable({
  products,
  onEdit,
  onSetMinStock,
  onViewMovement,
  onViewPromo,
  onViewSupplier,
  onDelete,
  onRowClick,
  visibleColumns = defaultVisibleColumns,
}: PremiumProductTableProps) {
  return (
    <div className="relative rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            {visibleColumns.name && (
              <TableHead className="w-[35%] font-semibold">
                Nama & Kategori
              </TableHead>
            )}
            {visibleColumns.sku && (
              <TableHead className="font-semibold">SKU</TableHead>
            )}
            {visibleColumns.price && (
              <TableHead className="font-semibold">Harga</TableHead>
            )}
            {visibleColumns.stock && (
              <TableHead className="font-semibold">Stok</TableHead>
            )}
            {visibleColumns.supplier && (
              <TableHead className="font-semibold">Supplier</TableHead>
            )}
            {visibleColumns.discount && (
              <TableHead className="font-semibold">Diskon</TableHead>
            )}
            {visibleColumns.promo && (
              <TableHead className="font-semibold">Promo</TableHead>
            )}
            {visibleColumns.tax && (
              <TableHead className="font-semibold">PPN</TableHead>
            )}
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-20 font-semibold">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Package className="w-10 h-10 text-muted-foreground/40" />
                  <p>Tidak ada produk ditemukan</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product, index) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="group cursor-pointer border-b border-border/40 hover:bg-muted/30 transition-colors"
                onClick={() => onRowClick?.(product)}
              >
                {/* Nama & Kategori */}
                {visibleColumns.name && (
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm leading-tight">
                        {product.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {product.category}
                      </span>
                    </div>
                  </TableCell>
                )}

                {/* SKU */}
                {visibleColumns.sku && (
                  <TableCell className="py-4">
                    <span className="font-mono text-sm">{product.sku}</span>
                  </TableCell>
                )}

                {/* Harga */}
                {visibleColumns.price && (
                  <TableCell className="py-4">
                    <span className="font-semibold text-sm">
                      {formatCurrency(product.price)}
                    </span>
                  </TableCell>
                )}

                {/* Stok */}
                {visibleColumns.stock && (
                  <TableCell className="py-4">
                    <span
                      className={`font-bold text-lg ${
                        product.status === "out"
                          ? "text-red-600"
                          : product.status === "low"
                            ? "text-orange-600"
                            : product.status === "normal"
                              ? "text-foreground"
                              : "text-muted-foreground"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                )}

                {/* Supplier */}
                {visibleColumns.supplier && (
                  <TableCell className="py-4">
                    <span className="text-sm">{product.supplier || "-"}</span>
                  </TableCell>
                )}

                {/* Diskon */}
                {visibleColumns.discount && (
                  <TableCell className="py-4">
                    {product.discount ? (
                      <Badge variant="secondary" className="font-medium">
                        {product.discount}%
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}

                {/* Promo */}
                {visibleColumns.promo && (
                  <TableCell className="py-4">
                    {product.promo ? (
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {product.promo}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}

                {/* PPN */}
                {visibleColumns.tax && (
                  <TableCell className="py-4">
                    {product.taxRate ? (
                      <span className="text-sm">{product.taxRate}%</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Tanpa PPN
                      </span>
                    )}
                  </TableCell>
                )}

                {/* Status */}
                <TableCell className="py-4">
                  <StockStatusBadge status={product.status} />
                </TableCell>

                {/* Aksi */}
                <TableCell
                  className="py-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Produk
                        </DropdownMenuItem>
                      )}
                      {onSetMinStock && (
                        <DropdownMenuItem
                          onClick={() => onSetMinStock(product)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Atur Min Stock
                        </DropdownMenuItem>
                      )}
                      {onViewMovement && (
                        <DropdownMenuItem
                          onClick={() => onViewMovement(product)}
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Pergerakan Stok
                        </DropdownMenuItem>
                      )}
                      {onViewPromo && product.promo && (
                        <DropdownMenuItem onClick={() => onViewPromo(product)}>
                          <Package className="mr-2 h-4 w-4" />
                          Lihat Promo
                        </DropdownMenuItem>
                      )}
                      {onViewSupplier && product.supplier && (
                        <DropdownMenuItem
                          onClick={() => onViewSupplier(product)}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Info Supplier
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(product)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
