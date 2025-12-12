"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProductDetailDrawer,
  type ProductDetail,
} from "@/components/products/product-detail-drawer";
import {
  FilterBottomSheet,
  type FilterState,
} from "@/components/products/filter-bottom-sheet";
import {
  PremiumProductTable,
  type ProductTableRow,
} from "@/components/products/premium-product-table";
import { TableToolbar } from "@/components/products/table-toolbar";

import { api } from "@/trpc/client";
import { useOutlet } from "@/lib/outlet-context";

export default function ProductManagementPage() {
  const router = useRouter();
  const { currentOutlet } = useOutlet();

  // State
  const [filters, setFilters] = useState<FilterState>({
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
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // API Queries
  const productsQuery = api.products.list.useQuery({ search: filters.search });
  const categoriesQuery = api.products.categories.useQuery();
  const suppliersQuery = api.products.suppliers.useQuery();

  const lowStockQuery = api.inventory.listLowStock.useQuery(
    { outletId: currentOutlet?.id ?? "", limit: 100 },
    { 
      enabled: Boolean(currentOutlet?.id), 
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Get all inventory data for current outlet
  const inventoryQuery = api.inventory.getAllInventory.useQuery(
    { outletId: currentOutlet?.id ?? "" },
    { 
      enabled: Boolean(currentOutlet?.id), 
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Debug logging
  console.log("🔍 DEBUG - Current Outlet:", currentOutlet);
  console.log("🔍 DEBUG - Inventory Query Status:", {
    isLoading: inventoryQuery.isLoading,
    isError: inventoryQuery.isError,
    error: inventoryQuery.error,
    dataLength: inventoryQuery.data?.length ?? 0,
  });
  console.log("🔍 DEBUG - Inventory Data:", inventoryQuery.data);

  const products = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const suppliers = useMemo(
    () => suppliersQuery.data ?? [],
    [suppliersQuery.data],
  );
  const lowStockAlerts = useMemo(
    () => lowStockQuery.data ?? [],
    [lowStockQuery.data],
  );

  // Create inventory map for quick lookup
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    (inventoryQuery.data ?? []).forEach((inv) => {
      map.set(inv.productId, inv.quantity);
    });
    console.log("🔍 DEBUG - Inventory Map:", Array.from(map.entries()));
    return map;
  }, [inventoryQuery.data]);

  // Low stock map
  const lowStockProductIds = useMemo(() => {
    return new Set(lowStockAlerts.map((alert) => alert.productId));
  }, [lowStockAlerts]);

  // Transform products to table rows
  const tableRows = useMemo((): ProductTableRow[] => {
    console.log("🔍 DEBUG - Building table rows...");
    console.log("🔍 DEBUG - Products count:", products.length);
    console.log("🔍 DEBUG - Inventory map size:", inventoryMap.size);

    const rows = products.map((product) => {
      const isLowStock = lowStockProductIds.has(product.id);
      // Get actual stock from inventory map
      const totalStock = inventoryMap.get(product.id) ?? 0;

      if (products.indexOf(product) < 3) {
        console.log(
          `🔍 DEBUG - Product: ${product.name}, ID: ${product.id}, Stock: ${totalStock}`,
        );
      }

      return {
        id: product.id,
        name: product.name,
        category: product.category || "Tanpa Kategori",
        sku: product.sku,
        price: product.price,
        stock: totalStock,
        status: (isLowStock
          ? "low"
          : product.minStock === 0
            ? "unset"
            : totalStock > product.minStock
              ? "normal"
              : totalStock === 0
                ? "out"
                : "low") as "low" | "normal" | "unset" | "out",
        supplier: product.supplier || undefined,
        discount: product.defaultDiscountPercent || undefined,
        promo: product.promoName || undefined,
        taxRate: product.isTaxable ? product.taxRate || undefined : undefined,
      };
    });

    console.log(
      "🔍 DEBUG - First 3 rows stock values:",
      rows.slice(0, 3).map((r) => ({ name: r.name, stock: r.stock })),
    );
    return rows;
  }, [products, lowStockProductIds, inventoryMap]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...tableRows];

    // Filter by category
    if (filters.categoryId !== "all") {
      result = result.filter((p) => {
        const product = products.find((prod) => prod.id === p.id);
        return product?.categoryId === filters.categoryId;
      });
    }

    // Filter by supplier
    if (filters.supplierId !== "all") {
      result = result.filter((p) => {
        const product = products.find((prod) => prod.id === p.id);
        return product?.supplierId === filters.supplierId;
      });
    }

    // Filter by stock status
    if (filters.stockFilter === "low") {
      result = result.filter((p) => p.status === "low");
    }

    // Sort
    switch (filters.sortBy) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "stock-low":
        result.sort((a, b) => a.stock - b.stock);
        break;
    }

    return result;
  }, [tableRows, filters, products]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId !== "all") count++;
    if (filters.supplierId !== "all") count++;
    if (filters.stockFilter === "low") count++;
    return count;
  }, [filters]);

  // Handlers
  const handleRowClick = useCallback(
    (row: ProductTableRow) => {
      const product = products.find((p) => p.id === row.id);
      if (!product) return;

      // Transform to ProductDetail
      const productDetail: ProductDetail = {
        id: product.id,
        name: product.name,
        category: product.category || "Tanpa Kategori",
        description: undefined,
        sku: product.sku,
        barcode: product.barcode || undefined,
        unit: "Pcs", // TODO: Get from product
        price: product.price,
        costPrice: product.costPrice || 0,
        taxType: product.isTaxable
          ? `PPN ${product.taxRate || 11}%`
          : "Tanpa PPN",
        margin: product.costPrice
          ? Math.round(
              ((product.price - product.costPrice) / product.price) * 100,
            )
          : 0,
        isActive: product.isActive,
        imageUrl: undefined,
        promo: product.promoName
          ? {
              name: product.promoName,
              discount: 5, // TODO: Get from promo
              startDate: product.promoStart || new Date().toISOString(),
              endDate: product.promoEnd || new Date().toISOString(),
            }
          : undefined,
        inventory: currentOutlet
          ? [
              {
                outletId: currentOutlet.id,
                outletName: currentOutlet.name,
                quantity: row.stock,
                minStock: product.minStock,
                status: row.status,
              },
            ]
          : [],
        recentMovements: [], // TODO: Add real movements
      };

      setSelectedProduct(productDetail);
      setIsDrawerOpen(true);
    },
    [products, currentOutlet],
  );

  const handleEdit = (product: ProductDetail | ProductTableRow) => {
    router.push(`/management/products/edit/${product.id}`);
  };

  const handleDuplicate = () => {
    toast.info("Fitur duplikasi akan segera hadir");
    setIsDrawerOpen(false);
  };

  const handleArchive = () => {
    toast.info("Fitur arsip akan segera hadir");
    setIsDrawerOpen(false);
  };

  const handleDelete = () => {
    toast.error("Fitur hapus akan segera hadir");
  };

  const handleSetMinStock = () => {
    toast.info("Dialog pengaturan min stock akan segera hadir");
  };

  const handleViewStockHistory = (productId: string) => {
    router.push(`/management/stock-movement?productId=${productId}`);
  };

  const handleRescanBarcode = () => {
    toast.info("Fitur scan barcode akan segera hadir");
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    toast.info("Ekspor CSV akan segera hadir");
  };

  const handleAddProduct = () => {
    router.push("/management/products/add");
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Produk
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola produk, stok, dan harga di semua outlet
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                {lowStockAlerts.length} Produk Low Stock
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Beberapa produk memerlukan restocking segera
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, stockFilter: "low" })}
              className="shrink-0"
            >
              Lihat Semua
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <TableToolbar
        search={filters.search}
        onSearchChange={(value) => setFilters({ ...filters, search: value })}
        selectedCategory={filters.categoryId}
        onCategoryChange={(value) =>
          setFilters({ ...filters, categoryId: value })
        }
        selectedSupplier={filters.supplierId}
        onSupplierChange={(value) =>
          setFilters({ ...filters, supplierId: value })
        }
        stockFilter={filters.stockFilter}
        onStockFilterChange={(value) =>
          setFilters({ ...filters, stockFilter: value })
        }
        categories={categories}
        suppliers={suppliers}
        onAddProduct={handleAddProduct}
        onExportCSV={handleExportCSV}
        onOpenMobileFilter={() => setIsFilterSheetOpen(true)}
        columnVisibility={filters.visibleColumns}
        onColumnVisibilityChange={(columns) =>
          setFilters({ ...filters, visibleColumns: columns })
        }
        activeFilterCount={activeFilterCount}
      />

      {/* Table */}
      <PremiumProductTable
        products={filteredProducts}
        onEdit={handleEdit}
        onSetMinStock={handleSetMinStock}
        onViewMovement={(product) => handleViewStockHistory(product.id)}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        visibleColumns={filters.visibleColumns}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={selectedProduct}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onEdit={() => selectedProduct && handleEdit(selectedProduct)}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onSetMinStock={() => handleSetMinStock()}
        onViewStockHistory={handleViewStockHistory}
        onRescanBarcode={() => handleRescanBarcode()}
      />

      {/* Filter Bottom Sheet (Mobile) */}
      <FilterBottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        suppliers={suppliers}
      />
    </div>
  );
}
