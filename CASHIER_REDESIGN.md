# Cashier Page Redesign - Enterprise POS Layout

## 🎯 Overview

The cashier page has been completely redesigned to follow modern enterprise POS patterns with a focus on:
- **Speed**: Optimized for fast checkout workflows
- **Clarity**: Clean, easy-to-read interface
- **Efficiency**: Keyboard shortcuts and streamlined interactions
- **Professional Feel**: Premium UI with subtle animations

## 🏗️ Architecture

### Component Structure

```
src/app/cashier/
├── page.tsx                          # Main redesigned cashier page
└── page-old-backup.tsx              # Original backup (for reference)

src/components/cashier/
├── index.ts                         # Barrel exports
├── cashier-top-bar.tsx              # Minimal top status bar
├── cashier-shortcuts.tsx            # Keyboard shortcut display
├── cashier-cart.tsx                 # Cart with items, qty controls, discounts
├── cashier-payment-summary.tsx      # Sticky payment panel (right side)
└── product-search-autocomplete.tsx  # Existing autocomplete component
```

## 📐 Layout Design

### Desktop Layout (60/40 Split)

```
┌─────────────────────────────────────────────────────────────────┐
│ TOP BAR: Outlet | Shift Status | Time | User                    │
├──────────────────────────────────┬──────────────────────────────┤
│ LEFT (60%)                       │ RIGHT (40%)                  │
│ ┌─────────────────────────────┐  │ ┌──────────────────────────┐ │
│ │ Shortcuts Bar (F1,F2,ESC)   │  │ │ PAYMENT SUMMARY (Sticky) │ │
│ └─────────────────────────────┘  │ │                          │ │
│ ┌─────────────────────────────┐  │ │ Subtotal: Rp XXX         │ │
│ │ 🔍 SEARCH / SCAN INPUT      │  │ │ Diskon: - Rp XXX         │ │
│ │ (Large, autocomplete)       │  │ │ ─────────────────────    │ │
│ └─────────────────────────────┘  │ │ TOTAL: Rp XXX,XXX        │ │
│                                  │ │                          │ │
│ KERANJANG (3 item)               │ │ Metode Pembayaran:       │ │
│ ┌─────────────────────────────┐  │ │ ○ Tunai  ○ QRIS          │ │
│ │ Air Mineral - Rp4,500       │  │ │                          │ │
│ │ Qty: [-][1][+]  Diskon: 0%  │  │ │ ┌──────────────────────┐ │ │
│ │                 Sub: Rp4,500│  │ │ │  BAYAR (F2) ▶        │ │ │
│ └─────────────────────────────┘  │ │ └──────────────────────┘ │ │
│ ┌─────────────────────────────┐  │ │                          │ │
│ │ Roti Tawar - Rp22,000       │  │ │ Transaksi Terakhir:      │ │
│ │ Qty: [-][2][+]  Diskon: 10% │  │ │ #TRX001 • Rp50,000       │ │
│ │                Sub: Rp39,600│  │ └──────────────────────────┘ │
│ └─────────────────────────────┘  │                              │
│                                  │                              │
│ [Hapus Semua] [Tambah Catatan]   │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

### Mobile Layout (Stacked)

```
┌─────────────────────────────┐
│ ← Kasir – Outlet Utama      │
│ Shift Aktif • 10:30         │
├─────────────────────────────┤
│ 🔍 Scan / Cari Produk       │
├─────────────────────────────┤
│ KERANJANG (3 item)          │
│ ┌─────────────────────────┐ │
│ │ Air Mineral             │ │
│ │ Qty: [-][1][+]          │ │
│ │ Subtotal: Rp4,500       │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Roti Tawar              │ │
│ │ Qty: [-][2][+]          │ │
│ │ Subtotal: Rp39,600      │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ BAYAR (F2) • Rp124,500  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## ✨ Key Features

### 1. Top Status Bar (Minimal)
- **Outlet Selector**: Dropdown to switch outlets
- **Shift Status**: Live indicator (Active/Inactive) with pulse animation
- **Current Time**: Updates every minute
- **User Info**: Display current user
- **Quick Actions**: Buka/Tutup shift buttons

**Component**: `CashierTopBar`

