# 📋 Premium Product Management UI - Documentation

## 🎯 Overview

Implementasi **Enterprise-grade Product Management UI** dengan desain modern, intuitif, dan mobile-friendly. Sistem ini dirancang untuk memberikan pengalaman pengelolaan produk yang cepat dan efisien.

---

## 🏗️ Struktur Komponen

```
src/components/products/
├── product-detail-drawer.tsx    # Drawer detail produk (premium)
├── filter-bottom-sheet.tsx      # Filter sheet mobile-friendly
├── premium-product-table.tsx    # Tabel enterprise modern
├── table-toolbar.tsx            # Toolbar dengan filter & actions
└── index.ts                     # Export barrel
```

---

## 1️⃣ Product Detail Drawer

### 📐 Spesifikasi

**Desktop:**
- Width: 520px
- Side: Right
- Scrollable content
- Sticky header & footer

**Mobile:**
- Fullscreen sheet
- Swipe to close
- Touch-optimized

### 🎨 Fitur UI

#### Header
- Nama produk (bold, 18px)
- Status badge (Aktif/Nonaktif)
- Kategori (muted text)

#### Content Sections

1. **Product Image**
   - Aspect ratio 1:1
   - Placeholder icon jika kosong
   - Full width, rounded corners

2. **Informasi Dasar**
   - Nama produk
   - Kategori
   - Deskripsi (opsional)

3. **Identitas SKU**
   - SKU (monospace font)
   - Barcode + tombol "Scan ulang"
   - Satuan

4. **Harga & Pajak**
   - Harga jual (bold, besar)
   - Harga pokok
   - Status pajak PPN
   - Margin estimasi (warna hijau)

5. **Promo Aktif** (jika ada)
   - Card dengan warna amber
   - Icon alert
   - Nama promo + persentase diskon
   - Periode promo

6. **Stok Per Outlet**
   - Card per outlet
   - Quantity (angka besar, bold)
   - Status badge (Low/Normal/Belum Diatur)
   - Tombol "Atur Min Stock" (jika belum diatur)

7. **Riwayat Terakhir**
   - Maksimal 3 movement terakhir
   - Icon per tipe (in/out/transfer)
   - Tanggal + deskripsi
   - Actor name
   - Link "Lihat seluruh pergerakan stok"

#### Footer Actions
- **Edit Produk** (primary button)
- **Duplikasi** (outline button)
- **Arsipkan** (outline button)
- **Hapus** (ghost button, merah, icon only)

### 🔧 Props

```typescript
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
```

### 💡 Best Practices

- **Lazy loading**: Hanya load data detail saat drawer dibuka
- **Optimistic updates**: Update UI langsung, rollback jika error
- **Keyboard shortcuts**: ESC untuk close, Enter untuk edit
- **Animation**: Smooth slide-in/out transition

---

## 2️⃣ Filter Bottom Sheet (Mobile)

### 📐 Spesifikasi

- Height: 85vh
- Position: Bottom
- Thumb indicator untuk drag
- Scrollable content
- Sticky header & footer

### 🎨 Fitur Filter

#### 1. Kata Kunci
- Input dengan icon search
- Real-time filtering
- Clear button

#### 2. Kategori
- Select dropdown
- "Semua kategori" option
- Dynamic list dari API

#### 3. Supplier
- Select dropdown
- "Semua supplier" option
- Dynamic list dari API

#### 4. Stok
- Radio group
  - ○ Semua stok
  - ○ Low stock saja

#### 5. Sortir
- Radio group
  - ○ Nama A–Z
  - ○ Harga: Terendah
  - ○ Harga: Tertinggi
  - ○ Stok: Terendah

#### 6. Tampilkan Kolom
- Checkbox list
  - ☑ Nama
  - ☑ SKU
  - ☑ Harga
  - ☑ Stok
  - ☐ Supplier
  - ☐ Diskon
  - ☐ Promo
  - ☐ PPN

### 🔧 Props

```typescript
interface FilterBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
}

type FilterState = {
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
```

### 💡 Best Practices

- **Local state**: Filter changes tidak langsung apply
- **Apply button**: Batch updates untuk performance
- **Reset button**: Kembalikan ke default
- **Persistent**: Simpan di localStorage

---

## 3️⃣ Premium Product Table

### 📐 Spesifikasi

**Desktop:**
- Row height: 52-56px
- Hover effect: bg-muted/30
- Grouped columns: Nama + Kategori

**Mobile:**
- Tidak ditampilkan
- Diganti dengan card list

### 🎨 Kolom Tabel

#### 1. Nama & Kategori (35% width)
```
Air Mineral 600ml     ← Nama (bold)
Minuman              ← Kategori (muted, small)
```

#### 2. SKU
- Monospace font
- Small size

#### 3. Harga
- Bold, medium size
- Format: Rp 4.500

#### 4. Stok
- Bold, large size
- Warna: Oranye (low) / Default (normal) / Muted (unset)

