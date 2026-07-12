# 📦 Stock Management Pages - Documentation

Dokumentasi untuk halaman-halaman manajemen stok yang telah diimplementasikan sesuai konsep UX/UI premium.

---

## 📍 Halaman yang Tersedia

### 1. **Pergerakan Stok** (`/management/stock-movement`)
Halaman untuk memantau seluruh riwayat keluar/masuk stok dalam format ledger yang mudah dibaca.

**Fitur Utama:**
- ✅ **Ledger Style**: Grouped by date dengan separator visual
- ✅ **Icon Visual**: 
  - 🟢 `+` hijau untuk stok masuk
  - 🔴 `-` merah untuk stok keluar
  - 🔵 `↔` biru untuk transfer antar outlet
- ✅ **Filter Lengkap**:
  - Produk
  - Outlet
  - Jenis (Masuk/Keluar/Transfer)
  - Rentang Tanggal (Hari Ini/Minggu Ini/Bulan Ini)
- ✅ **Informasi Detail**:
  - Nama produk
  - Jumlah pergerakan
  - Outlet terkait
  - Actor (siapa yang melakukan)
  - Timestamp
  - Catatan/notes
- ✅ **Ekspor CSV**: Export data untuk analisis lebih lanjut
- ✅ **Responsive**: Desktop (card layout) & Mobile (compact list)

**Desktop View:**
- Date separator dengan floating divider
- Card per movement dengan border warna sesuai tipe
- Expand untuk detail catatan

**Mobile View:**
- Bottom sheet untuk filter
- Compact card layout
- Info penting tetap terlihat

---

### 2. **Transfer Stok Antar Outlet** (`/management/stock-transfer`)
Halaman untuk membuat dan melacak transfer stok antar outlet dengan audit lengkap.

**Fitur Utama:**
- ✅ **Daftar Transfer**:
  - Tabel desktop dengan status color-coded
  - Card list untuk mobile
  - Status: Pending (kuning), Completed (hijau), Cancelled (abu)
- ✅ **Detail Transfer** (Right Drawer):
  - Kode transfer (TRF-XXXX)
  - Outlet asal → tujuan
  - Daftar item yang ditransfer
  - Pembuat & timestamp
  - Catatan
  - Aksi: Tandai Selesai / Batalkan
- ✅ **Form Buat Transfer**:
  - Pilih outlet asal & tujuan
  - Tambah multiple items
  - Input quantity per item
  - Catatan opsional
  - Validasi lengkap
- ✅ **Dropdown Actions**: Lihat detail, tandai selesai, batalkan

**Status Management:**
- `pending`: Transfer baru dibuat, menunggu konfirmasi
- `completed`: Transfer selesai, stok sudah dipindahkan
- `cancelled`: Transfer dibatalkan

**Desktop View:**
- Tabel lengkap dengan semua info
- Drawer detail di kanan
- Modal dialog untuk create transfer

**Mobile View:**
- Card list dengan badge status
- Bottom sheet untuk detail
- Full screen dialog untuk create

---

### 3. **Laporan & Analitik** (`/management/reports`)
Dashboard laporan dengan metrics, grafik, dan analisis shift.

**Fitur Utama:**
- ✅ **Top Metrics Cards** (4 cards):
  - 💰 Total Penjualan (dengan trend %)
  - 🛒 Total Transaksi
  - 📦 Item Terjual
  - 📊 Rata-rata per Transaksi
- ✅ **Grafik Penjualan Harian**:
  - Bar chart penjualan per hari
  - Line chart tren transaksi
  - Interactive tooltip
  - Format currency otomatis
- ✅ **Item Terlaris**:
  - Top 5 produk terlaris
  - Jumlah terjual + revenue
  - Ranking dengan badge
- ✅ **Analisis Per Shift**:
  - Breakdown per shift (Pagi, Siang, Sore, Malam)
  - Penjualan, item, dan transaksi per shift
  - Time range & duration
- ✅ **Filter & Export**:
  - Filter outlet
  - Periode (Hari Ini/Minggu Ini/Bulan Ini/Custom)
  - Export PDF & CSV

**Charts Library:**
- Menggunakan **Recharts** untuk visualisasi data
- Responsive container
- Custom styling
- Smooth animations (120ms fade + grow)

**Desktop View:**
- Grid 4 kolom untuk metrics
- 2 kolom untuk charts
- 2 kolom untuk top items & shift

**Mobile View:**
- Grid 2 kolom untuk metrics
- Horizontal scroll untuk charts
- Stack layout untuk lists

---

## 🎨 Design Principles

### Color Coding
- **Hijau** (`green-600`): Stok masuk, completed, positive trend
- **Merah** (`red-600`): Stok keluar, negative actions
- **Biru** (`blue-600`): Transfer, neutral actions
- **Kuning** (`yellow-600`): Pending, waiting status
- **Abu** (`gray-600`): Cancelled, disabled

### Typography
- **Heading**: `text-3xl font-bold`
- **Subheading**: `text-muted-foreground`
- **Card Title**: `font-semibold text-sm uppercase`
- **Body**: `text-sm`
- **Caption**: `text-xs text-gray-600`

