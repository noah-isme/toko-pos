# Troubleshooting: Stock Menampilkan 0

## Masalah
Halaman produk menampilkan stok 0 untuk semua atau beberapa produk, meskipun sudah mencoba memperbarui stok.

## Cara Debug

### 1. Akses Halaman Debug
Buka halaman debug inventory untuk melihat status real-time:
```
http://localhost:3000/debug/inventory
```

Halaman ini akan menampilkan:
- ✅ Status outlet yang dipilih
- ✅ Status query products dan inventory
- ✅ Jumlah produk dengan stok vs stok 0
- ✅ Data mentah dari API
- ✅ Activity log

### 2. Cek Console Browser
Buka Developer Tools (F12) dan lihat console untuk log debug:
```
🔍 DEBUG - Current Outlet: { id: "...", name: "..." }
🔍 DEBUG - Inventory Query Status: { isLoading, isError, dataLength }
🔍 DEBUG - Inventory Data: [...]
🔍 DEBUG - Inventory Map: [...]
```

### 3. Verifikasi Database
Jalankan script untuk cek data di database:
```bash
npx tsx scripts/check-stock.ts
```

Output akan menampilkan semua produk dan stok sebenarnya di database.

## Penyebab Umum & Solusi

### ❌ Masalah 1: Outlet Tidak Dipilih
**Gejala:**
- Inventory query tidak berjalan (disabled)
- Status: "No outlet selected"

**Solusi:**
1. Login sebagai user dengan akses outlet
2. Pilih outlet dari dropdown (jika ada)
3. Verifikasi `currentOutlet` tidak null di console

**Cek:**
```javascript
// Di browser console
localStorage.getItem('toko-pos:current-outlet')
```

### ❌ Masalah 2: Produk Tidak Punya Inventory Record
**Gejala:**
- Query berhasil tapi return data kosong untuk produk tertentu
- Database cek menunjukkan "NO INVENTORY RECORDS"

**Solusi:**
1. Produk perlu ditambahkan ke inventory outlet terlebih dahulu
2. Buat inventory record via:
   - Form edit produk → Set stok per outlet
   - Stock adjustment page
   - Import data awal

**SQL untuk cek:**
```sql
SELECT p.name, p.sku, i.quantity, o.name as outlet_name
FROM "Product" p
LEFT JOIN "Inventory" i ON i."productId" = p.id
LEFT JOIN "Outlet" o ON o.id = i."outletId"
WHERE p."isActive" = true;
```

### ❌ Masalah 3: Query Error (Authentication)
**Gejala:**
- Inventory query status: Error
- Error message: "Unauthorized" atau "UNAUTHORIZED"

**Solusi:**
1. Logout dan login kembali
2. Cek session masih valid
3. Verifikasi role user punya akses ke endpoint inventory

### ❌ Masalah 4: Data Outlet Salah
**Gejala:**
- Inventory query sukses tapi return 0 records
- Outlet dipilih tapi bukan outlet yang punya inventory

**Solusi:**
1. Verifikasi outlet yang dipilih benar
2. Cek di database outlet mana yang punya inventory:
```bash
npx tsx scripts/test-inventory-api.ts
```

### ❌ Masalah 5: Cache Issue
**Gejala:**
- Data baru disimpan tapi tidak muncul
- Refresh tidak membantu

**Solusi:**
1. Hard refresh browser (Ctrl+Shift+R atau Cmd+Shift+R)
2. Clear browser cache
3. Restart development server
4. Cek network tab untuk melihat response API

## Checklist Debugging

Gunakan checklist ini untuk debug systematic:

- [ ] **Outlet Selected?**
  - Buka `/debug/inventory`
  - Lihat "Current Outlet" section
  - Harus ada nama outlet dan ID

- [ ] **Inventory Query Running?**
  - Status harus "Success" (hijau)
  - Count harus > 0 jika ada data
  - Enabled harus ✅

- [ ] **Products Query Running?**
  - Status harus "Success"
  - Count harus match jumlah produk aktif

- [ ] **Database Has Data?**
  ```bash
  npx tsx scripts/check-stock.ts
  ```
  - Semua produk harus punya inventory record
  - Quantity harus > 0

