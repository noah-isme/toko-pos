# Quick Mode Implementation - Enterprise POS

## 📋 Overview

Quick Mode adalah mode kasir **ultra-efficient** yang dirancang untuk transaksi cepat dengan fokus pada **speed**, **simplicity**, dan **zero-ambiguity**. Terinspirasi dari Square/Toast POS namun tetap minimalis seperti Shopee Xpress POS.

## 🎯 Prinsip Desain

### 1. Focus-First
- **Hanya satu area aktif**: Input scan
- Auto-focus setiap selesai transaksi
- Tidak ada distraksi visual
- Terminal POS dengan wajah modern

### 2. Zero-Ambiguity
- UI tidak boleh rumit
- Semua komponen bisa dibaca sekilas
- Informasi padat tapi jelas
- Tidak ada card visual berat

### 3. Efficiency-Optimized
- Tidak ada shadow besar
- Tidak ada dekorasi berlebihan
- Layout rapat dan optimal
- Response time < 100ms

---

## 🏗 Architecture

### Component Structure

```
src/app/cashier/quick-mode/
├── QuickModeLayout.tsx       # Main container (3-column layout)
├── QuickModeToggle.tsx       # Mode switcher with localStorage
├── QuickScanInput.tsx        # Scan input with beep & auto-focus
├── QuickCart.tsx             # Compact cart list
├── QuickPaymentPanel.tsx     # Minimal sticky sidebar
└── index.ts                  # Exports
```

### State Management

```typescript
// Quick Mode state persisted to localStorage
useQuickMode() {
  isQuickMode: boolean
  isLoaded: boolean
  toggleQuickMode: (enabled: boolean) => void
}
```

---

## 📦 Component API

### QuickModeLayout

Main container dengan 3-column layout (scan + cart + payment).

```typescript
interface QuickModeLayoutProps {
  // Outlet & Shift
  outletName?: string;
  shiftActive: boolean;
  currentTime?: string;

  // Cart
  cart: QuickCartItem[];
  onAddProduct: (productId: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;

  // Totals
  totalAmount: number;
  discount: number;
  finalTotal: number;

  // Payment
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;

  // Settings
  maxDiscountPercent?: number;
  enableBeep?: boolean;
  disabled?: boolean;
}
```

### QuickScanInput

Auto-focus input dengan barcode scanner support dan beep sound.

```typescript
interface QuickScanInputProps {
  onProductSelect: (productId: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableBeep?: boolean;
  disabled?: boolean;
}
```

**Features:**
- Auto-focus on mount
- Auto-clear after successful scan
- Beep sound (Web Audio API)
- Barcode detection (rapid input)
- Keyboard shortcuts (Ctrl+K, ESC)

### QuickCart

Compact list tanpa card heavy dengan inline actions.

```typescript
interface QuickCartProps {
  items: QuickCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  totalAmount: number;
  disabled?: boolean;
}

interface QuickCartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountPercent: number;
  stock?: number;
}
```

**Features:**
- List padat (1-2 baris per item)
- Inline qty controls ([-] [+])
- Low stock warning (non-intrusive)
- Quick remove (X)
- Ctrl+Backspace untuk clear all

### QuickPaymentPanel

Sticky sidebar dengan total besar dan checkout button.

```typescript
interface QuickPaymentPanelProps {
  totalAmount: number;
  discount: number;
  finalTotal: number;
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;
  maxDiscountPercent?: number;
  disabled?: boolean;
}
```

**Features:**
- Total display besar (48px)
- Discount input optional
- Payment method icons (Tunai/QRIS/Card)
- F2 keyboard shortcut hint

### QuickModeToggle

Mode switcher dengan visual feedback.

```typescript
interface QuickModeToggleProps {
  isQuickMode: boolean;
  onToggle: (enabled: boolean) => void;
}
```

**Features:**
- Visual indicator (pulse dot)
- Smooth transition animation
- Persists to localStorage
- No page reload

---

## 🎬 User Flow

### 1. Mode Switch
```
Normal Mode ──[Toggle]──> Quick Mode
     ↓                         ↓
Full featured          Ultra-efficient
Card layout            List layout
More visual            More compact
```

### 2. Scanning Flow
```
┌─────────────────────────────────┐
│  1. Scan Input Auto-Focus       │
│     Kasir scan barcode          │
└───────────┬─────────────────────┘
            ↓
┌─────────────────────────────────┐
│  2. Beep Sound                  │
│     Audio feedback (1kHz, 0.1s) │
└───────────┬─────────────────────┘
            ↓
┌─────────────────────────────────┐
│  3. Add to Cart                 │
│     - Existing item: Qty++      │
│     - New item: Add row         │
│     - Visual feedback (flash)   │
└───────────┬─────────────────────┘
            ↓
┌─────────────────────────────────┐
│  4. Auto-Clear & Re-Focus       │
│     Ready for next scan         │
└─────────────────────────────────┘
```

