# Bug Fix: Total Pembayaran Menampilkan Rp 0

## 📋 Deskripsi Bug

**Gejala:**
Setelah melakukan pembayaran tunai, pada layar success payment modal, "Total Pembayaran" menampilkan **Rp 0** padahal seharusnya menampilkan jumlah yang benar.

**Contoh:**
- Uang Diterima: Rp 50.000
- Kembalian: Rp 34.700
- Total Pembayaran: **Rp 0** ❌ (seharusnya Rp 15.300)

**Screenshot dari User:**
```
Total Pembayaran: Rp 0
Metode Pembayaran: Tunai
Uang Diterima: Rp 50.000
Kembalian: Rp 34.700
Waktu Transaksi: 3/12/2025, 11.50.54
```

---

## 🔍 Root Cause Analysis

### Problem
Bug terjadi karena **race condition** dalam urutan eksekusi:

1. User melakukan pembayaran → `handlePaymentComplete()` dipanggil
2. Di dalam `handlePaymentComplete()`, **cart di-clear** dengan `setCart([])` (line 372-373 di `cashier/page.tsx`)
3. Karena cart kosong, `totals.totalNet` menjadi **0** (dihitung dari cart yang sudah kosong)
4. Payment modal masih terbuka dan menampilkan success screen
5. `PaymentSuccess` menerima `finalTotal` yang sudah berubah menjadi **0**

### Diagram Flow (Before Fix)
```
User Submit Payment
    ↓
handlePaymentComplete() called
    ↓
Transaction saved to DB ✓
    ↓
setCart([]) ← Cart cleared HERE
    ↓
totals.totalNet recalculated = 0 (cart empty)
    ↓
PaymentSuccess rendered
    ↓
Shows finalTotal = 0 ❌
```

### Root Cause Code
**File:** `src/app/cashier/page.tsx`

```typescript
const handlePaymentComplete = async (...) => {
  // ... save transaction ...
  
  // ❌ BUG: Clear cart BEFORE success screen is shown
  setCart([]);
  setManualDiscount(0);
  
  // Modal masih terbuka, tapi totals sudah 0
};
```

**File:** `src/app/cashier/components/payment/PaymentModal.tsx`

```typescript
const handlePaymentSubmit = async (amountPaid: number, change?: number) => {
  await onPaymentComplete(...); // Cart di-clear di sini
  setPaymentDetails({
    method: selectedMethod,
    amountPaid,
    change,
    // ❌ totalAmount tidak disimpan
  });
};

// Di render
<PaymentSuccess
  totalAmount={finalTotal} // ❌ finalTotal sudah 0 karena cart kosong
  ...
/>
```

---

## ✅ Solution

### Strategi
Simpan nilai `finalTotal` **SEBELUM** `onPaymentComplete()` dipanggil (sebelum cart di-clear), kemudian gunakan nilai tersimpan untuk ditampilkan di success screen.

### Implementation

**File:** `src/app/cashier/components/payment/PaymentModal.tsx`

#### 1. Update Type Definition
```typescript
const [paymentDetails, setPaymentDetails] = useState<{
  method: PaymentMethodType;
  amountPaid: number;
  change?: number;
  totalAmount: number; // ✅ TAMBAH: Simpan total amount
} | null>(null);
```

#### 2. Store Total Before Clearing Cart
```typescript
const handlePaymentSubmit = async (amountPaid: number, change?: number) => {
  setIsProcessing(true);
  
  // ✅ FIX: Simpan total SEBELUM payment complete (sebelum cart di-clear)
  const currentTotal = finalTotal;
  
  try {
    await onPaymentComplete(selectedMethod, amountPaid, change);
    setPaymentDetails({
      method: selectedMethod,
      amountPaid,
      change,
      totalAmount: currentTotal, // ✅ Gunakan nilai yang tersimpan
    });
    setStep("success");
  } catch (error) {
    console.error("Payment failed:", error);
  } finally {
    setIsProcessing(false);
  }
};
```

