# Fix: Pencarian Produk di Halaman Kasir

## Masalah

Ketika user mengetik nama produk di halaman kasir (misalnya "air" atau "beras"), tidak muncul hasil apa-apa. Padahal placeholder input mengatakan "Scan barcode atau ketik nama produk".

## Root Cause

Endpoint `products.getByBarcode` yang digunakan oleh halaman kasir **hanya mencari berdasarkan barcode (exact match)**, tidak mencari berdasarkan nama produk atau SKU.

```typescript
// BEFORE - Hanya barcode
const product = await db.product.findFirst({
  where: {
    barcode: input.barcode,
    isActive: true,
  },
});
```

Jadi meskipun UI menyarankan user bisa ketik nama produk, backend tidak support fitur tersebut.

## Solusi

Update endpoint `products.getByBarcode` di `src/server/api/routers/products.ts` untuk:
1. Coba cari by barcode dulu (exact match) - prioritas pertama
2. Jika tidak ketemu, cari by nama atau SKU (case-insensitive, contains)

```typescript
// AFTER - Barcode, nama, atau SKU
// Try to find by barcode first (exact match)
let product = await db.product.findFirst({
  where: {
    barcode: input.barcode,
    isActive: true,
  },
});

// If not found by barcode, search by name or SKU (case-insensitive)
if (!product) {
  product = await db.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { contains: input.barcode, mode: "insensitive" } },
        { sku: { contains: input.barcode, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { name: "asc" },
    ],
  });
}
```

## Cara Kerja Sekarang

### Scenario 1: Scan Barcode
User scan barcode "8992761163044"
1. System cari produk dengan barcode exact match
2. Ketemu → Tambah ke cart
3. Tidak ketemu → Error "Produk tidak ditemukan"

### Scenario 2: Ketik Nama Produk
User ketik "air" atau "mineral"
1. System cari barcode "air" → tidak ketemu
2. System cari produk dengan nama yang mengandung "air" (case-insensitive)
3. Ketemu "Air Mineral 600ml" → Tambah ke cart
4. Tidak ketemu → Error "Produk tidak ditemukan"

### Scenario 3: Ketik SKU
User ketik "AM-003"
1. System cari barcode "AM-003" → tidak ketemu
2. System cari produk dengan nama yang mengandung "AM-003" → tidak ketemu
3. System cari produk dengan SKU yang mengandung "AM-003" → Ketemu!
4. Tambah "Air Mineral 600ml" ke cart

## Contoh Pencarian

| Input User | Match By | Hasil |
|------------|----------|-------|
| `8992761163044` | Barcode (exact) | Air Mineral 600ml |
| `air` | Name (contains) | Air Mineral 600ml |
| `mineral` | Name (contains) | Air Mineral 600ml |
| `AM-003` | SKU (contains) | Air Mineral 600ml |
| `beras` | Name (contains) | Beras Premium 5kg |
| `BR-001` | SKU (contains) | Beras Premium 5kg |
| `gula` | Name (contains) | Gula Pasir 1kg |
| `xyz123` | Not found | Error: Produk tidak ditemukan |

## Limitasi & Known Issues

### 1. Hanya Return Produk Pertama
Jika ada multiple matches (misalnya ada "Air Mineral 600ml" dan "Air Mineral 1L"), system hanya return produk pertama berdasarkan alfabetis nama.

**Mitigasi:** User bisa ketik lebih spesifik (misalnya "air 600" atau "air 1L") atau gunakan SKU.

### 2. Tidak Ada Filter Berdasarkan Outlet
Endpoint `products.getByBarcode` **tidak filter produk berdasarkan outlet**. Jadi produk bisa ditambahkan ke cart meskipun tidak ada inventory di outlet tersebut.

**Masalah:**
- User di "Outlet Cabang BSD" (tidak punya inventory)
- Search "air" → ketemu "Air Mineral 600ml"
- Tambah ke cart → berhasil
- Saat checkout → **ERROR** karena tidak ada stok di outlet tersebut

**Solusi Sementara:**
- Gunakan outlet yang punya inventory (misalnya "Outlet Utama")
- Atau initialize inventory untuk outlet yang aktif

