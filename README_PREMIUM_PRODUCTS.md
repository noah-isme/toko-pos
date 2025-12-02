# 🎨 Premium Product Management UI

Implementasi **Enterprise-Grade Product Management System** dengan desain modern, responsif, dan user-friendly untuk Toko POS.

---

## ✨ Fitur Utama

### 1. **Product Detail Drawer** 
Panel informasi produk yang lengkap dan mudah dibaca dengan animasi smooth slide-in dari kanan (desktop) atau fullscreen sheet (mobile).

**Fitur:**
- ✅ Informasi lengkap produk (nama, SKU, barcode, kategori)
- ✅ Breakdown harga (harga jual, harga pokok, margin, PPN)
- ✅ Status promo aktif dengan periode
- ✅ Stok per outlet dengan status indicator (Low/Normal/Belum Diatur)
- ✅ 3 riwayat pergerakan stok terakhir
- ✅ Quick actions: Edit, Duplikasi, Arsipkan, Hapus

### 2. **Filter Bottom Sheet (Mobile)**
Filter sheet yang thumb-friendly dengan semua opsi filter dalam satu tempat.

**Filter tersedia:**
- 🔍 Pencarian kata kunci
- 📁 Filter kategori
- 🏪 Filter supplier
- 📦 Filter stok (semua/low stock)
- ⬆️ Sort (nama, harga, stok)
- 👁️ Toggle visibilitas kolom

### 3. **Premium Product Table**
Tabel enterprise dengan grouping kolom yang smart dan hover effects.

**Kolom:**
- Nama & Kategori (grouped dalam satu kolom)
- SKU (monospace font)
- Harga (format currency)
- Stok (bold dengan color coding)
- Status Badge (Low/Normal/Belum Diatur)
- Actions Dropdown (⋯)

### 4. **Table Toolbar**
Toolbar lengkap dengan semua filter dan actions yang diperlukan.

**Desktop:**
- Search input
- Category dropdown
- Supplier dropdown
- Stock filter
- Column visibility toggle
- Export CSV button
- Add product button

**Mobile:**
- Compact search
- Filter button (dengan badge counter)
- Add button

---

## 🚀 Quick Start

### Akses Halaman

```
http://localhost:3000/management/products
```

### Struktur File

```
src/
├── app/management/products/
│   └── page.tsx                          # Main product management page
│
├── components/products/
│   ├── product-detail-drawer.tsx         # Detail drawer component
│   ├── filter-bottom-sheet.tsx           # Mobile filter sheet
│   ├── premium-product-table.tsx         # Desktop table component
│   ├── table-toolbar.tsx                 # Filter toolbar
│   └── index.ts                          # Barrel export
│
└── docs/
    └── PREMIUM_PRODUCT_UI.md             # Complete documentation
```

---

## 🎯 Cara Penggunaan

### 1. Melihat Daftar Produk

```typescript
// Default view menampilkan semua produk aktif
// Gunakan search bar untuk mencari produk
// Gunakan filter untuk menyaring berdasarkan kategori/supplier/stok
```

### 2. Membuka Detail Produk

```typescript
// Klik pada baris produk di table
// Atau klik "Lihat Detail" di menu dropdown (⋯)
// Drawer akan slide in dari kanan dengan semua informasi
```

### 3. Filter Produk

**Desktop:**
```typescript
// Gunakan dropdown di toolbar:
// - Kategori: Filter berdasarkan kategori
// - Supplier: Filter berdasarkan supplier
// - Stok: Tampilkan semua atau low stock saja
```

**Mobile:**
```typescript
// Tap icon filter (🔽) di toolbar
// Bottom sheet akan muncul dari bawah
// Pilih filter yang diinginkan
// Tap "Terapkan Filter" untuk apply
```

### 4. Mengatur Min Stock

```typescript
// Buka detail produk (klik row)
// Pada bagian "Stok Per Outlet"
// Klik tombol "Atur Min Stock" pada outlet yang belum diatur
// Dialog akan muncul untuk input nilai minimum
```

### 5. Melihat Riwayat Stok

```typescript
// Buka detail produk
// Scroll ke bagian "Riwayat Terakhir"
// Klik "Lihat seluruh pergerakan stok ➜"
// Akan redirect ke halaman Stock Movement dengan filter product
```

---

## 🎨 Design Patterns

### Status Badge Colors

```typescript
Low Stock     → Orange (bg-orange-500/10, text-orange-700)
Normal        → Green (bg-green-500/10, text-green-700)
Belum Diatur  → Gray (bg-gray-500/10, text-gray-600)
```

### Typography

```typescript
Product Name      → font-medium text-sm
Category Name     → text-xs text-muted-foreground
SKU              → font-mono text-sm
Price            → font-semibold text-sm
Stock            → font-bold text-lg
Section Header   → text-xs font-semibold uppercase
```