### 3. Checkout Flow
```
Cart filled → F2 pressed → Payment Modal
                              ↓
                    (Same as Normal Mode)
                              ↓
                       Success → Reset
                              ↓
                     Auto-focus scan input
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus scan input |
| `ESC` | Clear input / Cancel |
| `Enter` | Submit scan (in input) |
| `F2` | Open payment modal |
| `Ctrl+Backspace` | Clear entire cart |

---

## 🎨 Design Specs

### Layout Proportions

**Desktop (≥1024px):**
```
┌────────────────────────────────────────────┐
│ Header (Orange gradient, 56px)            │
├─────────────────────────┬──────────────────┤
│ Scan Input (80px)       │                  │
├─────────────────────────┤                  │
│                         │  Payment Panel   │
│   Cart List             │  (Sticky, 40%)   │
│   (60%, scroll-y)       │                  │
│                         │  - Total (big)   │
│                         │  - Discount      │
│                         │  - Methods       │
│                         │  - Checkout btn  │
└─────────────────────────┴──────────────────┘
```

**Mobile (<1024px):**
```
┌──────────────────────────┐
│ Header (48px)            │
├──────────────────────────┤
│ Scan Input (72px)        │
├──────────────────────────┤
│                          │
│   Cart List              │
│   (scroll-y)             │
│                          │
├──────────────────────────┤
│ Payment Button (fixed)   │
│ BAYAR • Rp 124.500       │
└──────────────────────────┘
```

### Color Palette

```css
/* Quick Mode Brand */
--quick-orange: #f97316;      /* Orange 500 */
--quick-orange-light: #fb923c; /* Orange 400 */
--quick-orange-dark: #ea580c;  /* Orange 600 */

/* Backgrounds */
--quick-bg: #f9fafb;          /* Gray 50 */
--quick-card: #ffffff;        /* White */

/* Text */
--quick-text-primary: #111827;   /* Gray 900 */
--quick-text-secondary: #6b7280; /* Gray 500 */

/* Borders */
--quick-border: #e5e7eb;      /* Gray 200 */
--quick-border-focus: #f97316; /* Orange 500 */
```

### Typography

```css
/* Scan Input */
input.scan {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}

/* Cart Item Name */
.cart-item-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

/* Cart Item Details */
.cart-item-detail {
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

/* Total Display */
.payment-total {
  font-size: 40px;
  font-weight: 700;
  line-height: 48px;
  letter-spacing: -0.02em;
}
```

### Spacing

```css
/* Compact spacing for Quick Mode */
--space-compact-xs: 0.25rem;  /* 4px */
--space-compact-sm: 0.5rem;   /* 8px */
--space-compact-md: 0.75rem;  /* 12px */
--space-compact-lg: 1rem;     /* 16px */
--space-compact-xl: 1.5rem;   /* 24px */
```

---

## 🔊 Audio Feedback

### Beep Sound (Web Audio API)

```typescript
// Specifications
Frequency: 1000 Hz (1kHz)
Duration: 100ms (0.1s)
Volume: 0.3 (30%)
Waveform: Sine wave

// Implementation
const playBeep = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 1000;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.1
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};
```

**Trigger Events:**
- Barcode successfully scanned
- Product added to cart
- Manual product selection

---

## ✨ Micro-Interactions

### 1. Scan Input Focus
```css
/* Glow effect when focused */
.scan-input:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);
  transition: all 150ms ease;
}
```

### 2. Add Item Feedback
```css
/* Yellow flash when item added */
@keyframes item-added {
  0% { background-color: rgba(251, 191, 36, 0.3); }
  100% { background-color: transparent; }
}

.cart-item.just-added {
  animation: item-added 300ms ease-out;
}
```

### 3. Quantity Change
```css
/* Scale pulse on quantity update */
@keyframes qty-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.quantity-value.updating {
  animation: qty-pulse 100ms ease-out;
}
```

### 4. Remove Item
```css
/* Slide out animation */
@keyframes slide-out-left {
  0% { 
    opacity: 1;
    transform: translateX(0);
  }
  100% { 
    opacity: 0;
    transform: translateX(-16px);
  }
}