#### 5. Status
- Badge dengan dot indicator
- Colors:
  - **Low**: Orange background, orange border
  - **Normal**: Green background, green border
  - **Belum Diatur**: Gray background, gray border

#### 6. Aksi (⋯)
- Opacity 0 by default
- Opacity 100 on row hover
- Dropdown menu:
  - Edit Produk
  - Atur Min Stock
  - Pergerakan Stok
  - Promo (jika ada)
  - Supplier (jika ada)
  - ───
  - Hapus (merah)

### 🔧 Props

```typescript
interface PremiumProductTableProps {
  products: ProductTableRow[];
  onEdit?: (product: ProductTableRow) => void;
  onSetMinStock?: (product: ProductTableRow) => void;
  onViewMovement?: (product: ProductTableRow) => void;
  onViewPromo?: (product: ProductTableRow) => void;
  onViewSupplier?: (product: ProductTableRow) => void;
  onDelete?: (product: ProductTableRow) => void;
  onRowClick?: (product: ProductTableRow) => void;
  visibleColumns?: ColumnVisibility;
}
```

### 💡 Best Practices

- **Virtual scrolling**: Untuk list > 100 items
- **Skeleton loading**: Tampilkan skeleton saat loading
- **Empty state**: Icon + message yang jelas
- **Row animation**: Staggered fade-in (delay: index * 0.02s)

---

## 4️⃣ Table Toolbar

### 📐 Spesifikasi

**Desktop:**
- Single row layout
- Left: Search + Filters
- Right: Actions

**Mobile:**
- Search + Filter button + Add button
- Compact layout

### 🎨 Komponen

#### Desktop

1. **Search Input** (flex-1, max-w-sm)
   - Icon: Search
   - Placeholder: "Cari produk..."

2. **Category Select** (w-180px)
   - Semua Kategori
   - Dynamic list

3. **Supplier Select** (w-180px)
   - Semua Supplier
   - Dynamic list

4. **Stock Filter** (w-140px)
   - Semua Stok
   - Low Stock

5. **Column Selector** (Dropdown)
   - Icon: Settings2
   - Label: "Kolom"
   - Checkbox list untuk show/hide kolom

6. **Ekspor CSV** (Button outline)
   - Icon: Download

7. **Tambah Produk** (Button primary)
   - Icon: Plus

#### Mobile

1. **Search Input** (flex-1)
2. **Filter Button** (icon only)
   - Badge dengan jumlah active filter
3. **Add Button** (icon only)

### 🔧 Props

```typescript
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
```

---

## 🎨 Design System

### Colors

```typescript
// Status Colors
const STATUS_COLORS = {
  low: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500'
  },
  normal: {
    bg: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-500/20',
    dot: 'bg-green-500'
  },
  unset: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/20',
    dot: 'bg-gray-400'
  }
};

// Section Headers
const SECTION_HEADER = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide';

// Data Labels
const DATA_LABEL = 'text-sm text-muted-foreground';
const DATA_VALUE = 'text-sm font-medium';
```

### Spacing

```typescript
// Drawer Padding
const DRAWER_PADDING = {
  header: 'px-6 py-4',
  content: 'px-6 py-5',
  footer: 'px-6 py-4',
  section: 'space-y-6'
};

// Table
const TABLE_SPACING = {
  row: 'py-4',
  cell: 'px-4',
  height: 'min-h-[52px]'
};
```

### Typography

```typescript
// Drawer
title: 'text-lg font-semibold',
sectionHeader: 'text-xs font-semibold uppercase',
label: 'text-sm text-muted-foreground',
value: 'text-sm font-medium',
price: 'text-base font-semibold',
margin: 'text-sm font-semibold text-green-600',

// Table
productName: 'font-medium text-sm',
categoryName: 'text-xs text-muted-foreground',
sku: 'font-mono text-sm',
price: 'font-semibold text-sm',
stock: 'font-bold text-lg'
```

---

## 🔄 Data Flow

### 1. Load Products

```typescript
// Page load
const productsQuery = api.products.list.useQuery({ search });
const categoriesQuery = api.products.categories.useQuery();
const suppliersQuery = api.products.suppliers.useQuery();
const lowStockQuery = api.inventory.listLowStock.useQuery({
  outletId: currentOutlet?.id,
  limit: 100
});
```

### 2. Transform Data

```typescript
// Transform products to table rows
const tableRows = useMemo(() => {
  return products.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category?.name || "Tanpa Kategori",
    sku: product.sku,
    price: product.price,
    stock: calculateTotalStock(product.id),
    status: determineStockStatus(product.id),
    supplier: product.supplier?.name,
    discount: product.defaultDiscountPercent,
    promo: product.promoName,
    taxRate: product.isTaxable ? product.taxRate : undefined
  }));
}, [products, inventoryRecords, lowStockAlerts]);
```

