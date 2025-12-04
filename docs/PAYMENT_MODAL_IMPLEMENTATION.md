# Payment Modal Implementation - Enterprise POS

## 📋 Overview

Implementasi halaman pembayaran (payment modal) dengan fokus pada **User Experience (UX) yang optimal** untuk kasir. Modal ini dirancang fullscreen dengan alur pembayaran yang jelas, keyboard-friendly, dan dilengkapi dengan micro-interactions premium.

## 🎯 Key Features

### ✅ **Desain Fokus Tinggi**
- Fullscreen modal (bukan popup kecil)
- Total pembayaran **besar dan kontras tinggi** (H2, 48-60px)
- Tidak ada distraksi
- Clear separation antara metode pembayaran

### ⌨️ **Keyboard-Friendly**
- `F2` - Buka modal pembayaran
- `ESC` - Tutup modal / kembali
- `Enter` - Konfirmasi pembayaran (tunai)
- `Ctrl+K` - Fokus ke search (setelah selesai)
- **Numpad friendly** - Input angka langsung

### 💰 **Pembayaran Tunai**
- Auto-focus pada input uang diterima
- Auto-format rupiah (10000 → Rp 10.000)
- Kalkulasi kembalian real-time
- Tombol "Uang Pas" untuk nominal umum
- **Shake animation** jika uang kurang
- **Glow effect** pada input yang aktif

### 📱 **Pembayaran QRIS**
- QR Code besar (300x300px)
- Status polling real-time
- Scanning animation
- Timeout handling (5 menit)
- Success/failure states
- Mock implementation untuk demo

### ✨ **Micro-Interactions Premium**
- Fade-in animation (300ms)
- Slide-up animation (400ms)
- Bounce-in untuk success (600ms)
- Shake error animation (400ms)
- Scanning animation untuk QRIS
- Shimmer effect pada tombol
- Smooth transitions (respects `prefers-reduced-motion`)

### 📱 **Mobile Responsive**
- Bottom-sheet style pada mobile
- Thumb-friendly buttons
- Touch-optimized spacing
- Stacked layout
- Fixed payment button

## 🏗 Architecture

### Component Structure

```
src/app/cashier/components/payment/
├── PaymentModal.tsx          # Main modal container with stepper
├── CashPaymentForm.tsx       # Cash payment input form
├── QRISPaymentForm.tsx       # QRIS QR code display
├── PaymentSuccess.tsx        # Success confirmation screen
├── payment-animations.css    # Custom animations (optional)
└── index.ts                  # Exports
```

### State Flow

```
┌─────────────────┐
│  Select Method  │ ← Initial step
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Payment Form   │ ← Tunai / QRIS input
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Success     │ ← Receipt preview
└─────────────────┘
```

## 📦 Component API

### PaymentModal

```typescript
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;        // Subtotal sebelum diskon
  discount: number;           // Total diskon
  finalTotal: number;         // Total akhir yang harus dibayar
  outletName?: string;        // Nama outlet
  cashierName?: string;       // Nama kasir
  onPaymentComplete: (
    method: PaymentMethodType,
    amountPaid: number,
    change?: number
  ) => Promise<void>;
}

type PaymentMethodType = 'TUNAI' | 'QRIS' | 'TRANSFER';
```

### CashPaymentForm

```typescript
interface CashPaymentFormProps {
  totalAmount: number;
  onSubmit: (amountPaid: number, change: number) => void;
  onBack: () => void;
  isProcessing: boolean;
}
```

### QRISPaymentForm

```typescript
interface QRISPaymentFormProps {
  totalAmount: number;
  onSuccess: (amountPaid: number) => void;
  onBack: () => void;
  isProcessing: boolean;
}
```

### PaymentSuccess

```typescript
interface PaymentSuccessProps {
  method: PaymentMethodType;
  totalAmount: number;
  amountPaid: number;
  change?: number;
  onFinish: () => void;
  onPrintReceipt?: () => void;
}
```

## 🔄 Integration Example

### Di halaman cashier/page.tsx:

```typescript
import { PaymentModal, type PaymentMethodType } from './components/payment';

// State
const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);

// Handler untuk membuka modal
const handleOpenPaymentDialog = () => {
  if (cart.length === 0) {
    toast.error("Keranjang masih kosong");
    return;
  }
  if (!activeShift) {
    toast.error("Buka shift terlebih dahulu");
    return;
  }
  setPaymentDialogOpen(true);
};

// Handler untuk payment completion
const handlePaymentComplete = async (
  method: PaymentMethodType,
  amountPaid: number,
  change?: number,
) => {
  try {
    // Map PaymentMethodType to your API's PaymentMethod
    const methodMap: Record<PaymentMethodType, PaymentMethod> = {
      TUNAI: "CASH",
      QRIS: "QRIS",
      TRANSFER: "TRANSFER",
    };
    
    // Save transaction via API
    const result = await recordSale.mutateAsync({
      outletId: activeOutletId,
      receiptNumber: `TRX-${Date.now()}`,
      discountTotal: manualDiscount,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: (item.price * item.quantity * item.discountPercent) / 100,
      })),
      payments: [{
        method: methodMap[method],
        amount: totalNet,
        reference: change !== undefined 
          ? `Cash: ${formatCurrency(amountPaid)}, Change: ${formatCurrency(change)}`
          : undefined,
      }],
    });
    
    // Clear cart
    setCart([]);
    setManualDiscount(0);
    
    toast.success(`Transaksi ${result.receiptNumber} berhasil!`);
    
    // Auto-focus search
    setTimeout(() => searchInputRef.current?.focus(), 500);
  } catch (error) {
    toast.error("Gagal memproses pembayaran");
    throw error;
  }
};

// Render
<PaymentModal
  isOpen={isPaymentDialogOpen}
  onClose={() => setPaymentDialogOpen(false)}
  totalAmount={totals.totalGross}
  discount={totals.totalDiscount}
  finalTotal={totals.totalNet}
  outletName={activeOutlet?.name}
  cashierName={activeShift?.user?.name}
  onPaymentComplete={handlePaymentComplete}
/>
```

