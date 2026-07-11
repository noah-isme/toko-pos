# Promotion Engine, Task Center & RBAC — Status & Tindak Lanjut

**Tanggal**: 2026-07-12
**Branch**: `feat/promotions-tasks-rbac`
**Status build**: ✅ `tsc --noEmit` 0 error · unit test non-DB lolos (23 test)

Dokumen ini merangkum tiga fitur yang baru diselesaikan dan **daftar tugas yang harus dikerjakan selanjutnya** sebelum fitur ini bisa dianggap production-ready.

---

## Ringkasan yang sudah selesai

### 1. Promotion Engine
- Model Prisma: `Promotion`, `PromotionOutlet`, `PromotionUsage`; enum `PromotionType` (`BUY_X_GET_Y`, `BUNDLE_DISCOUNT`, `TIERED_DISCOUNT`).
- Service `applyPromotionsToSale` (`src/server/services/promotions.ts`) — dievaluasi otomatis di `sales.recordSale`.
- Router `promotionsRouter`: `list`, `simulate` (mutation), `create` (admin/owner).
- UI: panel promo di halaman kasir + halaman admin `/management/promotions`.

### 2. Task Center Kasir
- Model `CashierTaskStatus`; enum `TaskStatus` (`PENDING`, `COMPLETE`).
- Router `tasksRouter`: `getCashierTasks`, `updateTaskStatus`.
- Analytics: `getTaskFeedbackSummary`, `getPromotionUsageSummary`.

### 3. RBAC Outlet Scoping
- Middleware `withOutletAccess` / `protectedOutletProcedure` / `requireOutletAccess` (`src/server/api/trpc.ts`).
- Helper akses di `src/server/api/utils/access.ts`.
- Diterapkan pada analytics, inventory, outlets, products, cash-sessions.
- Test: `tests/api/rbac.test.ts`.

---

## 🔜 Tugas yang harus dikerjakan selanjutnya

### Prioritas 1 — Blocker rilis (butuh akses DB)
- [ ] **Buat & terapkan migration Prisma.** Schema berubah (3 model baru + `@@unique([saleId, promotionId])` pada `PromotionUsage`), tetapi migration belum dibuat karena DB Supabase tidak terjangkau dari sandbox.
  ```bash
  pnpm run db:migrate    # buat migration untuk Promotion*, CashierTaskStatus, dan @@unique
  ```
- [ ] **Jalankan suite berbasis DB.** `tests/api/rbac.test.ts` dan `tests/api/analytics.test.ts` gagal di sandbox hanya karena `ENOTFOUND` ke pooler Supabase — verifikasi ulang di lingkungan dengan koneksi DB.
  ```bash
  pnpm run test:unit
  ```
- [ ] **Backfill data lama (opsional).** Kolom `Sale.promotionDiscount` default `0`; pastikan tidak ada baris `PromotionUsage` duplikat sebelum menerapkan `@@unique` (jika sudah ada data produksi, dedup dulu).

### Prioritas 2 — Kelengkapan fitur promo
- [ ] **Batasi diskon promo terhadap total.** `recordSale` sudah `Math.max(totalNet - promotionDiscount, 0)`, tetapi `discountTotal` yang tersimpan bisa melebihi `totalGross` pada kasus ekstrem. Tambahkan clamp `promotionDiscount ≤ totalNet` sebelum menghitung `discountTotal`.
- [ ] **Interaksi promo dengan `enforceDiscountLimit`.** Saat ini limit hanya berlaku pada diskon manual; putuskan apakah diskon promo otomatis juga harus dihitung terhadap `DISCOUNT_LIMIT_PERCENT`.
- [ ] **Validasi `rules` per tipe di endpoint `create`.** Saat ini `rules` diterima sebagai `unknown`. Validasi dengan schema per `PromotionType` (schema sudah ada di service) agar promo tidak tersimpan dengan aturan yang tidak valid.
- [ ] **Edit / nonaktifkan / hapus promo.** Router baru punya `create` saja; tambahkan `update` dan `toggleActive`/`delete`.
- [ ] **UI simulasi promo** — hubungkan tombol "Preview promo" ke hasil `simulate` secara lengkap (verifikasi manual di browser).

### Prioritas 3 — Kualitas & konsistensi
- [ ] **Perbaiki `next lint`.** `pnpm run lint` gagal parse (`no such directory: .../lint`) — konfigurasi `next lint` perlu diperiksa (kemungkinan argumen/flag ESLint).
- [ ] **Uji unit untuk `applyPromotionsToSale`.** Tambahkan test khusus untuk tiap tipe promo, termasuk kasus item hadiah tidak ada di cart dan pembatasan unit hadiah.
- [ ] **Bersihkan warning deprecation Zod.** `z.nativeEnum` dan `z.string().datetime()` sudah deprecated di versi Zod terpasang — migrasi ke API baru saat menyentuh file terkait.
- [ ] **Verifikasi end-to-end di browser** (skill `/run` atau `/verify`): checkout dengan promo aktif, toggle tugas kasir, dan tampilan ringkasan di `/management/promotions`.

---

## Catatan teknis penting

- **Middleware ctx patch**: `withOutletAccess` dan `requireActiveShift` mengembalikan **hanya patch ctx** (tanpa `...ctx`) — tRPC menggabungkannya sendiri. Menyebarkan `...ctx` akan melebarkan tipe `session` kembali menjadi nullable. Jangan menambahkan kembali spread tersebut.
- **`@@unique([saleId, promotionId])`** membuat `createMany` promo idempoten per sale; jika menambah jalur penulisan `PromotionUsage` baru, pastikan tidak melanggar constraint ini.
