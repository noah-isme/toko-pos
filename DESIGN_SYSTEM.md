# Design System - Toko POS Enterprise Minimalist

## 🎯 Prinsip Desain

### 1. **Operasional First**
- Fokus pada tindakan operasional, bukan dokumentasi
- Kasir dan owner dapat langsung bekerja tanpa bingung
- Setiap elemen mendukung workflow harian

### 2. **Minimalis Premium**
- Banyak white space untuk mata tidak lelah
- Kartu rendah (height 90-140px) agar terasa lapang
- Shadow lembut (1-2px, opacity rendah)
- Border tipis dengan opacity rendah

### 3. **Context-Aware**
- Outlet aktif mempengaruhi seluruh konten
- Role user (Owner/Admin/Kasir) mengatur akses menu
- Data real-time via tRPC dengan polling 30-60 detik

### 4. **Cepat & Ringan**
- Animasi subtle (150ms max)
- Micro-interactions minimal tapi efektif
- Lazy loading untuk chart dan data berat

---

## 🎨 Design Tokens

### Colors

#### Primary Palette
- **Primary**: Emerald-based untuk CTA utama
- **Secondary**: Sky-based untuk navigasi
- **Tertiary**: Amber-based untuk warning/alerts

#### Semantic Colors
```css
/* Success */
bg-emerald-50/50   /* Background */
text-emerald-600   /* Icon/Text */
border-emerald-200/60 /* Border */

/* Info */
bg-sky-50/50       /* Background */
text-sky-600       /* Icon/Text */
border-sky-200/60  /* Border */

/* Warning */
bg-amber-50/50     /* Background */
text-amber-600     /* Icon/Text */
border-amber-200/60 /* Border */

/* Error */
bg-red-50/50       /* Background */
text-red-600       /* Icon/Text */
border-red-200/60  /* Border */
```

### Typography

#### Font Scale
- **Hero**: `text-3xl lg:text-4xl` (30px → 36px)
- **H1**: `text-xl lg:text-2xl` (20px → 24px)
- **H2**: `text-base` (16px)
- **Body**: `text-sm` (14px)
- **Caption**: `text-xs` (12px)
- **Label**: `text-[9px] lg:text-[10px]` uppercase tracking-wider

#### Font Weights
- **Semibold**: `font-semibold` (600) - Headings
- **Medium**: `font-medium` (500) - Labels
- **Normal**: `font-normal` (400) - Body text

### Spacing

#### Gap Scale
```css
gap-2    /* 8px - Tight elements */
gap-3    /* 12px - Default card grid */
gap-4    /* 16px - Section spacing */
gap-6    /* 24px - Major sections (mobile) */
gap-8    /* 32px - Major sections (desktop) */
```

#### Padding Scale
```css
p-2      /* 8px - Icon containers */
p-3      /* 12px - Compact cards */
p-4      /* 16px - Alert cards */
p-5      /* 20px - Standard cards */
p-6      /* 24px - Feature cards */
p-8      /* 32px - Hero sections */
```

### Shadows

```css
/* Minimal elevation */
shadow-[0_1px_3px_rgba(0,0,0,0.06)]

/* Hover state */
shadow-md

/* Modal/Dialog */
shadow-lg
```

### Border Radius

```css
rounded-lg    /* 8px - Icons, small cards */
rounded-xl    /* 12px - Standard cards */
rounded-2xl   /* 16px - Hero sections */
rounded-full  /* Pills, avatars */
```

### Borders

```css
/* Default */
border border-border/50

/* Gradient cards */
border-emerald-200/60
border-sky-200/60
border-amber-200/60
```

---

## 📐 Layout System

### Grid Patterns

#### Desktop Metrics (4 columns)
```jsx
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
  {/* Metric cards */}
</div>
```

#### Quick Actions (3 columns)
```jsx
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
  {/* Action cards */}
</div>
```

#### Alerts (3 columns)
```jsx
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
  {/* Alert cards */}
</div>
```

#### Charts (2 columns)
```jsx
<div className="grid gap-4 lg:grid-cols-2">
  {/* Chart cards */}
</div>
```

### Responsive Breakpoints

- **Mobile**: `< 768px` - Stack vertically, 2-col metrics
- **Tablet**: `768px - 1024px` - 2-col layout, some side-by-side
- **Desktop**: `> 1024px` - Full 3-4 col grid
- **Wide**: `> 1280px` - Side documentation panel

---

## 🧩 Component Patterns

### 1. Metric Card

**Height**: 90-110px  
**Usage**: Operational overview (revenue, transactions, items sold, shift)

```jsx
<Card className="relative overflow-hidden border border-border/50 p-5 
  transition-all duration-150 hover:shadow-md hover:scale-[1.01]
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-foreground">
        {value}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {subtitle}
      </p>
    </div>
    <div className="rounded-lg bg-emerald-50/50 p-2">
      <Icon className="h-5 w-5 text-emerald-600 stroke-[1.5]" />
    </div>
  </div>
</Card>
```

### 2. Quick Action Card

**Height**: Auto (min ~120px)  
**Usage**: Main navigation to Kasir, Produk, Laporan