## 🎨 Styling & Animations

### CSS Animations (globals.css)

```css
/* Fade in */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Shake (error) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

/* Bounce in (success) */
@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

/* QR Scanning */
@keyframes scan {
  0% { transform: translateY(-150px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(150px); opacity: 0; }
}
```

### Tailwind Classes

- `.animate-fade-in` - Fade in 300ms
- `.animate-slide-up` - Slide up 400ms
- `.animate-shake` - Shake 400ms (error)
- `.animate-bounce-in` - Bounce in 600ms (success)
- `.animate-scan` - Scanning line (QRIS)

## 🔧 Utils & Helpers

### formatCurrency (lib/utils.ts)

```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}
```

## 📱 Mobile Considerations

### Responsive Breakpoints

- **Desktop (lg+):** Modal centered, max-width 2xl
- **Mobile (<lg):** Fullscreen modal
- **Tablet (md):** Rounded modal with backdrop

### Touch Optimizations

- Larger tap targets (min 44x44px)
- Thumb-friendly button placement
- Bottom action buttons
- Swipe-down to dismiss (optional)

## ⚠️ Error Handling

### Cash Payment Errors

```typescript
// Uang tidak cukup
if (amountReceived < totalAmount) {
  setError('Uang tidak cukup');
  setShake(true);
  setTimeout(() => setShake(false), 400);
  return;
}

// Input kosong
if (amountReceived === 0) {
  setError('Masukkan jumlah uang diterima');
  return;
}
```

### QRIS Errors

- **Timeout:** 5 menit, tampilkan "Waktu Habis"
- **Generate failed:** Retry button
- **Connection error:** Tampilkan error message
- **Payment failed:** Ganti metode atau retry

## 🧪 Testing Checklist

### Functional Tests

- [ ] Modal terbuka dengan F2
- [ ] Modal tutup dengan ESC
- [ ] Input tunai auto-focus
- [ ] Format currency benar
- [ ] Kalkulasi kembalian akurat
- [ ] Tombol "Uang Pas" berfungsi
- [ ] Shake animation muncul saat uang kurang
- [ ] QRIS QR code tampil
- [ ] Success screen tampil setelah pembayaran
- [ ] Cart ter-clear setelah sukses
- [ ] Search auto-focus setelah selesai

### UX Tests

- [ ] Total pembayaran mudah dibaca
- [ ] Tidak ada elemen yang mengganggu
- [ ] Transisi smooth dan tidak jarring
- [ ] Keyboard navigation lancar
- [ ] Mobile layout nyaman digunakan
- [ ] Error messages jelas dan helpful

### Accessibility Tests

- [ ] `prefers-reduced-motion` dihormati
- [ ] Focus states jelas
- [ ] Keyboard navigation complete
- [ ] Screen reader friendly (ARIA labels)
- [ ] Contrast ratio memenuhi WCAG AA

## 🚀 Future Enhancements

### Phase 2
- [ ] Multiple payment methods (split payment)
- [ ] Print receipt integration
- [ ] Cash drawer integration
- [ ] Offline mode support
- [ ] Payment history in modal

### Phase 3
- [ ] Payment gateway integration (real QRIS)
- [ ] E-wallet support (GoPay, OVO, Dana)
- [ ] Bank transfer verification
- [ ] Credit/debit card terminal
- [ ] Customer display integration

## 📚 Related Documentation

- [Cashier Redesign Summary](./CASHIER_REDESIGN_SUMMARY.md)
- [Cashier Migration Guide](./CASHIER_MIGRATION_GUIDE.md)
- [Component Architecture](./CASHIER_REDESIGN.md)

## 🤝 Contributing

Saat menambahkan fitur baru ke payment modal:

1. Pertahankan prinsip **focus tinggi** - hindari distraksi
2. Test dengan **keyboard navigation**
3. Pastikan **mobile-friendly**
4. Tambahkan **error handling** yang jelas
5. Update dokumentasi ini

## 📝 Changelog

### v1.0.0 (2024)
- ✅ Initial implementation
- ✅ Cash payment with auto-format
- ✅ QRIS payment with QR code
- ✅ Success screen
- ✅ Keyboard shortcuts
- ✅ Mobile responsive
- ✅ Micro-interactions
- ✅ Error handling

---

**Last Updated:** 2024  
**Maintainer:** POS Development Team  
**Status:** ✅ Production Ready