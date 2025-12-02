# 📊 Owner Dashboard - Enterprise POS System

## Overview

The Owner Dashboard is a comprehensive, enterprise-grade analytics and monitoring interface designed for business owners to oversee multiple outlets, track performance metrics, monitor staff activities, and manage inventory across their entire POS system.

**Access URL**: `/dashboard/owner`

**Role Required**: `OWNER` (can be extended to `ADMIN` with view-only permissions)

---

## 🎯 Design Principles

### Data-First Approach
- **Large Numbers**: Key metrics displayed prominently with 2-3 digit emphasis
- **Trends**: Visual indicators (↑↓) with percentage changes
- **Comparisons**: Period-over-period analysis for all KPIs
- **Real-time Updates**: Live indicators for active shifts and current operations

### Context-Aware Interface
- **Outlet Selection**: Filter all data by specific outlet or view aggregated data
- **Date Range Filtering**: Flexible time period selection with presets
- **Responsive Design**: Full feature parity between desktop and mobile

### Predictive & Actionable
- **Trend Analysis**: Automatic detection of rising/falling patterns
- **Smart Alerts**: Proactive warnings for low stock, anomalies
- **Quick Actions**: Direct navigation to problem areas
- **Export Options**: CSV download for external analysis

### Premium Visual Design
- **Minimal Clutter**: Clean white/light backgrounds with generous spacing
- **Smooth Animations**: Framer Motion-powered micro-interactions
- **Typography**: Sharp, scannable text hierarchy
- **Color System**: Semantic colors for trends (green=up, red=down)

---

## 📐 Layout Structure

### Desktop Layout (1280-1440px)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏪 Dashboard Owner                        [📥 Export Data]       │
│ Pantau performa seluruh outlet...                               │
├─────────────────────────────────────────────────────────────────┤
│ Outlet: [Semua Outlet ▼]  Periode: [Date Range Picker]          │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│ │ Total   │ │ Total   │ │ Item    │ │ Profit  │  KPI Cards   │
│ │ Penjual │ │ Transak │ │ Terjual │ │ Rp8.3M  │               │
│ │ Rp28.5M │ │ 912     │ │ 3,889   │ │ ↑ 15%   │               │
│ │ ↑ 12%   │ │ ↑ 5%    │ │ ↑ 8%    │ │         │               │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────┐          │
│ │ Penjualan Harian       │ │ Kontribusi Kategori    │ Charts  │
│ │ [Bar Chart]            │ │ [Donut Chart]          │          │
│ │                        │ │ • Minuman 43%          │          │
│ └────────────────────────┘ │ • Sembako 28%          │          │
│                             │ • ATK 14%              │          │
│                             └────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│ 🏪 Performa Outlet                                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Outlet    │ Penjualan │ Transaksi │ Avg Ticket │ Status    ││
│ │ BSD       │ Rp12.5M   │ 380       │ Rp32.800   │ ↑ 8%      ││
│ │ BR2       │ Rp9.2M    │ 295       │ Rp31.100   │ ↑ 3%      ││
│ │ Gudang    │ Rp6.8M    │ 237       │ Rp28.900   │ ↓ 2%      ││
│ └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐              │
│ │ ⚠️ Stok Hampir Habis │ │ 🕐 Shift Aktif       │              │
│ │ 12 item perlu        │ │ Sari • Rp320K        │              │
│ │ perhatian            │ │ 28 trx • 🟢 LIVE     │              │
│ │ • Air Mineral (0)    │ │                      │              │
│ │ • Gula Pasir (3)     │ │ [Previous Shifts]    │              │
│ │ [Lihat Semua]        │ │                      │              │
│ └──────────────────────┘ └──────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Aktivitas Terbaru                                             │
│ • +12 stok masuk ke BSD (Admin) • 15 menit lalu                │
│ • Transfer 15 item BSD → BR2 (Owner) • 30 menit lalu           │
│ • Refund Rp30.000 (Kasir Ani) • 45 menit lalu                  │
│ • Edit produk "Beras Premium" (Admin) • 1 jam lalu             │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Stack Layout)

All sections stack vertically with optimized card views:
- Compact KPI cards (2 columns)
- Horizontally scrollable charts
- Card-based outlet performance list
- Collapsible low stock watchlist
- Simplified shift monitoring
- Timeline-style activity log