### 3. Filter & Sort

```typescript
const filteredProducts = useMemo(() => {
  let result = [...tableRows];
  
  // Apply filters
  if (filters.categoryId !== "all") {
    result = result.filter(/* category filter */);
  }
  
  if (filters.supplierId !== "all") {
    result = result.filter(/* supplier filter */);
  }
  
  if (filters.stockFilter === "low") {
    result = result.filter(p => p.status === "low");
  }
  
  // Apply sorting
  switch (filters.sortBy) {
    case "name-asc":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-low":
      result.sort((a, b) => a.price - b.price);
      break;
    // ... other sorts
  }
  
  return result;
}, [tableRows, filters]);
```

### 4. Row Click → Drawer

```typescript
const handleRowClick = (row: ProductTableRow) => {
  // 1. Find full product data
  const product = products.find(p => p.id === row.id);
  
  // 2. Transform to ProductDetail
  const productDetail: ProductDetail = {
    // ... map all fields
    inventory: inventoryRecords.filter(inv => inv.productId === product.id),
    recentMovements: [] // Fetch if needed
  };
  
  // 3. Open drawer
  setSelectedProduct(productDetail);
  setIsDrawerOpen(true);
};
```

---

## 📱 Responsive Behavior

### Desktop (≥ 768px)

- ✅ Premium table visible
- ✅ Full toolbar with all filters
- ✅ Drawer slides from right (520px width)
- ✅ Hover effects on rows
- ✅ Column visibility toggle

### Mobile (< 768px)

- ❌ Table hidden
- ✅ Compact toolbar (search + filter + add)
- ✅ Filter bottom sheet
- ✅ Drawer fullscreen
- ✅ Touch-optimized buttons

---

## 🚀 Performance Optimization

### 1. Memoization

```typescript
// Memoize expensive computations
const tableRows = useMemo(() => transformProducts(products), [products]);
const filteredProducts = useMemo(() => filterAndSort(tableRows, filters), [tableRows, filters]);
const lowStockMap = useMemo(() => createLowStockMap(alerts), [alerts]);
```

### 2. Lazy Loading

```typescript
// Only fetch inventory when drawer opens
const inventoryQuery = api.products.getInventoryByProduct.useQuery(
  { productId: selectedProduct?.id ?? "" },
  { enabled: Boolean(selectedProduct?.id) }
);
```

### 3. Debounced Search

```typescript
// Debounce search input
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const productsQuery = api.products.list.useQuery({ 
  search: debouncedSearch 
});
```

### 4. Virtual Scrolling (Future)

```typescript
// For large datasets (> 500 items)
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: filteredProducts.length,
  getScrollElement: () => tableRef.current,
  estimateSize: () => 56,
});
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] Filter logic (category, supplier, stock, sort)
- [ ] Data transformation (products → table rows)
- [ ] Stock status calculation
- [ ] Currency formatting
- [ ] Date formatting

### Integration Tests

- [ ] Toolbar filter interactions
- [ ] Table row click → drawer open
- [ ] Drawer actions (edit, duplicate, archive, delete)
- [ ] Filter sheet apply/reset
- [ ] Column visibility toggle

### E2E Tests

- [ ] Search products
- [ ] Filter by category + supplier
- [ ] Sort by price ascending/descending
- [ ] View product detail
- [ ] Edit product from drawer
- [ ] Set min stock from drawer
- [ ] Export CSV
- [ ] Add new product

### Responsive Tests

- [ ] Desktop: All filters visible
- [ ] Mobile: Filter button shows count
- [ ] Mobile: Bottom sheet opens/closes
- [ ] Drawer: Right side (desktop) vs fullscreen (mobile)
- [ ] Touch interactions work smoothly

---

## 🎯 Future Enhancements

### Phase 2
- [ ] Bulk actions (select multiple products)
- [ ] Quick edit mode (inline editing)
- [ ] Product comparison view
- [ ] Advanced filters (price range, date added)
- [ ] Saved filter presets

### Phase 3
- [ ] Real-time updates (WebSocket)
- [ ] Barcode scanner integration
- [ ] Image upload with crop/resize
- [ ] Product variants/SKU matrix
- [ ] Import products from CSV/Excel

### Phase 4
- [ ] AI-powered product suggestions
- [ ] Auto-categorization
- [ ] Smart reordering alerts
- [ ] Price optimization recommendations
- [ ] Demand forecasting

---

## 📚 References

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Framer Motion API](https://www.framer.com/motion)
- [React Query Best Practices](https://tanstack.com/query/latest)

---

## 🤝 Contributing

Jika ingin menambahkan fitur atau memperbaiki bug:

1. Pastikan mengikuti design system yang ada
2. Tambahkan unit test untuk logic baru
3. Update dokumentasi ini
4. Test di berbagai screen sizes
5. Pastikan aksesibilitas (keyboard navigation, screen reader)

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Maintainer:** Development Team