### 2. Keyboard Shortcuts Bar
Visual display of available shortcuts:
- `F1` - Tambah Item (not yet implemented)
- `F2` - Bayar (open payment dialog)
- `ESC` - Batal (remove last item / close dialog)
- `Ctrl+K` - Fokus Scan (focus search input)

**Component**: `CashierShortcuts`

### 3. Product Search (Autocomplete)
- Large, prominent input field
- Real-time search as you type (min 2 characters)
- Dropdown suggestions with:
  - Product name, price
  - SKU and barcode
  - Category
  - Keyboard navigation (↑↓ arrows, Enter to select)
- Auto-focus after every transaction

**Component**: `ProductSearchAutocomplete`

### 4. Shopping Cart
Clean card-based layout with:
- **Item Cards**: Each item in a rounded card with hover effects
- **Quantity Controls**: Large +/- buttons with number input
- **Discount Selector**: Per-item discount dropdown (0%, 5%, 10%, etc.)
- **Subtotal**: Real-time calculation with discount
- **Remove Button**: Appears on hover
- **Animations**: 
  - Scale effect when quantity changes
  - Slide-out animation when item removed
  - Highlight new items for 1 second

**Component**: `CashierCart`

### 5. Payment Summary (Sticky)
Right-side panel that stays visible:
- **Totals Breakdown**:
  - Subtotal
  - Item discounts
  - Manual discount input
  - **Large Total Display** (2XL font)
- **Payment Method Selection**:
  - Radio buttons for Cash/QRIS
  - QRIS code preview when selected
- **Large Checkout Button**:
  - "BAYAR (F2)" with wallet icon
  - Subtle pulse animation when active
  - Hover scale effect
- **Recent Transaction**:
  - Last transaction summary
  - Receipt number, amount, time

**Component**: `CashierPaymentSummary`

## 🎨 Micro-Interactions

### Cart Animations
```css
/* Scale effect when quantity changes */
.cart-item-animating {
  transform: scale(1.05);
  transition: transform 300ms;
}

/* Slide-out when removing item */
@keyframes slide-out-left {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-100%); }
}

/* Highlight new items */
.cart-item-new {
  animation: highlight 1s ease-out;
}
```

### Button Effects
- **Pay Button**: Subtle pulse animation + hover bounce
- **Quantity Buttons**: Scale 1.05 on hover
- **Remove Button**: Opacity fade-in on parent hover

### Status Indicators
- **Active Shift**: Green badge with pulsing dot
- **Inactive Shift**: Gray badge with static dot
- **Processing**: Spinner with "Memproses..." text

## ⌨️ Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `F2` | Bayar | Open payment confirmation dialog |
| `ESC` | Batal | Remove last item from cart OR close dialog |
| `Ctrl+K` | Fokus | Focus search input for quick scanning |
| `F1` | Tambah | (Future: Quick add item - not yet implemented) |

## 🔄 Workflow

### Standard Checkout Flow

1. **Start Shift** (if not active)
   - Top bar shows "Shift Tidak Aktif"
   - Click "Buka Shift" or auto-prompted on page load
   - Enter opening cash amount
   
2. **Scan/Search Products**
   - Search input auto-focused
   - Type product name, SKU, or scan barcode
   - Select from autocomplete dropdown (or press Enter)
   - Product added to cart with animation

3. **Adjust Cart**
   - Change quantity with +/- buttons or direct input
   - Apply per-item discount from dropdown
   - Remove items with X button (hover to reveal)
   - Clear entire cart with "Hapus Semua"

4. **Apply Manual Discount**
   - Enter discount amount in payment summary
   - Maximum 50% of subtotal (configurable)
   - Shows warning if exceeded

5. **Select Payment Method**
   - Choose Cash or QRIS
   - QRIS shows preview QR code
   - Optional: Enter payment reference for non-cash

6. **Complete Payment**
   - Click "BAYAR (F2)" or press F2
   - Confirm in dialog
   - Success animation with checkmark
   - Receipt preview shown
   - Cart auto-clears

7. **End Shift** (when done)
   - Click "Tutup Shift" in top bar
   - Enter closing cash amount
   - View shift summary

## 🎯 Performance Optimizations