.cart-item.removing {
  animation: slide-out-left 150ms ease-out forwards;
}
```

---

## 🚀 Performance Optimizations

### 1. Auto-Focus Strategy
```typescript
// Efficient re-focus without re-render
useEffect(() => {
  if (autoFocus && !disabled) {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [autoFocus, disabled]);
```

### 2. Debounced Barcode Detection
```typescript
// Detect rapid input (barcode scanner)
const [lastScannedTime, setLastScannedTime] = useState(0);

const handleChange = (e) => {
  const now = Date.now();
  const timeDiff = now - lastScannedTime;
  
  // < 100ms between chars = barcode scanner
  if (timeDiff < 100 && value.length > 5) {
    setLastScannedTime(now);
  }
};
```

### 3. Optimistic Cart Updates
```typescript
// Update UI immediately, sync later
const handleQuantityChange = (productId, delta) => {
  // Immediate UI update
  setUpdatingItem(productId);
  onUpdateQuantity(productId, currentQty + delta);
  
  // Clear animation after 100ms
  setTimeout(() => setUpdatingItem(null), 100);
};
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Mode toggle switches without reload
- [ ] Preference persists to localStorage
- [ ] Scan input auto-focuses
- [ ] Beep plays on successful scan
- [ ] Barcode detection works (8-13 digits)
- [ ] Duplicate products increase qty (not new row)
- [ ] Qty +/- buttons work
- [ ] Remove item removes row
- [ ] Clear cart empties all items
- [ ] Low stock warning shows (≤5)
- [ ] F2 opens payment modal
- [ ] Ctrl+K focuses input
- [ ] Ctrl+Backspace clears cart
- [ ] ESC clears input

### UX Tests
- [ ] Input stays focused after actions
- [ ] Visual feedback on add item (flash)
- [ ] Smooth animations (no jank)
- [ ] Total updates in real-time
- [ ] Mobile layout thumb-friendly
- [ ] Payment button accessible
- [ ] No visual lag (<100ms)

### Performance Tests
- [ ] Scan response < 100ms
- [ ] Add item < 50ms
- [ ] Cart render < 60fps
- [ ] Mode switch < 300ms
- [ ] No memory leaks (Audio API)

---

## 📊 Comparison: Normal vs Quick Mode

| Feature | Normal Mode | Quick Mode |
|---------|-------------|------------|
| **Layout** | 60/40 card-based | 60/40 list-based |
| **Visual** | Cards, shadows, gradients | Flat, minimal borders |
| **Scan Input** | Medium size | Large, prominent |
| **Cart Items** | 3-4 lines per item | 1-2 lines per item |
| **Spacing** | Comfortable (16-24px) | Compact (8-12px) |
| **Colors** | Blue accent | Orange accent |
| **Animations** | Smooth (200-400ms) | Quick (100-150ms) |
| **Shortcuts** | Standard | Extended |
| **Audio** | None | Beep on scan |
| **Focus** | Manual | Auto-focus |
| **Best For** | Training, detailed view | Speed, high volume |

---

## 🔧 Configuration

### Enable/Disable Beep Sound

```typescript
<QuickModeLayout
  enableBeep={true}  // default: true
  {...props}
/>
```

### Customize Max Discount

```typescript
<QuickModeLayout
  maxDiscountPercent={50}  // default: 50
  {...props}
/>
```

### Custom Time Display

```typescript
<QuickModeLayout
  currentTime="14:30"  // default: auto from Date()
  {...props}
/>
```

---

## 🐛 Known Limitations

1. **Audio API Support**
   - Beep sound requires modern browser
   - Falls back gracefully if unsupported
   - No sound on older iOS devices

2. **Barcode Scanner**
   - Detection based on input speed
   - May not work with slow scanners
   - Manual testing recommended

3. **Mobile Keyboard**
   - Auto-focus may not work on some mobile browsers
   - User may need to tap input manually
   - iOS Safari has restrictions

---

## 🚀 Future Enhancements

### Phase 2
- [ ] Swipe to delete (mobile)
- [ ] Keyboard-only navigation (Tab, Arrow keys)
- [ ] Bulk actions (select multiple items)
- [ ] Quick notes per item
- [ ] Customer display integration

### Phase 3
- [ ] Voice input support
- [ ] Gesture controls (mobile)
- [ ] Custom beep sounds
- [ ] Haptic feedback (mobile)
- [ ] Offline barcode cache

---

## 📚 Related Documentation

- [Payment Modal Implementation](./PAYMENT_MODAL_IMPLEMENTATION.md)
- [Cashier Redesign](./CASHIER_REDESIGN.md)
- [Cashier Migration Guide](./CASHIER_MIGRATION_GUIDE.md)

---

## 🎉 Conclusion

Quick Mode adalah solusi sempurna untuk:
- ✅ Transaksi cepat (convenience store, supermarket)
- ✅ High-volume cashier operations
- ✅ Barcode scanner heavy usage
- ✅ Kasir berpengalaman
- ✅ Peak hours (rush time)

Normal Mode tetap tersedia untuk:
- ✅ Training mode
- ✅ Detailed product view
- ✅ Complex discounting
- ✅ Learning kasir baru

**Toggle bebas tanpa reload** - kasir bisa pilih sesuai preferensi! 🚀

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2024