**Solusi Permanent (Future Enhancement):**
```typescript
// Add outlet filter
const product = await db.product.findFirst({
  where: {
    isActive: true,
    OR: [
      { name: { contains: input.barcode, mode: "insensitive" } },
      { sku: { contains: input.barcode, mode: "insensitive" } },
    ],
    inventoryLines: {
      some: {
        outletId: input.outletId,  // Add outlet context
        quantity: { gt: 0 },        // Only products with stock
      },
    },
  },
});
```

### 3. Case-Insensitive Tapi Tidak Fuzzy
Search menggunakan PostgreSQL `ILIKE` (case-insensitive contains) tapi tidak support fuzzy matching atau typo tolerance.

**Examples:**
- ✅ "air" finds "Air Mineral"
- ✅ "AIR" finds "Air Mineral"
- ✅ "mineral" finds "Air Mineral"
- ❌ "airmineral" does NOT find "Air Mineral" (no space)
- ❌ "aer" does NOT find "Air" (typo)

**Future Enhancement:** Implement fuzzy search with Levenshtein distance or full-text search.

## Testing

### Manual Testing Steps
1. Login ke kasir page
2. Pastikan shift sudah dibuka
3. Test scenarios:

**Test 1: Search by Name**
```
Input: "air"
Expected: Air Mineral 600ml ditambahkan ke cart
```

**Test 2: Search by SKU**
```
Input: "AM-003"
Expected: Air Mineral 600ml ditambahkan ke cart
```

**Test 3: Search by Partial Name**
```
Input: "beras"
Expected: Beras Premium 5kg ditambahkan ke cart
```

**Test 4: Search Not Found**
```
Input: "xyz123"
Expected: Toast error "Produk tidak ditemukan"
```

**Test 5: Barcode Still Works**
```
Input: (scan barcode)
Expected: Product added immediately
```

### API Testing
```bash
# Test via curl (replace with actual barcode/name)
curl 'http://localhost:3000/api/trpc/products.getByBarcode?input={"barcode":"air"}' \
  -H 'Cookie: next-auth.session-token=YOUR_TOKEN'
```

Expected response:
```json
{
  "result": {
    "data": {
      "id": "cmh0l4vpb0016jynnj3weh2en",
      "name": "Air Mineral 600ml",
      "sku": "AM-003",
      "price": 4500
    }
  }
}
```

## Files Changed

- `src/server/api/routers/products.ts` - Updated `getByBarcode` endpoint to search by name/SKU

## Migration Notes

**Breaking Changes:** None - this is backward compatible
- Existing barcode scans still work (exact match prioritized)
- New functionality added for name/SKU search

**Performance Impact:** Minimal
- Barcode lookup still uses index (fast)
- Name/SKU search only runs if barcode not found
- Uses database indexes on name/sku columns

## Recommendations

### For Immediate Use
1. ✅ Use search by name/SKU for quick product lookup
2. ✅ Continue using barcode scanner for fastest checkout
3. ⚠️  Make sure outlet has inventory before using cashier

### For Future Enhancement
1. Add outlet-aware product search
2. Show available stock in search results
3. Implement autocomplete/dropdown for multiple matches
4. Add fuzzy search for typo tolerance
5. Add product category filter
6. Show "out of stock" warning before adding to cart

## FAQ

**Q: Kenapa saya ketik "air" tapi tidak muncul apa-apa?**
A: Pastikan:
1. Produk aktif (isActive = true)
2. Nama produk mengandung kata "air"
3. Tekan Enter setelah mengetik
4. Cek console browser untuk error

**Q: Bisa search pakai angka?**
A: Ya, angka akan dicari di nama, SKU, dan barcode.

**Q: Apakah search case-sensitive?**
A: Tidak, search case-insensitive. "AIR", "air", "Air" semua sama.

**Q: Kenapa produk bisa ditambah ke cart tapi error saat checkout?**
A: Produk tidak punya stok di outlet yang aktif. Ganti outlet atau tambahkan inventory.

**Q: Bagaimana cara menambahkan inventory?**
A: Lihat `TROUBLESHOOTING_STOCK_ZERO.md` atau gunakan script `init-inventory-cabang-bsd.ts`.

---

**Status:** Fixed ✅  
**Version:** 1.0  
**Last Updated:** 2024