---

## 🧩 Component Architecture

### 1. KpiCard
**Location**: `src/components/dashboard/owner/kpi-card.tsx`

**Props**:
```typescript
interface KpiCardProps {
  title: string;           // e.g., "Total Penjualan"
  value: string | number;  // e.g., "Rp28.5M" or 912
  trend?: {
    value: number;         // Percentage change
    direction: "up" | "down" | "neutral";
  };
  suffix?: string;         // Optional unit suffix
  className?: string;
  delay?: number;          // Animation delay multiplier
}
```

**Features**:
- Animated entry with stagger effect
- Hover effect: scale 1.01 + shadow
- Trend badge with color coding
- Large, bold numbers for scannability
- Background gradient on hover

**Usage**:
```tsx
<KpiCard
  title="Total Penjualan"
  value="Rp 28.5M"
  trend={{ value: 12, direction: "up" }}
  delay={0}
/>
```

---

### 2. SalesChart
**Location**: `src/components/dashboard/owner/sales-chart.tsx`

**Props**:
```typescript
interface SalesChartProps {
  data: Array<{
    label: string;    // X-axis label (e.g., "Sen", "Sel")
    value: number;    // Sales value in IDR
    target?: number;  // Optional target line
  }>;
  type?: "line" | "bar";
  title?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}
```

**Features**:
- Recharts-powered visualization
- Custom tooltip with formatted currency
- Automatic trend calculation
- Smooth animations (1500ms)
- Responsive container
- Compact axis labels with K/M formatting

**Chart Types**:
- **Line Chart**: For continuous time series
- **Bar Chart**: For discrete periods (default)

---

### 3. CategoryChart
**Location**: `src/components/dashboard/owner/category-chart.tsx`

**Props**:
```typescript
interface CategoryChartProps {
  data: Array<{
    name: string;    // Category name
    value: number;   // Sales amount
    color?: string;  // Optional custom color
  }>;
  title?: string;
  height?: number;
  className?: string;
}
```

**Features**:
- Donut/Pie chart with Recharts
- Legend with percentage and absolute values
- Hover effects on legend items
- Automatic color assignment from theme
- Custom tooltip with percentage breakdown

---

### 4. OutletPerformanceTable
**Location**: `src/components/dashboard/owner/outlet-performance-table.tsx`

**Props**:
```typescript
interface OutletPerformanceTableProps {
  data: OutletPerformance[];
  onOutletClick?: (outletId: string) => void;
  className?: string;
}

interface OutletPerformance {
  id: string;
  name: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  trend: {
    value: number;
    direction: "up" | "down";
  };
}
```

**Features**:
- Desktop: Full table with sortable columns
- Mobile: Card-based layout
- Clickable rows for drill-down
- Trend indicators with color coding
- Animated row entry
- Icon indicators per outlet

---

### 5. LowStockWatchlist
**Location**: `src/components/dashboard/owner/low-stock-watchlist.tsx`

**Props**:
```typescript
interface LowStockWatchlistProps {
  data: LowStockItem[];
  maxDisplay?: number;      // Default: 5
  onViewAll?: () => void;
  className?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  severity: "critical" | "low" | "warning";
}
```

**Features**:
- Severity-based color coding
- Compact list view
- "View All" navigation button
- Empty state with icon
- Responsive card layout

**Severity Levels**:
- **Critical**: Red badge (stock = 0)
- **Low**: Orange badge (stock < 25% of min)
- **Warning**: Amber badge (stock < 50% of min)

---

### 6. ShiftMonitoring
**Location**: `src/components/dashboard/owner/shift-monitoring.tsx`

**Props**:
```typescript
interface ShiftMonitoringProps {
  data: ShiftData[];
  title?: string;
  className?: string;
}

interface ShiftData {
  id: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  sales: number;
  transactions: number;
  isActive: boolean;
}
```

**Features**:
- Live indicator with pulsing animation
- Desktop: Table format
- Mobile: Card with metrics grid
- Time range display
- Real-time sales updates
- Cashier avatar icons

**Live Indicator**:
```tsx
<motion.div
  animate={{
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  }}
  className="h-2 w-2 rounded-full bg-emerald-500"
/>
```

---

### 7. ActivityLog
**Location**: `src/components/dashboard/owner/activity-log.tsx`

