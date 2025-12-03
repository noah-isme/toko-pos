# Fix: Product Stock Display Issue

## Problem
Product halaman menampilkan stok 0 untuk semua produk, padahal database memiliki data stok yang benar. User mencoba memperbarui stok produk namun stok tetap menampilkan 0.

## Root Cause Analysis

### Issue 1: Stock Data Not Fetched
Halaman produk (`src/app/management/products/page.tsx`) hanya mengambil data stok dari `lowStockAlerts`, yang hanya mengembalikan stok untuk produk yang memiliki peringatan low stock.

```typescript
// BEFORE - Wrong implementation
const totalStock = lowStockAlert?.quantity ?? 0;
```

Untuk produk yang tidak memiliki low stock alert, stok defaultnya adalah 0, meskipun di database memiliki stok yang cukup.

### Issue 2: Missing Inventory Query
Tidak ada query yang mengambil data inventory lengkap untuk semua produk di outlet yang dipilih.

## Solution

### 1. Add New Inventory Query
Menambahkan endpoint baru di `src/server/api/routers/inventory.ts`:

```typescript
getAllInventory: protectedProcedure
  .input(
    z.object({
      outletId: z.string().min(1),
    }),
  )
  .output(z.array(inventoryItemSchema))
  .query(async ({ input }) => {
    const inventories = await db.inventory.findMany({
      where: {
        outletId: input.outletId,
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    return inventories.map((inv) =>
      inventoryItemSchema.parse({
        productId: inv.productId,
        quantity: inv.quantity,
      }),
    );
  })
```

### 2. Update Product Page to Use Real Inventory Data
Mengubah halaman produk untuk mengambil dan menggunakan data inventory yang sebenarnya:

```typescript
// Add inventory query
const inventoryQuery = api.inventory.getAllInventory.useQuery(
  { outletId: currentOutlet?.id ?? "" },
  { enabled: Boolean(currentOutlet?.id), refetchInterval: 60_000 },
);

// Create inventory map for quick lookup
const inventoryMap = useMemo(() => {
  const map = new Map<string, number>();
  (inventoryQuery.data ?? []).forEach((inv) => {
    map.set(inv.productId, inv.quantity);
  });
  return map;
}, [inventoryQuery.data]);

// Use real stock from inventory map
const totalStock = inventoryMap.get(product.id) ?? 0;
```

### 3. Enhanced Stock Status Logic
Menambahkan status "out" untuk produk yang benar-benar habis:

```typescript
status: isLowStock
  ? "low"
  : product.minStock === 0
    ? "unset"
    : totalStock > product.minStock
      ? "normal"
      : totalStock === 0
        ? "out"
        : "low"
```

### 4. Update UI Components
Menambahkan support untuk status "out" di:
- `src/components/products/premium-product-table.tsx`
- `src/components/products/product-detail-drawer.tsx`

Dengan menambahkan config:
```typescript
out: {
  variant: "destructive" as const,
  label: "Habis",
  className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
}
```

## Database Verification

Menggunakan script `scripts/check-stock.ts` untuk memverifikasi bahwa data stok sebenarnya ada di database:

```bash
npx tsx scripts/check-stock.ts
```

Output menunjukkan bahwa semua produk memiliki stok:
- Air Mineral: 120 units
- Beras Premium: 40 units
- Gula Pasir: 55 units
- Kopi Bubuk: 18 units
- Minyak Goreng: 60 units
- Roti Tawar: 25 units
- Snack Kentang: 80 units
- Susu UHT: 35 units

## Testing

### Manual Testing Steps
1. Login ke sistem sebagai owner/manager
2. Buka halaman Management > Products
3. Verifikasi bahwa kolom Stok menampilkan angka yang benar (bukan 0)
4. Cek bahwa warna stok menunjukkan status yang tepat:
   - Merah (Habis) = stok 0
   - Orange (Low Stock) = stok < minStock
   - Hijau (Normal) = stok >= minStock
   - Abu-abu (Belum Diatur) = minStock = 0

### Update Product Stock
1. Klik produk untuk edit
2. Update jumlah stok di section "Stok per Outlet"
3. Simpan perubahan
4. Verifikasi stok berubah di database dan tampilan

## Files Changed
- `src/server/api/routers/inventory.ts` - Added `getAllInventory` query
- `src/app/management/products/page.tsx` - Use real inventory data
- `src/components/products/premium-product-table.tsx` - Added "out" status support
- `src/components/products/product-detail-drawer.tsx` - Added "out" status support
- `scripts/check-stock.ts` - Fixed field name `inventoryLines` → `inventories`

## Impact
✅ Halaman produk sekarang menampilkan stok yang sebenarnya dari database
✅ Update stok di form edit produk berfungsi dengan benar
✅ Status stok ditampilkan dengan akurat (Normal, Low, Habis, Belum Diatur)
✅ Real-time refresh setiap 60 detik untuk data inventory

## Notes
- Query inventory menggunakan `refetchInterval: 60_000` (60 detik) untuk auto-refresh
- Inventory data di-cache per outlet untuk performa yang lebih baik
- Status "out" (habis) hanya muncul jika benar-benar stok = 0 dan minStock > 0