- [ ] **Console Errors?**
  - Buka Developer Tools
  - Tab Console
  - Tidak boleh ada error merah

- [ ] **Network Requests Success?**
  - Tab Network
  - Filter: `inventory.getAllInventory`
  - Status: 200
  - Response: Array dengan data

## Testing Manual

### Test 1: View Stock
1. Login sebagai owner/manager
2. Buka Management > Products
3. Verifikasi kolom Stok menampilkan angka (bukan 0)
4. Cek warna badge status stok

### Test 2: Update Stock
1. Klik produk untuk edit
2. Scroll ke section "Stok per Outlet"
3. Update quantity
4. Simpan
5. Kembali ke halaman products
6. Verifikasi stok berubah

### Test 3: Debug Page
1. Buka `/debug/inventory`
2. Verifikasi semua status hijau
3. Cek "Stock Summary" - should show correct counts
4. Lihat "Products & Stock" list
5. Verifikasi angka stok match dengan database

## Advanced Debugging

### Enable Detailed Logging
Edit `src/app/management/products/page.tsx` dan uncomment debug logs jika perlu lebih detail.

### Check API Response Directly
Gunakan browser atau curl:
```bash
# Dapatkan session cookie dari browser dev tools
curl 'http://localhost:3000/api/trpc/inventory.getAllInventory?input={"outletId":"OUTLET_ID_HERE"}' \
  -H 'Cookie: next-auth.session-token=YOUR_TOKEN'
```

### Database Query Direct
```sql
-- Cek total inventory per outlet
SELECT 
  o.name as outlet,
  COUNT(i.id) as total_inventory,
  SUM(i.quantity) as total_stock
FROM "Outlet" o
LEFT JOIN "Inventory" i ON i."outletId" = o.id
GROUP BY o.id, o.name;

-- Cek produk tanpa inventory
SELECT p.name, p.sku, p.id
FROM "Product" p
LEFT JOIN "Inventory" i ON i."productId" = p.id
WHERE p."isActive" = true
AND i.id IS NULL;
```

## Solusi Permanent

### Inisialisasi Inventory untuk Semua Produk
Jika banyak produk belum punya inventory, buat script seeding:

```typescript
// scripts/init-inventory.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initInventory() {
  const outlets = await prisma.outlet.findMany();
  const products = await prisma.product.findMany({
    where: { isActive: true }
  });

  for (const outlet of outlets) {
    for (const product of products) {
      await prisma.inventory.upsert({
        where: {
          productId_outletId: {
            productId: product.id,
            outletId: outlet.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          outletId: outlet.id,
          quantity: 0, // atau nilai default lain
          costPrice: product.costPrice,
        },
      });
    }
  }

  console.log(`✅ Initialized inventory for ${products.length} products across ${outlets.length} outlets`);
}

initInventory();
```

Jalankan:
```bash
npx tsx scripts/init-inventory.ts
```

## Pertanyaan Umum (FAQ)

**Q: Kenapa beberapa produk menampilkan stok tapi yang lain 0?**
A: Produk yang menampilkan 0 belum punya inventory record untuk outlet yang dipilih. Gunakan form edit produk untuk set stok awal.

**Q: Data sudah disimpan tapi masih 0?**
A: Cek browser console untuk error. Kemungkinan ada validation error atau API error yang tidak terlihat.

**Q: Setelah update stok masih 0?**
A: Tunggu auto-refresh (60 detik) atau refresh manual halaman. Cek juga apakah form submit berhasil (lihat toast notification).

**Q: Stok di database benar tapi tampilan salah?**
A: Cek apakah outlet yang dipilih di frontend sama dengan outlet di database. Use `/debug/inventory` untuk verifikasi.

**Q: Bagaimana cara reset semua stok?**
A: Gunakan SQL atau buat migration script untuk update semua inventory quantity.

## Log Files

Untuk environment production, cek log files:
- Application logs: `/var/log/toko-pos/app.log`
- Database logs: Supabase dashboard
- Browser console: Save as HAR file untuk analisis

## Kontak Support

Jika masalah masih berlanjut setelah troubleshooting:
1. Screenshot halaman `/debug/inventory`
2. Export browser console log
3. Output dari `scripts/check-stock.ts`
4. Jelaskan step-by-step yang dilakukan

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Active