### Spacing

```typescript
Drawer Padding   → px-6 py-4 (header/footer), px-6 py-5 (content)
Table Row        → py-4
Section Gap      → space-y-6
```

---

## 📱 Responsive Behavior

### Desktop (≥ 768px)
- ✅ Tabel premium ditampilkan
- ✅ Semua filter di toolbar
- ✅ Drawer slide dari kanan (520px width)
- ✅ Hover effects pada row
- ✅ Column visibility toggle

### Mobile (< 768px)
- ✅ Tabel hidden (bisa dikembangkan jadi card list)
- ✅ Toolbar compact (search + filter + add)
- ✅ Filter bottom sheet
- ✅ Drawer fullscreen
- ✅ Touch-optimized buttons

---

## 🔧 Kustomisasi

### Menambah Kolom Baru di Tabel

1. **Update type `ProductTableRow`:**
```typescript
// src/components/products/premium-product-table.tsx
export type ProductTableRow = {
  // ... existing fields
  newField?: string; // Add your field
};
```

2. **Update `visibleColumns` di FilterState:**
```typescript
// src/components/products/filter-bottom-sheet.tsx
visibleColumns: {
  // ... existing columns
  newField: boolean;
}
```

3. **Tambahkan kolom di table:**
```typescript
// src/components/products/premium-product-table.tsx
{visibleColumns.newField && (
  <TableHead>New Field</TableHead>
)}

// ...

{visibleColumns.newField && (
  <TableCell>{product.newField || '-'}</TableCell>
)}
```

### Menambah Filter Baru

1. **Update `FilterState`:**
```typescript
// src/components/products/filter-bottom-sheet.tsx
export type FilterState = {
  // ... existing filters
  newFilter: string;
};
```

2. **Tambahkan UI filter:**
```typescript
<div className="space-y-2">
  <Label>New Filter</Label>
  <Select
    value={localFilters.newFilter}
    onValueChange={(value) => updateFilter("newFilter", value)}
  >
    {/* Options */}
  </Select>
</div>
```

3. **Apply filter logic:**
```typescript
// src/app/management/products/page.tsx
if (filters.newFilter !== "all") {
  result = result.filter(/* your filter logic */);
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Search produk by nama/SKU
- [ ] Filter by kategori
- [ ] Filter by supplier
- [ ] Filter low stock only
- [ ] Sort by nama/harga/stok
- [ ] Toggle column visibility
- [ ] Klik row → drawer terbuka
- [ ] Semua actions di drawer berfungsi
- [ ] Mobile: filter sheet berfungsi
- [ ] Mobile: drawer fullscreen
- [ ] Responsive di berbagai screen size

### Unit Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PremiumProductTable } from '@/components/products';

test('should open drawer when row clicked', () => {
  const handleRowClick = jest.fn();
  const products = [/* mock data */];
  
  render(
    <PremiumProductTable 
      products={products}
      onRowClick={handleRowClick}
    />
  );
  
  fireEvent.click(screen.getByText('Air Mineral 600ml'));
  expect(handleRowClick).toHaveBeenCalledTimes(1);
});
```

---

## 🐛 Known Issues & Future Improvements

### Known Issues
- ⚠️ Stock movements belum di-fetch dari API (masih mock data)
- ⚠️ Image upload belum diimplementasi (tampil placeholder)
- ⚠️ Virtual scrolling belum ada (performance issue jika > 500 products)

### Future Improvements
- [ ] Bulk actions (select multiple products)
- [ ] Inline editing
- [ ] Product comparison view
- [ ] Advanced filters (price range, date range)
- [ ] Saved filter presets
- [ ] Export to Excel (selain CSV)
- [ ] Import products from CSV
- [ ] Barcode scanner integration
- [ ] Product image crop/resize
- [ ] Real-time updates (WebSocket)

---

## 📚 Dokumentasi Lengkap

Untuk dokumentasi teknis lengkap, lihat:
- **[PREMIUM_PRODUCT_UI.md](./docs/PREMIUM_PRODUCT_UI.md)** - Design system, data flow, API integration

---

## 🤝 Contributing

Jika ingin menambahkan fitur:

1. **Follow design system yang ada** - Gunakan komponen shadcn/ui, warna, dan spacing yang konsisten
2. **Update dokumentasi** - Tambahkan ke PREMIUM_PRODUCT_UI.md jika ada perubahan besar
3. **Test responsiveness** - Pastikan berfungsi di desktop dan mobile
4. **Add unit tests** - Untuk logic yang kompleks
5. **Check accessibility** - Keyboard navigation dan screen reader support

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Cek dokumentasi lengkap di `docs/PREMIUM_PRODUCT_UI.md`
2. Review kode di `src/components/products/`
3. Lihat contoh penggunaan di `src/app/management/products/page.tsx`

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Maintainer:** Development Team