```jsx
<Card className="border p-5 transition-all duration-150
  hover:scale-[1.01] hover:shadow-md
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]
  border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white">
  <div className="flex flex-col gap-4">
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-white p-2.5 shadow-sm text-emerald-600">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-sm font-medium 
      text-muted-foreground group-hover:text-foreground">
      <span>Buka</span>
      <ArrowRight className="h-4 w-4 stroke-[1.5]" />
    </div>
  </div>
</Card>
```

### 3. Alert Card

**Height**: 64-80px  
**Usage**: Low stock, pending refunds, QRIS pending

```jsx
<Card className="border p-4 transition-all duration-150
  hover:scale-[1.01] hover:shadow-md
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]
  border-amber-200/60 bg-gradient-to-r from-amber-50/50 to-white">
  <div className="flex items-center gap-3">
    <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
      <AlertTriangle className="h-5 w-5 stroke-[1.5]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground truncate">
          {title}
        </h3>
        <Badge variant="outline" className="text-xs bg-amber-100 
          text-amber-700 border-amber-200">
          {count} item
        </Badge>
      </div>
    </div>
  </div>
</Card>
```

### 4. Chart Card

**Height**: 240-300px (with header)  
**Usage**: Sales chart, top products

```jsx
<Card className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
        <TrendingUp className="h-4 w-4 stroke-[1.5]" />
      </div>
      <CardTitle className="text-base font-semibold">
        {title}
      </CardTitle>
    </div>
    <p className="text-xs text-muted-foreground">
      {subtitle}
    </p>
  </CardHeader>
  <CardContent>
    {/* Chart content */}
  </CardContent>
</Card>
```

---

## 🎭 Animation & Interactions

### Hover Effects

```css
/* Cards */
hover:scale-[1.01]
hover:shadow-md
transition-all duration-150

/* Buttons */
hover:bg-primary/90
transition-colors duration-150

/* Icons with translate */
group-hover:translate-x-0.5
transition-transform
```

### Loading States

```jsx
{isLoading ? (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-5 w-32 rounded bg-muted" />
    </CardHeader>
    <CardContent>
      <div className="h-40 rounded bg-muted" />
    </CardContent>
  </Card>
) : (
  // Actual content
)}
```

### Pulsing Indicators

```jsx
{/* Shift active indicator */}
<div className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-500" />
```

### Collapsible Sections (Mobile)

```jsx
const [expanded, setExpanded] = useState(true);

<CardContent className={cn(
  "transition-all duration-150",
  !expanded && "hidden lg:block"
)}>
  {/* Content */}
</CardContent>
```

---

## 📱 Mobile Optimizations

### Bottom Dock

**Position**: Fixed bottom  
**Background**: `bg-white/80 backdrop-blur-md`  
**Height**: 60px + safe-area

```jsx
<nav className="fixed bottom-0 left-0 right-0 z-40 
  border-t border-border bg-white/80 backdrop-blur-md 
  supports-[backdrop-filter]:bg-white/80 lg:hidden">
  <div className="mx-auto flex max-w-screen-sm items-center 
    justify-around px-4 pb-safe">
    {/* Dock items */}
  </div>
</nav>
```

### Touch Targets

- **Minimum**: 44px × 44px
- **Preferred**: 48px × 48px for primary actions
- Use `min-h-[44px] min-w-[44px]` for accessibility

### Collapsible Charts

- Default collapsed on mobile to save space
- Expand button in header
- Smooth slide-down animation (140ms)

### Bottom Spacing

Add `pb-20 lg:pb-10` to main content to avoid dock overlap

---

## 🎨 Icon System

### Icon Library: Lucide React

### Icon Sizes

```css
h-3 w-3    /* 12px - Tiny indicators */
h-4 w-4    /* 16px - Buttons, inline */
h-5 w-5    /* 20px - Card icons */
h-6 w-6    /* 24px - Feature icons */
```

### Stroke Width

```jsx
<Icon className="stroke-[1.5]" />
```

Always use `stroke-[1.5]` for consistent thin, premium look.

### Icon + Text Pattern

```jsx
<div className="flex items-center gap-1.5">
  <Icon className="h-4 w-4 stroke-[1.5]" />
  <span>Label</span>
</div>
```

---

## 🧭 Navigation Patterns

### Top Header (Desktop)

- **Height**: 56px (`h-14`)
- **Sections**: Brand → Nav → Outlet → Clock → Shift → Avatar → Logout
- **Separators**: `<div className="h-8 w-px bg-border" />`

### Top Header (Mobile)

- **Height**: 56px (`h-14`)
- **Hamburger menu** for navigation
- **Outlet selector** prominent
- **Avatar + logout** compact

### Mobile Dock (Bottom)

- **4 items**: Dashboard, Kasir, Produk, Laporan
- **Active state**: Primary color + bold label
- **Icons**: 20px with 1.5 stroke

---

## ♿ Accessibility

### Color Contrast

- All text meets WCAG AA (4.5:1 for normal text)
- Icons with background meet contrast requirements
- Use `text-muted-foreground` for secondary text

### Focus States

