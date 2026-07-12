# 🚀 Quick Start - Redesign Enterprise Minimalist

Panduan cepat untuk menggunakan komponen-komponen redesign yang baru.

---

## 📦 Komponen yang Tersedia

### 1. **OperationalOverview**
Menampilkan 4 metrik operasional utama dalam grid responsif.

```tsx
import { OperationalOverview } from "@/components/dashboard/operational-overview";

<OperationalOverview
  data={{
    revenue: 1500000,        // Total pendapatan hari ini
    transactions: 45,         // Jumlah transaksi
    itemsSold: 120,          // Total item terjual
    shiftStatus: {
      isActive: true,        // Shift sedang berjalan?
      startTime: new Date(), // Waktu mulai shift
      duration: "3j 25m",    // Durasi shift (opsional)
    },
  }}
/>
```

**Props**:
- `data.revenue`: number - Total pendapatan dalam IDR
- `data.transactions`: number - Jumlah transaksi
- `data.itemsSold`: number - Total unit terjual
- `data.shiftStatus.isActive`: boolean - Status shift
- `data.shiftStatus.startTime`: Date (opsional) - Waktu mulai
- `data.shiftStatus.duration`: string (opsional) - Format: "Xj Ym"

---

### 2. **QuickActions**
3 tombol aksi cepat dengan filtering berdasarkan role user.

```tsx
import { QuickActions } from "@/components/dashboard/quick-actions";

<QuickActions userRole="OWNER" />
```

**Props**:
- `userRole`: "OWNER" | "ADMIN" | "CASHIER" (default: "CASHIER")

**Behavior**:
- CASHIER: Hanya melihat "Buka Kasir"
- ADMIN/OWNER: Melihat semua (Kasir, Produk, Laporan)

---

### 3. **AlertsSection**
Menampilkan notifikasi penting dengan severity levels.

```tsx
import { AlertsSection } from "@/components/dashboard/alerts-section";

const alerts = [
  {
    id: "low-stock-1",
    type: "low-stock",
    title: "Stok Hampir Habis",
    count: 12,
    href: "/management/products?filter=low-stock",
    severity: "high",
  },
  {
    id: "refund-1",
    type: "refund",
    title: "Refund Pending",
    count: 3,
    href: "/cashier/receipts?filter=refund",
    severity: "medium",
  },
];

<AlertsSection alerts={alerts} />
```

**Props**:
- `alerts`: Array of Alert objects

**Alert Object**:
```typescript
{
  id: string;           // Unique identifier
  type: "low-stock" | "refund" | "qris-pending" | "warning";
  title: string;        // Alert title
  count?: number;       // Optional count badge
  href?: string;        // Optional link
  severity: "high" | "medium" | "low";
}
```

**Severity Colors**:
- `high`: Red (urgent)
- `medium`: Amber (warning)
- `low`: Sky (info)

---

### 4. **MiniCharts**
Menampilkan grafik penjualan dan produk terlaris.

```tsx
import { MiniCharts } from "@/components/dashboard/mini-charts";

const salesData = [
  { hour: "09:00", amount: 250000 },
  { hour: "10:00", amount: 350000 },
  { hour: "11:00", amount: 500000 },
  // ... 12 hours
];

const topProducts = [
  { id: "1", name: "Produk A", sold: 50, revenue: 500000 },
  { id: "2", name: "Produk B", sold: 35, revenue: 350000 },
  // ... max 5 items
];

<MiniCharts
  salesData={salesData}
  topProducts={topProducts}
  isLoading={false}
/>
```

**Props**:
- `salesData`: Array of { hour: string, amount: number }
- `topProducts`: Array of { id, name, sold, revenue }
- `isLoading`: boolean (default: false)

**Features**:
- Collapsible pada mobile
- Hover tooltip pada bar chart
- Skeleton UI saat loading

---

### 5. **MobileDock**
Bottom navigation bar untuk mobile.

```tsx
import { MobileDock } from "@/components/dashboard/mobile-dock";

<MobileDock userRole="ADMIN" />
```

**Props**:
- `userRole`: "OWNER" | "ADMIN" | "CASHIER" (default: "CASHIER")

**Behavior**:
- Auto-hidden di desktop (`lg:hidden`)
- Fixed bottom dengan backdrop blur
- Active state berdasarkan current pathname

---

## 🎨 Styling Guidelines

