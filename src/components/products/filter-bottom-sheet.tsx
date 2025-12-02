"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FilterState = {
  search: string;
  categoryId: string;
  supplierId: string;
  stockFilter: "all" | "low";
  sortBy: "name-asc" | "price-low" | "price-high" | "stock-low";
  visibleColumns: {
    name: boolean;
    sku: boolean;
    price: boolean;
    stock: boolean;
    supplier: boolean;
    discount: boolean;
    promo: boolean;
    tax: boolean;
  };
};

interface FilterBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
}

const defaultFilters: FilterState = {
  search: "",
  categoryId: "all",
  supplierId: "all",
  stockFilter: "all",
  sortBy: "name-asc",
  visibleColumns: {
    name: true,
    sku: true,
    price: true,
    stock: true,
    supplier: false,
    discount: false,
    promo: false,
    tax: false,
  },
};

export function FilterBottomSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  categories = [],
  suppliers = [],
}: FilterBottomSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateVisibleColumn = (column: keyof FilterState["visibleColumns"]) => {
    setLocalFilters((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [column]: !prev.visibleColumns[column],
      },
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Filter Produk
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Kata Kunci */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Kata Kunci
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari produk…"
                  value={localFilters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Kategori
              </Label>
              <Select
                value={localFilters.categoryId}
                onValueChange={(value) => updateFilter("categoryId", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-sm font-medium">
                Supplier
              </Label>
              <Select
                value={localFilters.supplierId}
                onValueChange={(value) => updateFilter("supplierId", value)}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Semua supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua supplier</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stok */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Stok</Label>
              <RadioGroup
                value={localFilters.stockFilter}
                onValueChange={(value: "all" | "low") =>
                  updateFilter("stockFilter", value)
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="stock-all" />
                  <Label
                    htmlFor="stock-all"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Semua stok
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="stock-low" />
                  <Label
                    htmlFor="stock-low"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Low stock saja
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Sortir */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Sortir</Label>
              <RadioGroup
                value={localFilters.sortBy}
                onValueChange={(
                  value: "name-asc" | "price-low" | "price-high" | "stock-low"
                ) => updateFilter("sortBy", value)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="name-asc" id="sort-name" />
                  <Label
                    htmlFor="sort-name"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Nama A–Z
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="price-low" id="sort-price-low" />
                  <Label
                    htmlFor="sort-price-low"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Harga: Terendah
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="price-high" id="sort-price-high" />
                  <Label
                    htmlFor="sort-price-high"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Harga: Tertinggi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stock-low" id="sort-stock-low" />
                  <Label
                    htmlFor="sort-stock-low"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Stok: Terendah
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tampilkan Kolom */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tampilkan Kolom</Label>
              <div className="space-y-2.5">
                {Object.entries(localFilters.visibleColumns).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    name: "Nama",
                    sku: "SKU",
                    price: "Harga",
                    stock: "Stok",
                    supplier: "Supplier",
                    discount: "Diskon",
                    promo: "Promo",
                    tax: "PPN",
                  };

                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${key}`}
                        checked={value}
                        onCheckedChange={() =>
                          updateVisibleColumn(
                            key as keyof FilterState["visibleColumns"]
                          )
                        }
                      />
                      <Label
                        htmlFor={`column-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {labels[key]}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t bg-background">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1"
            >
              Terapkan Filter
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
