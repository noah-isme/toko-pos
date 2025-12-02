"use client";

import {
  Search,
  Plus,
  Download,
  Filter,
  Settings2,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type ColumnVisibility = {
  name: boolean;
  sku: boolean;
  price: boolean;
  stock: boolean;
  supplier: boolean;
  discount: boolean;
  promo: boolean;
  tax: boolean;
};

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSupplier: string;
  onSupplierChange: (value: string) => void;
  stockFilter: "all" | "low";
  onStockFilterChange: (value: "all" | "low") => void;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  onAddProduct?: () => void;
  onExportCSV?: () => void;
  onOpenMobileFilter?: () => void;
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (columns: ColumnVisibility) => void;
  activeFilterCount?: number;
}

const defaultColumnVisibility: ColumnVisibility = {
  name: true,
  sku: true,
  price: true,
  stock: true,
  supplier: false,
  discount: false,
  promo: false,
  tax: false,
};

export function TableToolbar({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSupplier,
  onSupplierChange,
  stockFilter,
  onStockFilterChange,
  categories = [],
  suppliers = [],
  onAddProduct,
  onExportCSV,
  onOpenMobileFilter,
  columnVisibility = defaultColumnVisibility,
  onColumnVisibilityChange,
  activeFilterCount = 0,
}: TableToolbarProps) {
  const columnLabels: Record<keyof ColumnVisibility, string> = {
    name: "Nama",
    sku: "SKU",
    price: "Harga",
    stock: "Stok",
    supplier: "Supplier",
    discount: "Diskon",
    promo: "Promo",
    tax: "PPN",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange({
        ...columnVisibility,
        [column]: !columnVisibility[column],
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop Toolbar */}
      <div className="hidden md:flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier Filter */}
        <Select value={selectedSupplier} onValueChange={onSupplierChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Supplier</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stock Filter */}
        <Select
          value={stockFilter}
          onValueChange={(value: "all" | "low") => onStockFilterChange(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stok" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Stok</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
          </SelectContent>
        </Select>

        {/* Column Visibility */}
        {onColumnVisibilityChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Kolom
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                Tampilkan Kolom
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(columnVisibility).map(([key, value]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={value}
                  onCheckedChange={() =>
                    toggleColumn(key as keyof ColumnVisibility)
                  }
                >
                  {columnLabels[key as keyof ColumnVisibility]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Export CSV */}
        {onExportCSV && (
          <Button variant="outline" onClick={onExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Ekspor CSV
          </Button>
        )}

        {/* Add Product */}
        {onAddProduct && (
          <Button onClick={onAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Produk
          </Button>
        )}
      </div>

      {/* Mobile Toolbar */}
      <div className="flex md:hidden items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Button */}
        {onOpenMobileFilter && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenMobileFilter}
            className="relative shrink-0"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Add Product */}
        {onAddProduct && (
          <Button size="icon" onClick={onAddProduct} className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