#### 3. Use Stored Total in Success Screen
```typescript
{step === "success" && paymentDetails && (
  <PaymentSuccess
    method={paymentDetails.method}
    totalAmount={paymentDetails.totalAmount} // ✅ Gunakan total tersimpan
    amountPaid={paymentDetails.amountPaid}
    change={paymentDetails.change}
    onFinish={handleFinish}
  />
)}
```

### Diagram Flow (After Fix)
```
User Submit Payment
    ↓
handlePaymentSubmit() called
    ↓
const currentTotal = finalTotal ← ✅ SIMPAN total
    ↓
handlePaymentComplete() called
    ↓
Transaction saved to DB ✓
    ↓
setCart([]) ← Cart cleared
    ↓
totals.totalNet recalculated = 0
    ↓
setPaymentDetails({ totalAmount: currentTotal }) ← ✅ Gunakan nilai tersimpan
    ↓
PaymentSuccess rendered
    ↓
Shows totalAmount = 15300 ✅ CORRECT
```

---

## 🧪 Testing

### Manual Test Steps
1. ✅ Buka kasir page
2. ✅ Tambahkan produk ke cart (misal total Rp 15.300)
3. ✅ Klik tombol Bayar (F2)
4. ✅ Pilih metode "Tunai"
5. ✅ Input uang diterima: Rp 50.000
6. ✅ Klik "Bayar Sekarang"
7. ✅ **Verify:** Success screen menampilkan:
   - Total Pembayaran: **Rp 15.300** ✅ (bukan Rp 0)
   - Uang Diterima: Rp 50.000
   - Kembalian: Rp 34.700

### Edge Cases to Test
- ✅ Payment dengan uang pas (kembalian = 0)
- ✅ Payment dengan QRIS
- ✅ Payment dengan discount
- ✅ Multiple items di cart
- ✅ Single item di cart

---

## 📊 Impact Analysis

### Files Changed
- ✅ `src/app/cashier/components/payment/PaymentModal.tsx`
  - Updated `paymentDetails` state type
  - Store `finalTotal` before clearing cart
  - Use stored total in `PaymentSuccess`

### Affected Components
- ✅ `PaymentModal` - Fixed
- ✅ `PaymentSuccess` - No changes needed (receives correct data)
- ✅ `CashPaymentForm` - No changes needed
- ✅ `QRISPaymentForm` - No changes needed

### Breaking Changes
- ❌ None - This is a bug fix, not a breaking change

---

## 🎯 Lessons Learned

### 1. State Management & React Lifecycle
**Problem:** Reactive state (`totals`) berubah setelah cart di-clear, tapi modal masih render dengan data lama.

**Lesson:** Selalu simpan snapshot data yang akan ditampilkan **sebelum** melakukan operasi yang mengubah state dependency-nya.

### 2. Race Conditions in Async Operations
**Problem:** Cart di-clear di dalam async operation, tapi UI masih menggunakan reactive computed values.

**Lesson:** Untuk success/confirmation screens, gunakan **stored values** bukan **reactive computed values**.

### 3. Component Props vs State
**Problem:** Props `finalTotal` berubah karena parent state berubah.

**Lesson:** Untuk data yang harus "frozen" (tidak berubah), simpan di local state component.

### Best Practice Pattern
```typescript
// ✅ GOOD: Store snapshot before async operation
const handleAsyncAction = async () => {
  const snapshot = currentReactiveValue; // Snapshot
  await doSomething();
  setState({ savedValue: snapshot }); // Use snapshot
};

// ❌ BAD: Use reactive value after state change
const handleAsyncAction = async () => {
  await doSomething(); // This might change state
  setState({ value: currentReactiveValue }); // Wrong!
};
```

---

## 📝 Related Issues

- Similar pattern might exist in other modals/dialogs
- Consider adding this pattern to coding guidelines
- Review other components that show "success" screens after async operations

---

## ✅ Verification

Build Status: ✅ PASSED
```bash
✓ Compiled successfully in 38.4s
✓ No TypeScript errors
✓ No critical ESLint warnings
```

**Date Fixed:** 2025-01-XX  
**Fixed By:** AI Assistant  
**Reported By:** User (Noah)  
**Priority:** High (User-facing bug)  
**Status:** ✅ RESOLVED