### Card Standard
```tsx
<Card className="border border-border/50 p-5 
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]
  transition-all duration-150 hover:shadow-md hover:scale-[1.01]">
  {/* Content */}
</Card>
```

### Section Heading
```tsx
<h2 className="text-sm font-semibold uppercase tracking-wider 
  text-muted-foreground">
  Section Title
</h2>
```

### Icon Standard
```tsx
<Icon className="h-5 w-5 stroke-[1.5] text-primary" />
```

### Icon Container
```tsx
<div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
  <TrendingUp className="h-5 w-5 stroke-[1.5]" />
</div>
```

### Gradient Card (Action)
```tsx
<Card className="border border-emerald-200/60 
  bg-gradient-to-br from-emerald-50/50 to-white
  hover:border-emerald-300
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]
  transition-all duration-150">
  {/* Content */}
</Card>
```

---

## 📱 Responsive Patterns

### Grid 2→4 Columns
```tsx
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
  {/* Metric cards */}
</div>
```

### Grid 2→3 Columns
```tsx
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
  {/* Action/Alert cards */}
</div>
```

### Hide on Mobile
```tsx
<div className="hidden lg:block">
  {/* Desktop only */}
</div>
```

### Hide on Desktop
```tsx
<div className="lg:hidden">
  {/* Mobile only */}
</div>
```

### Bottom Spacing (untuk dock)
```tsx
<div className="pb-20 lg:pb-10">
  {/* Content with space for mobile dock */}
</div>
```

---

## 🔧 Common Patterns

### Loading State
```tsx
{isLoading ? (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="mt-2 h-8 w-24 rounded bg-muted" />
    </CardContent>
  </Card>
) : (
  <YourComponent data={data} />
)}
```

### Empty State
```tsx
{items.length === 0 ? (
  <div className="flex h-40 items-center justify-center 
    text-sm text-muted-foreground">
    Belum ada data
  </div>
) : (
  <YourList items={items} />
)}
```

### Conditional Rendering by Role
```tsx
const canAccessManagement = ["OWNER", "ADMIN"].includes(userRole);

{canAccessManagement && (
  <Button asChild>
    <Link href="/management/products">Kelola Produk</Link>
  </Button>
)}
```

---

## 📊 Data Integration Example

### Dashboard Page dengan tRPC
```tsx
"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { differenceInMinutes } from "date-fns";
import { useOutlet } from "@/lib/outlet-context";
import { api } from "@/trpc/client";

import { OperationalOverview } from "@/components/dashboard/operational-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { MiniCharts } from "@/components/dashboard/mini-charts";
import { MobileDock } from "@/components/dashboard/mobile-dock";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { currentOutlet, activeShift } = useOutlet();
  const role = session?.user?.role ?? "CASHIER";

  // Fetch sales summary
  const { data: todaySummary, isLoading } = api.sales.getDailySummary.useQuery(
    {
      date: new Date().toISOString(),
      outletId: currentOutlet?.id,
    },
    { 
      enabled: Boolean(currentOutlet?.id), 
      refetchInterval: 30_000 // Poll every 30s
    }
  );

  // Fetch low stock alerts
  const { data: lowStockAlerts } = api.inventory.listLowStock.useQuery(
    { outletId: currentOutlet?.id ?? "", limit: 10 },
    { 
      enabled: Boolean(currentOutlet?.id), 
      refetchInterval: 60_000 // Poll every 60s
    }
  );

  // Calculate metrics
  const operationalData = useMemo(() => {
    const sales = todaySummary?.sales ?? [];
    const revenue = sales.reduce((sum, sale) => sum + sale.totalNet, 0);
    const itemsSold = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    const shiftDuration = activeShift?.openTime
      ? differenceInMinutes(new Date(), new Date(activeShift.openTime))
      : 0;
    const hours = Math.floor(shiftDuration / 60);
    const minutes = shiftDuration % 60;

    return {
      revenue,
      transactions: sales.length,
      itemsSold,
      shiftStatus: {
        isActive: Boolean(activeShift),
        startTime: activeShift?.openTime 
          ? new Date(activeShift.openTime) 
          : undefined,
        duration: hours > 0 ? `${hours}j ${minutes}m` : undefined,
      },
    };
  }, [todaySummary, activeShift]);

  // Generate alerts
  const alerts = useMemo(() => {
    const result = [];
    if (lowStockAlerts && lowStockAlerts.length > 0) {
      result.push({
        id: "low-stock",
        type: "low-stock",
        title: "Stok Hampir Habis",
        count: lowStockAlerts.length,
        href: "/management/products?filter=low-stock",
        severity: "high",
      });
    }
    return result;
  }, [lowStockAlerts]);

  return (
    <>
      <div className="flex flex-col gap-6 pb-20 lg:pb-10">
        <OperationalOverview data={operationalData} />
        <QuickActions userRole={role} />
        {alerts.length > 0 && <AlertsSection alerts={alerts} />}
        {/* Add charts, etc. */}
      </div>
      <MobileDock userRole={role} />
    </>
  );
}
```