### 1. Product Caching
- IndexedDB cache for faster lookups
- Pre-loads catalog on page mount
- Updates cache on new product additions

### 2. Memoization
```typescript
// Totals calculated only when cart or discounts change
const totals = useMemo(() => {
  // expensive calculation
}, [cart, manualDiscount]);
```

### 3. Debounced Search
- Search API calls debounced via React Query
- 30-second stale time for cached results

### 4. Lazy Rendering
- Cart items render on-demand
- Animations respect `prefers-reduced-motion`

## 📱 Responsive Design

### Breakpoints
- **Mobile** (< 1024px): Stacked layout, fixed bottom payment button
- **Desktop** (≥ 1024px): 60/40 split with sticky payment panel

### Mobile Adaptations
- Shortcuts bar: Horizontal scroll on small screens
- Cart: Full width cards
- Payment summary: Hidden, replaced with fixed bottom button
- Top bar: Condensed text, icon-only logout

## 🎨 Theme Support

All components support light/dark mode:
- Uses Tailwind CSS variables
- Border colors adjust automatically
- Proper contrast ratios maintained
- Icons and text colors theme-aware

## 🧪 Testing Considerations

### Unit Tests
- Cart calculations (totals, discounts)
- Keyboard shortcut handlers
- Product addition/removal logic

### Integration Tests
- Complete checkout flow
- Shift management
- Payment method switching
- Discount validation

### E2E Tests
- Full POS workflow (scan → adjust → pay)
- Multi-outlet scenarios
- Concurrent transactions
- Error handling

## 🚀 Future Enhancements

### Planned Features
- [ ] **F1 Quick Add**: Manual product entry without search
- [ ] **Customer Display**: Second screen for customer
- [ ] **Print Receipt**: Thermal printer integration
- [ ] **Barcode Scanner**: USB/Serial device support
- [ ] **Offline Mode**: IndexedDB-powered offline transactions
- [ ] **Split Payment**: Multiple payment methods per transaction
- [ ] **Customer Info**: Loyalty/member integration
- [ ] **Held Transactions**: Park incomplete transactions
- [ ] **Returns**: Process returns from receipt number
- [ ] **Receipt Email/SMS**: Send digital receipts

### UX Improvements
- [ ] Voice feedback for scan confirmations
- [ ] Haptic feedback on mobile devices
- [ ] Sound effects (optional, muted by default)
- [ ] Customizable hotkeys
- [ ] Quick discount buttons (5%, 10%, 20%)
- [ ] Favorite products quick access
- [ ] Transaction notes/comments
- [ ] Multi-currency support

## 📝 Configuration

### Environment Variables
```env
NEXT_PUBLIC_DISCOUNT_LIMIT_PERCENT=50  # Max manual discount %
NEXT_PUBLIC_STORE_NPWP=123456789       # Store tax ID (for receipts)
```

### Code Constants
```typescript
// In page.tsx
const DEFAULT_PAYMENT_METHOD = "CASH";
const QRIS_PAYMENT_METHOD = "QRIS";
const DISCOUNT_LIMIT_PERCENT = 50;

// In cashier-cart.tsx
const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 40, 50];
```

## 🐛 Known Issues & Limitations

1. **QRIS Code**: Currently generates simulation QR (not real payment)
2. **Receipt Printing**: Not yet implemented (preview only)
3. **Barcode Scanner**: USB scanners not tested (keyboard input only)
4. **Offline Mode**: Requires internet connection
5. **Multi-tab**: Multiple cashier tabs may cause sync issues

## 📚 Related Documentation

- [CASHIER_AUTOCOMPLETE_FEATURE.md](./CASHIER_AUTOCOMPLETE_FEATURE.md) - Product search details
- [STOCK_DISPLAY_FIX.md](./STOCK_DISPLAY_FIX.md) - Inventory integration
- [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) - Full project context

## 🎉 Credits

Redesigned following modern enterprise POS patterns:
- Inspired by Square POS, Lightspeed, and Shopify POS
- Focus on speed, clarity, and professional aesthetics
- Built with Next.js 14, React 18, Tailwind CSS, and Framer Motion

---

**Last Updated**: 2024
**Version**: 2.0.0 (Complete Redesign)