### Spacing
- Container: `container mx-auto px-4 py-6`
- Card padding: `p-4`
- Gap between elements: `gap-4` atau `space-y-4`
- Section spacing: `space-y-6`

### Micro-interactions
- Hover: `hover:bg-gray-50` atau `hover:shadow-md`
- Transition: `transition-all` atau `transition-colors`
- Border highlights: `border-l-4` dengan warna sesuai status
- Expand/collapse: `rotate-180` untuk icon

---

## 📱 Responsive Breakpoints

```tsx
// Desktop (lg: 1024px+)
- Grid 4 kolom untuk metrics
- Tabel full width
- Sidebar drawer untuk detail

// Tablet (md: 768px+)
- Grid 2-3 kolom
- Hybrid view

// Mobile (< 768px)
- Stack 1 kolom
- Bottom sheet untuk filter/detail
- Compact card layout
- Hide/show conditional
```

---

## 🔌 Integration Points

### API Endpoints (To be implemented)
```typescript
// Stock Movement
GET  /api/stock-movement?outlet=BSD&type=all&period=week
POST /api/stock-movement/export

// Stock Transfer
GET  /api/stock-transfer
POST /api/stock-transfer
PUT  /api/stock-transfer/:id/complete
PUT  /api/stock-transfer/:id/cancel

// Reports
GET  /api/reports/summary?outlet=BSD&period=week
GET  /api/reports/daily-sales
GET  /api/reports/top-items
GET  /api/reports/shift-analytics
POST /api/reports/export-pdf
POST /api/reports/export-csv
```

### Database Schema Needed
```prisma
model StockMovement {
  id          String   @id @default(cuid())
  type        String   // "in" | "out" | "transfer"
  productId   String
  quantity    Int
  outletId    String
  fromOutletId String?
  toOutletId   String?
  actorId     String
  reason      String
  notes       String?
  createdAt   DateTime @default(now())
  
  product     Product  @relation(fields: [productId])
  outlet      Outlet   @relation(fields: [outletId])
  actor       User     @relation(fields: [actorId])
}

model StockTransfer {
  id          String   @id @default(cuid())
  code        String   @unique
  fromOutletId String
  toOutletId   String
  status      String   // "pending" | "completed" | "cancelled"
  notes       String?
  createdById  String
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  fromOutlet  Outlet   @relation("TransferFrom", fields: [fromOutletId])
  toOutlet    Outlet   @relation("TransferTo", fields: [toOutletId])
  createdBy   User     @relation(fields: [createdById])
  items       TransferItem[]
}

model TransferItem {
  id          String   @id @default(cuid())
  transferId  String
  productId   String
  quantity    Int
  
  transfer    StockTransfer @relation(fields: [transferId])
  product     Product @relation(fields: [productId])
}
```

---

## 🚀 Next Steps

### Immediate
1. ✅ Implementasi UI sesuai wireframe
2. ✅ Responsive design (desktop & mobile)
3. ✅ Mock data untuk demo
4. ⏳ Connect ke real API
5. ⏳ Add Prisma schema
6. ⏳ Implement backend endpoints

### Enhancement
- [ ] Real-time updates (WebSocket/Polling)
- [ ] Advanced filters (date range picker)
- [ ] Export dengan logo & branding
- [ ] Print receipt transfer
- [ ] QR code untuk tracking transfer
- [ ] Push notification untuk low stock
- [ ] Batch operations
- [ ] Undo functionality
- [ ] History/audit log detail
- [ ] Permission & role-based access

### Testing
- [ ] Unit tests untuk components
- [ ] Integration tests untuk flows
- [ ] E2E tests untuk critical paths
- [ ] Performance testing
- [ ] Accessibility testing (WCAG)

---

## 📚 Component Library

### UI Components Used
- `Button` - Primary actions
- `Card` - Container wrapper
- `Table` - Desktop data display
- `Sheet` - Mobile drawers
- `Dialog` - Modals
- `Select` - Dropdowns
- `Input` - Text fields
- `Textarea` - Multi-line text
- `Badge` - Status indicators
- `Tabs` - Navigation (di master-data)
- `AlertDialog` - Confirmations

### Icons (Lucide React)
- `ArrowUp/ArrowDown/ArrowLeftRight` - Movement types
- `Plus/X/Check/Ban` - Actions
- `Filter/Download/Calendar` - Tools
- `MoreVertical` - Menu trigger
- `TrendingUp/DollarSign/ShoppingCart/Package` - Metrics

---

## 💡 Tips untuk Developer

### Performance
- Gunakan `useMemo` untuk filtered/grouped data
- Lazy load charts jika data besar
- Implement pagination untuk long lists
- Virtual scrolling untuk ribuan items

### Accessibility
- Semua actions memiliki label
- Keyboard navigation support
- Focus indicators jelas
- Color tidak satu-satunya indikator (icon + text)

### Best Practices
- Validasi input di client & server
- Error handling yang graceful
- Loading states untuk semua async operations
- Toast notification untuk feedback
- Confirmation untuk destructive actions

---

## 📞 Support

Jika ada pertanyaan atau butuh bantuan:
1. Check dokumentasi ini dulu
2. Lihat kode contoh di `/management/*`
3. Review wireframe di requirements doc
4. Contact: [Your Team/Email]

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Status:** ✅ UI Implementation Complete