```css
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-ring 
focus-visible:ring-offset-2
```

### Skip Links

```jsx
<a href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 
    focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 
    rounded">
  Lewati ke konten utama
</a>
```

### ARIA Labels

```jsx
<Button aria-label="Buka menu navigasi">
  <Menu />
</Button>

<nav aria-label="Navigasi utama">
  {/* Nav items */}
</nav>
```

---

## 📊 Data Display

### Number Formatting

```typescript
// Currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Short numbers
12 → "12"
1234 → "1.234"
1234567 → "1,2 jt"
```

### Date/Time Formatting

```typescript
import { format } from "date-fns";

// Date
format(date, "dd MMM yyyy") // "15 Jan 2024"

// Time
format(date, "HH:mm") // "14:30"

// Duration
const duration = differenceInMinutes(end, start);
const hours = Math.floor(duration / 60);
const minutes = duration % 60;
`${hours}j ${minutes}m`
```

---

## 🎯 Component Checklist

### When Creating New Components

- [ ] Use semantic HTML (`nav`, `main`, `article`, etc.)
- [ ] Add proper ARIA labels and roles
- [ ] Include focus states for interactive elements
- [ ] Use Tailwind design tokens (no hardcoded values)
- [ ] Follow naming conventions (PascalCase for components)
- [ ] Add TypeScript types/interfaces
- [ ] Keep hover animations subtle (150ms, scale 1.01)
- [ ] Use `stroke-[1.5]` for all icons
- [ ] Test on mobile (collapse charts, touch targets)
- [ ] Add loading states with skeleton UI

---

## 🚀 Performance Guidelines

### Image Optimization

- Use Next.js `<Image>` component
- Provide `width` and `height`
- Use WebP format when possible

### Code Splitting

- Lazy load heavy components (charts, modals)
- Use dynamic imports for non-critical features

### API Polling

```typescript
// Standard refresh intervals
const { data } = api.sales.getDailySummary.useQuery(input, {
  refetchInterval: 30_000, // 30 seconds for sales data
});

const { data } = api.inventory.listLowStock.useQuery(input, {
  refetchInterval: 60_000, // 60 seconds for inventory
});
```

### Debounce Search

```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);
```

---

## 📦 File Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── operational-overview.tsx
│   │   ├── quick-actions.tsx
│   │   ├── alerts-section.tsx
│   │   ├── mini-charts.tsx
│   │   ├── mobile-dock.tsx
│   │   └── widgets.tsx
│   ├── layout/
│   │   └── site-header.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── ...
├── app/
│   ├── page.tsx              # Homepage
│   ├── dashboard/
│   │   └── page.tsx          # Full dashboard
│   └── layout.tsx            # Root layout
└── lib/
    └── utils.ts              # cn() and helpers
```

---

## 🎨 Design Variants

### Card Variants

#### Default
```css
border border-border/50
bg-card
shadow-[0_1px_3px_rgba(0,0,0,0.06)]
```

#### Success (Primary Action)
```css
border-emerald-200/60
bg-gradient-to-br from-emerald-50/50 to-white
hover:border-emerald-300
```

#### Info (Secondary Action)
```css
border-sky-200/60
bg-gradient-to-br from-sky-50/50 to-white
hover:border-sky-300
```

#### Warning (Alert)
```css
border-amber-200/60
bg-gradient-to-r from-amber-50/50 to-white
hover:border-amber-300
```

#### Error (Critical Alert)
```css
border-red-200/60
bg-gradient-to-r from-red-50/50 to-white
hover:border-red-300
```

---

## 🎯 Quick Reference

### Common Class Combinations

```jsx
// Metric card
className="relative overflow-hidden border border-border/50 p-5 
  transition-all duration-150 hover:shadow-md hover:scale-[1.01]
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]"

// Section heading
className="text-sm font-semibold uppercase tracking-wider 
  text-muted-foreground"

// Icon container
className="rounded-lg bg-emerald-50 p-2 text-emerald-600"

// Thin icon
className="h-5 w-5 stroke-[1.5]"

// Vertical separator
className="h-8 w-px bg-border"

// Backdrop blur
className="bg-white/80 backdrop-blur-md 
  supports-[backdrop-filter]:bg-white/80"

// Subtle shadow
className="shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
```

---

## 📖 Resources

- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Tailwind CSS**: [Documentation](https://tailwindcss.com/docs)
- **Next.js**: [App Router Docs](https://nextjs.org/docs)
- **Date Formatting**: [date-fns](https://date-fns.org/)

---

## 🔄 Migration Checklist

### From Old Design to New

- [x] Reduce header height from 64px to 56px
- [x] Change shadow to `shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- [x] Use `stroke-[1.5]` on all icons
- [x] Update card heights to 90-140px for metrics
- [x] Add gradient backgrounds to action cards
- [x] Implement mobile bottom dock
- [x] Add pulsing shift indicator
- [x] Collapsible charts on mobile
- [x] Update spacing to use gap-3/gap-4 consistently
- [x] Refactor to use operational overview component

---

**Version**: 1.0  
**Last Updated**: 2024  
**Maintained by**: Toko POS Team