**Props**:
```typescript
interface ActivityLogProps {
  data: ActivityEvent[];
  maxDisplay?: number;
  title?: string;
  className?: string;
}

interface ActivityEvent {
  id: string;
  type: "stock_in" | "stock_out" | "transfer" | "refund" | "product_edit" | "user_action" | "other";
  title: string;
  description?: string;
  user: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    quantity?: number;
    from?: string;
    to?: string;
  };
}
```

**Features**:
- Timeline layout with connecting lines
- Icon indicators per event type
- Relative timestamps ("15 menit lalu")
- User attribution
- Metadata badges (quantity, amount, transfer locations)
- Hover effects on timeline items

**Event Types & Colors**:
- `stock_in`: Green (Plus icon)
- `stock_out`: Red (Minus icon)
- `transfer`: Blue (ArrowRightLeft icon)
- `refund`: Orange (RefreshCcw icon)
- `product_edit`: Violet (Edit icon)
- `user_action`: Gray (User icon)

---

### 8. DateRangePicker
**Location**: `src/components/dashboard/owner/date-range-picker.tsx`

**Props**:
```typescript
interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}
```

**Features**:
- Preset buttons: Today, Yesterday, Last 7 Days, Last 30 Days, This Month
- Desktop: Inline buttons + date display
- Mobile: Dropdown selector + date display
- Automatic date calculation
- Formatted display (Indonesian locale)

---

## 🎨 Animation & Micro-Interactions

### Entry Animations
All major sections use staggered entry animations:
```typescript
// KPI Cards
delay={index * 0.1}

// Table rows
delay={0.5 + index * 0.05}

// Chart elements
duration: 1500ms, easing: "ease-out"
```

### Hover States
- **KPI Cards**: `scale: 1.01`, soft shadow
- **Table Rows**: Background color change
- **Buttons**: Standard Radix UI hover states
- **Chart Elements**: Tooltip with fade-in

### Live Indicators
Pulsing dot animation for active shifts:
```css
scale: [1, 1.2, 1]
opacity: [0.5, 1, 0.5]
duration: 2s
repeat: Infinity
```

### Reduced Motion
All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  .card-gradient-shimmer::after { 
    animation: none !important; 
  }
}
```

---

## 📊 Data Integration

### Current Implementation (Mock Data)
The page currently uses `useMemo` to generate mock data for demonstration.

### Production Integration (TODO)

Replace mock data with TRPC queries:

```typescript
// KPI Data
const { data: kpiData } = api.analytics.getKpiSummary.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  dateRange: { from: dateRange.from, to: dateRange.to },
}, {
  refetchInterval: 30_000, // 30 seconds
});

// Sales Chart Data
const { data: salesData } = api.analytics.getSalesTrend.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  dateRange: { from: dateRange.from, to: dateRange.to },
  granularity: "daily", // or "hourly", "weekly"
});

// Category Data
const { data: categoryData } = api.analytics.getCategoryBreakdown.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  dateRange: { from: dateRange.from, to: dateRange.to },
});

// Outlet Performance
const { data: outletPerformance } = api.analytics.getOutletComparison.useQuery({
  dateRange: { from: dateRange.from, to: dateRange.to },
});

// Low Stock
const { data: lowStock } = api.inventory.listLowStock.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  limit: 10,
}, {
  refetchInterval: 60_000, // 1 minute
});

// Active Shifts
const { data: shifts } = api.shifts.listActiveShifts.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  date: new Date().toISOString(),
}, {
  refetchInterval: 30_000, // 30 seconds
});

