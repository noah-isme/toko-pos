# Changelog

Semua perubahan penting pada proyek Toko POS akan didokumentasikan dalam file ini.

Format ini mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added

- **Promotion engine**: model Prisma `Promotion`, `PromotionOutlet`, `PromotionUsage` (+ enum `PromotionType`), service `applyPromotionsToSale` (BUY_X_GET_Y, BUNDLE_DISCOUNT, TIERED_DISCOUNT), router `promotionsRouter` (`list`, `simulate`, `create`), auto-apply di `sales.recordSale`, panel promo di halaman kasir, dan halaman admin `/management/promotions`.
- **Task center kasir**: model `CashierTaskStatus` (+ enum `TaskStatus`), router `tasksRouter` (`getCashierTasks`, `updateTaskStatus`), panel tugas + low-stock alert di halaman kasir, serta ringkasan `analytics.getTaskFeedbackSummary` dan `analytics.getPromotionUsageSummary`.
- **RBAC outlet scoping**: middleware `withOutletAccess`/`protectedOutletProcedure`/`requireOutletAccess` dan helper `@/server/api/utils/access`, diterapkan pada router analytics, inventory, outlets, products, dan cash-sessions agar kasir hanya melihat outlet yang ditugaskan.
- **Manajemen user**: router `usersRouter` (`list`, `create`, `update`, `delete`, `getOutletAssignments`, `setOutletAssignment`, `removeOutletAssignment`) dengan guard `assertAdminOrOwner`, proteksi self-delete & last-owner, serta pengecekan dependensi referensial (sale/refund/stock-movement) sebelum hard-delete. Halaman `/management/users` dengan tabel pengguna, dialog tambah/edit (termasuk reset password), dialog penugasan outlet (assign/toggle/hapus), dan dialog konfirmasi hapus. Tautan "Manajemen User" di dropdown user pada site-header (hanya OWNER/ADMIN). Suite test `tests/unit/schemas.users.test.ts` (validasi Zod) dan `tests/api/users.test.ts` (DB-backed router).
- Suite test `tests/api/rbac.test.ts` untuk memverifikasi pembatasan akses per-outlet.
- Guard endpoint debug (`/api/debug-*`) di belakang role ADMIN/OWNER dan dinonaktifkan saat `NODE_ENV=production`.

### Fixed

- Typecheck proyek dari **54 error menjadi 0**:
  - `withOutletAccess` tidak lagi memberi tipe `unknown` pada resolver input dan tidak lagi menyebar `...ctx` yang membuat `session` menjadi nullable.
  - `promotionsRouter` mengimpor `assertAdminOrOwner` dari lokasi yang benar (`utils/access`).
  - `applyPromotionsToSale` mem-parse rule per-tipe sehingga union ter-narrow dengan benar.
- **Diskon promo untuk barang yang tidak dibeli**: BUY_X_GET_Y kini mewajibkan item hadiah ada di keranjang dan membatasi unit hadiah ke `min(rewardQty × triggers, qty di cart)`.
- **Pencatatan `PromotionUsage` ganda**: menghapus blok `createMany` duplikat di `recordSale` dan menambahkan constraint `@@unique([saleId, promotionId])`.
- Klien promo diselaraskan dengan kontrak router: `simulate` menjadi mutation, membaca `from`/`to` (bukan `period.from`), dan semua status mutation memakai `isPending` (React Query v5) alih-alih `isLoading`.
- `Button size="xs"` yang tidak valid pada panel tugas diganti `sm`.

- Inventory router (`inventoryRouter`) dengan mutation `setProductMinStock`, query `listLowStock`, dan `acknowledgeLowStock` lengkap dengan `LowStockAlert` persistence.
- UI produk: field **Stok Minimum**, kolom **Min Stock** & **Status Stok**, badge “Low”, action cepat **Set Min Stock**, serta toggle filter **Tampilkan hanya yang Low Stock**.
- Widget Dashboard low-stock yang mengambil data alert per outlet aktif + tombol Acknowledge.
- Shift kasir end-to-end (modal buka/tutup, difference, middleware `requireActiveShift`, dan audit log `SHIFT_*`).
- Script seed penuh (`pnpm run seed:full`) kini menanam user owner/admin/kasir, sesi kas aktif, transaksi contoh, refund, void, dan alert stok. Tambahkan flag `--reset` untuk truncate tabel additive sebelum seeding ulang.
- Unit tests untuk `writeAuditLog`, `evaluateLowStock`, `requireActiveShift`, serta service refund/void.
- Playwright E2E baru: `cashier.shift`, `cashier.refund_void`, `dashboard.lowstock`, dan `products.minstock`.
- Halaman demo publik read-only (`/demo/*`) beserta CTA "Coba Demo Tanpa Login" di beranda.
- Worker MSW otomatis untuk `/demo/*` termasuk di produksi via toggle `startMockMode`.
- Endpoint tRPC `sales.voidSale` dan `sales.refundSale` lengkap dengan dialog konfirmasi kasir dan ringkasan restock.
- Integrasi tabel produk dengan TanStack Table (kolom dinamis, resize, ekspor CSV mengikuti visibilitas).
- Script `seed-full.mjs` (`pnpm run seed:full`) untuk mengosongkan dan mengisi ulang seluruh tabel staging dengan dataset realistis.
- Hook `useActiveOutlet` dan cache katalog IndexedDB untuk mempercepat lookup barcode dan menyimpan outlet aktif.
- Dialog pembayaran kasir dengan preview struk 58/80mm, QR metadata, tombol Unduh & Cetak, serta keyboard shortcut kasir.
- Script E2E `demo-routes-and-payment.spec.ts` guna sanity-test demo pages dan alur pembayaran.