---

## 🎯 Color Variants

### Success (Emerald)
```tsx
// Background
className="bg-emerald-50/50"

// Icon
className="text-emerald-600"

// Border
className="border-emerald-200/60"

// Gradient card
className="border-emerald-200/60 bg-gradient-to-br 
  from-emerald-50/50 to-white hover:border-emerald-300"
```

### Info (Sky)
```tsx
className="bg-sky-50/50"
className="text-sky-600"
className="border-sky-200/60"
className="border-sky-200/60 bg-gradient-to-br 
  from-sky-50/50 to-white hover:border-sky-300"
```

### Warning (Amber)
```tsx
className="bg-amber-50/50"
className="text-amber-600"
className="border-amber-200/60"
className="border-amber-200/60 bg-gradient-to-br 
  from-amber-50/50 to-white hover:border-amber-300"
```

### Error (Red)
```tsx
className="bg-red-50/50"
className="text-red-600"
className="border-red-200/60"
className="border-red-200/60 bg-gradient-to-r 
  from-red-50/50 to-white hover:border-red-300"
```

---

## ✅ Checklist Implementasi

Saat membuat halaman baru dengan redesign:

- [ ] Import komponen dari `@/components/dashboard/`
- [ ] Gunakan grid responsif: `grid-cols-2 lg:grid-cols-4`
- [ ] Tambahkan spacing: `gap-3 lg:gap-4`
- [ ] Gunakan shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- [ ] Icon dengan stroke: `stroke-[1.5]`
- [ ] Hover effect: `hover:scale-[1.01] hover:shadow-md`
- [ ] Transition: `transition-all duration-150`
- [ ] Bottom spacing: `pb-20 lg:pb-10` (jika ada mobile dock)
- [ ] Loading state dengan skeleton UI
- [ ] Empty state dengan pesan yang jelas
- [ ] Filter berdasarkan role user jika perlu
- [ ] Mobile dock jika halaman utama: `<MobileDock userRole={role} />`

---

## 🔗 Referensi Lengkap

- **Design System**: `DESIGN_SYSTEM.md`
- **Redesign Summary**: `REDESIGN_SUMMARY.md`
- **Component Files**:
  - `src/components/dashboard/operational-overview.tsx`
  - `src/components/dashboard/quick-actions.tsx`
  - `src/components/dashboard/alerts-section.tsx`
  - `src/components/dashboard/mini-charts.tsx`
  - `src/components/dashboard/mobile-dock.tsx`

---

## 💡 Tips

1. **Selalu gunakan `cn()` utility** untuk conditional classes:
   ```tsx
   import { cn } from "@/lib/utils";
   
   <div className={cn(
     "base-classes",
     isActive && "active-classes",
     isPending && "pending-classes"
   )} />
   ```

2. **Format currency konsisten**:
   ```typescript
   const formatCurrency = (amount: number) => {
     return new Intl.NumberFormat("id-ID", {
       style: "currency",
       currency: "IDR",
       minimumFractionDigits: 0,
       maximumFractionDigits: 0,
     }).format(amount);
   };
   ```

3. **Polling interval standar**:
   - Sales data: 30 detik
   - Inventory: 60 detik
   - Shift status: 30 detik

4. **Mobile-first thinking**:
   - Mulai dengan 1-2 kolom
   - Expand ke 3-4 kolom di desktop
   - Collapsible untuk konten tidak kritikal

5. **Accessibility**:
   - Tambahkan `aria-label` untuk icon-only buttons
   - Gunakan `aria-hidden="true"` untuk decorative elements
   - Test dengan keyboard navigation

---

**Happy coding! 🚀**