// Activity Log
const { data: activities } = api.audit.getRecentActivities.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  limit: 10,
});
```

---

## 🔐 Access Control

### Role-Based Access
```typescript
// middleware.ts or page guard
if (session.user.role !== "OWNER") {
  redirect("/dashboard");
}
```

### Feature Permissions
- **OWNER**: Full access to all outlets, all features
- **ADMIN**: View-only access (optional implementation)
- **CASHIER**: No access to owner dashboard

---

## 📱 Responsive Behavior

### Breakpoints
- **Mobile**: < 1024px (lg breakpoint)
- **Desktop**: >= 1024px

### Mobile Optimizations
1. **KPI Cards**: 2-column grid instead of 4-column
2. **Charts**: Reduced height, horizontal scroll for legends
3. **Tables**: Converted to card-based lists
4. **Filters**: Stacked vertically, dropdown selects
5. **Date Picker**: Mobile-optimized select component
6. **Export Button**: Full-width at bottom of filters

### Touch Interactions
- Active states on tap (`:active` pseudo-class)
- No hover effects on mobile
- Larger touch targets (min 44x44px)

---

## 🚀 Performance Optimizations

### Memoization
All data transformations are wrapped in `useMemo`:
```typescript
const mockData = useMemo(() => {
  // Complex calculations here
}, [selectedOutlet, dateRange]);
```

### Code Splitting
Components are imported directly (not lazy-loaded) as they're all needed for initial render.

### Chart Optimization
- Limited data points (max 30 for line charts)
- Debounced hover interactions
- RequestAnimationFrame for smooth animations

### Bundle Size
- Recharts: ~100KB (gzipped)
- Framer Motion: ~30KB (gzipped)
- Total page bundle: ~150-200KB

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test KPI card rendering
it("should display trend indicator correctly", () => {
  render(<KpiCard value="100" trend={{ value: 12, direction: "up" }} />);
  expect(screen.getByText("12%")).toBeInTheDocument();
  expect(screen.getByTestId("trend-up-icon")).toBeInTheDocument();
});
```

### Integration Tests
```typescript
// Test date range filtering
it("should update all sections when date range changes", () => {
  const { rerender } = render(<OwnerDashboardPage />);
  // Change date range
  // Verify all sections reflect new data
});
```

### E2E Tests (Playwright)
```typescript
test("owner can navigate to outlet detail from performance table", async ({ page }) => {
  await page.goto("/dashboard/owner");
  await page.click('tr:has-text("BSD")');
  await expect(page).toHaveURL(/\/reports\/outlet\/bsd/);
});
```

---

## 📈 Future Enhancements

### Phase 2 Features
- [ ] Real-time WebSocket updates for live data
- [ ] Customizable dashboard layouts (drag & drop)
- [ ] Saved filter presets
- [ ] Scheduled email reports
- [ ] Advanced export formats (PDF, Excel)
- [ ] Custom date range selector (calendar picker)
- [ ] Comparison mode (compare two periods)
- [ ] Goal setting and tracking

### Phase 3 Features
- [ ] Predictive analytics (ML-based forecasting)
- [ ] Anomaly detection alerts
- [ ] Mobile app with push notifications
- [ ] Voice commands for hands-free operation
- [ ] Multi-currency support
- [ ] Advanced filtering (by product, category, cashier)
- [ ] Heat map visualizations
- [ ] Export to BI tools (Tableau, Power BI)

---

## 🐛 Troubleshooting

### Chart Not Rendering
**Issue**: Recharts chart appears blank or throws error.

**Solution**:
1. Check that `window` is defined (client-side only)
2. Verify data array is not empty
3. Ensure numeric values are valid numbers (not NaN)
4. Check that chart colors are valid HSL values

```typescript
// Add defensive check
if (!data || data.length === 0) {
  return <EmptyState />;
}
```

### Animation Performance Issues
**Issue**: Animations are janky or laggy.

**Solution**:
1. Enable GPU acceleration: `transform: translateZ(0)`
2. Limit number of animated elements
3. Use `will-change` CSS property sparingly
4. Check for layout thrashing (excessive reflows)

### Date Range Picker Not Updating
**Issue**: Selecting a preset doesn't update the data.

**Solution**:
1. Verify `onChange` callback is called
2. Check that parent state is updated
3. Ensure `useMemo` dependencies include `dateRange`

---

## 📚 Related Documentation

- [Premium Products UI](../PREMIUM_PRODUCT_UI.md)
- [Design System](../DESIGN_SYSTEM.md)
- [API Documentation](../API.md)
- [Dashboard Components](../DASHBOARD_COMPONENTS.md)

---

## 🤝 Contributing

When adding new features to the Owner Dashboard:

1. **Follow existing patterns**: Use the same animation delays, color schemes, and layout structures
2. **Mobile-first**: Design for mobile, enhance for desktop
3. **Accessibility**: Ensure keyboard navigation, screen reader support, proper ARIA labels
4. **Performance**: Profile with React DevTools, optimize render cycles
5. **Documentation**: Update this doc with new components and features

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready (with mock data)