- Sistem autentikasi lengkap dengan NextAuth
  - Magic link email menggunakan Nodemailer
  - Google OAuth integration
  - Role-based access control (Owner, Admin, Kasir)
  - Prisma Adapter untuk session management

- Modul Kasir (POS)
  - Antarmuka scan barcode untuk produk
  - Sistem diskon per item dan diskon tambahan
  - Kalkulasi PPN otomatis berdasarkan pengaturan
  - Proses pembayaran mock (cash, QRIS, card)
  - Cetak struk PDF menggunakan pdf-lib
  - Format struk 58mm dan 80mm

- Manajemen Produk
  - CRUD produk dengan SKU, barcode, dan kategori
  - Manajemen kategori dan supplier
  - Konfigurasi harga, harga modal, dan markup
  - Sistem promo dengan tanggal mulai/akhir
  - Pengaturan diskon default per produk
  - Konfigurasi PPN per produk (taxable/non-taxable)

- Manajemen Stok
  - Penyesuaian stok (adjustment)
  - Transfer stok antar outlet
  - Stock opname (inventori fisik)

- Laporan Penjualan
  - Laporan harian dengan ringkasan transaksi
  - Total penjualan dan jumlah item terjual
  - Breakdown pembayaran per metode
  - Estimasi float kas untuk hari berikutnya

- Panel Pengaturan
  - Konfigurasi tarif PPN aktif
  - Pengaturan outlet dan NPWP
  - Batas diskon maksimal

- Database dan ORM
  - Skema Prisma lengkap dengan relasi
  - Migrasi database via Prisma
  - Seed script untuk data awal produk dari CSV
  - Support PostgreSQL/Supabase

- Testing Infrastructure
  - Unit tests dengan Vitest
  - E2E tests dengan Playwright
  - Mock service worker (MSW) untuk development tanpa backend

- Developer Experience
  - TypeScript strict mode
  - ESLint dengan Biome
  - Hot reload dengan Turbopack
  - Environment validation dengan Zod
  - tRPC untuk type-safe API
  - TanStack Query untuk data fetching

- UI/UX
  - shadcn/ui component library
  - Tailwind CSS 4 dengan custom accent colors
  - Responsive design
  - Framer Motion animations
  - Dark mode ready
  - Loading states dan optimistic updates

- Scripts Utilitas
  - `seed-supabase.mjs` - Import produk awal dari CSV
  - `seed-initial.mjs` - Setup data awal untuk testing
  - `check-env.mjs` - Validasi environment variables
  - `auth-post.mjs` - Test endpoint autentikasi
  - `create-magiclink.mjs` - Generate magic link untuk testing
  - `create-session.mjs` - Buat session untuk testing

- Documentation
  - README lengkap dengan setup guide
  - Panduan implementasi langkah demi langkah
  - Dokumentasi persiapan awal (checklist)
  - UI style guide

- CI/CD
  - GitHub Actions workflow untuk CI
  - Automated testing pada PR
  - Type checking dan linting
  - Build verification

### Changed

- Dokumentasi README/PROJECT_SUMMARY memperinci alur shift → sale → alert, filter low-stock, serta test matrix phase 1.
- Seed storyline diperbarui agar refund/void merepresentasikan aktivitas kasir nyata dan mengisi `ActivityLog`.
- NextAuth kini menggunakan strategi sesi JWT sehingga middleware edge dapat membaca token yang sama tanpa ketergantungan tabel `Session`.
- Navbar kini minimal saat belum login dan menampilkan avatar + outlet aktif ketika sesi ada.
- Tata letak modul kasir dirapikan menjadi grid dua kolom dengan ringkasan hierarkis dan validasi diskon sesuai kebijakan toko.
- Halaman kasir kini menampilkan kartu "Transaksi Terakhir" dengan tombol refund/void yang terhubung ke dialog konfirmasi stok.
- Halaman login dipisah menjadi tab Magic Link vs Email+Password dengan microcopy feedback.
- Tabel manajemen produk mendapatkan TanStack core (sticky header, resize, toggle kolom, ekspor CSV, dan persistensi localStorage).
- Tabel laporan harian dan empty state diperhalus agar lebih informatif.

- Optimasi query database dengan Prisma
- Peningkatan performa UI dengan animasi yang lebih smooth
- Perbaikan validation schema untuk input forms

### Fixed

- Debug logs di NextAuth options telah dihapus
- Session handling yang lebih robust
- Error handling untuk database connections
- Validasi email format yang lebih baik

### Security

- Environment variables validation
- SQL injection protection via Prisma
- XSS protection dengan proper escaping
- CSRF protection via NextAuth
- Role-based authorization pada semua endpoints

## [0.1.0] - 2025-10-14

### Added

- Initial project setup
- Basic structure and architecture
- Core dependencies dan tooling
