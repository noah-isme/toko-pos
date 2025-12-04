# Payment Modal Flow Diagram

## 🎯 Complete User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CASHIER PAGE (IDLE)                         │
│  • Cart with items                                              │
│  • Press F2 or click "Bayar" button                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│           PAYMENT MODAL - STEP 1: SELECT METHOD                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                 TOTAL YANG HARUS DIBAYAR                    │ │
│ │                      Rp 124.500                             │ │
│ │                     (52px, bold)                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │   💵 TUNAI   │  │  📱 QRIS     │  │ 🏦 TRANSFER  │          │
│ │              │  │              │  │              │          │
│ │ Pembayaran   │  │ Scan QR Code │  │ Transfer     │          │
│ │ uang tunai   │  │ untuk bayar  │  │ bank         │          │
│ └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│                    [ESC] Batalkan                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┬─────────────┐
          │ TUNAI       │ QRIS        │ TRANSFER    │
          ↓             ↓             ↓             │
┌─────────────────┐ ┌─────────────────┐ ┌──────────▼──────┐
│  CASH PAYMENT   │ │  QRIS PAYMENT   │ │ TRANSFER (TBD)  │
│                 │ │                 │ │                 │
│  Continue to    │ │  Continue to    │ │  Continue to    │
│  Step 2A        │ │  Step 2B        │ │  Step 2C        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 💰 STEP 2A: CASH PAYMENT FORM

```
┌─────────────────────────────────────────────────────────────────┐
│              PAYMENT MODAL - CASH PAYMENT                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                 TOTAL YANG HARUS DIBAYAR                    │ │
│ │                      Rp 124.500                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 💵 Pembayaran Tunai                                             │
│ Masukkan jumlah uang yang diterima                             │
│                                                                 │
│ Uang Diterima                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │              Rp 150.000                                     │ │
│ │              (Auto-format, 36px)                            │ │
│ │              [Auto-focus + Glow effect]                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Uang Pas:                                                       │
│ [Rp 124.500] [Rp 150.000] [Rp 200.000]                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Kembalian:             Rp 25.500                            │ │
│ │                        (Bold, Green, 28px)                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [← Kembali]              [BAYAR SEKARANG] [ENTER]              │
│                                                                 │
│ Tekan [Enter] untuk konfirmasi atau [ESC] untuk kembali        │
└─────────────────────────────────────────────────────────────────┘
          │
          │ (If amount < total)
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ ERROR STATE                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │              Rp 100.000                                     │ │
│ │              [SHAKE ANIMATION - 4px left/right]            │ │
│ │              (Red border, red background)                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ 🔴 Uang tidak cukup                                             │
└─────────────────────────────────────────────────────────────────┘
          │
          │ (If Enter pressed & valid)
          ↓
    [Go to STEP 3]
```

---

## 📱 STEP 2B: QRIS PAYMENT FORM

```
┌─────────────────────────────────────────────────────────────────┐
│              PAYMENT MODAL - QRIS PAYMENT                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                 TOTAL YANG HARUS DIBAYAR                    │ │
│ │                      Rp 124.500                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 📱 Pembayaran QRIS                                              │
│ Scan QR Code untuk melanjutkan pembayaran                      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │           ┌───────────────────────┐                        │ │
│ │           │                       │                        │ │
│ │           │   [QR CODE 300x300]   │                        │ │
│ │           │                       │                        │ │
│ │           │   (with scan line     │                        │ │
│ │           │    animation)         │                        │ │
│ │           │                       │                        │ │
│ │           └───────────────────────┘                        │ │
│ │                                                             │ │
│ │     🔵 Menunggu pembayaran...                               │ │
│ │     Waktu tersisa: 4:52                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Total Pembayaran: Rp 124.500                                    │
│ ID Transaksi: QRIS-1234567890                                   │
│                                                                 │
│ 📘 Cara Pembayaran:                                             │
│ 1. Buka aplikasi e-wallet atau mobile banking                  │
│ 2. Pilih menu Scan QRIS atau Bayar                             │
│ 3. Arahkan kamera ke QR Code di atas                           │
│ 4. Konfirmasi pembayaran di aplikasi Anda                      │
│                                                                 │
│ [← Kembali]                                                     │
│                                                                 │
│ Status pembayaran akan otomatis diperbarui                     │
└─────────────────────────────────────────────────────────────────┘
          │
          │ (Polling every 2 seconds)
          │
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ ✅ SUCCESS STATE                                                │
│           ┌───────────────────────┐                             │
│           │                       │                             │
│           │    ✓ (Big check)      │                             │
│           │                       │                             │
│           │  Pembayaran Berhasil! │                             │
│           │     Terima kasih      │                             │
│           │                       │                             │
│           └───────────────────────┘                             │
│     (Bounce-in animation 600ms)                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
                  [Go to STEP 3]

          OR

┌─────────────────────────────────────────────────────────────────┐
│ ❌ TIMEOUT STATE (after 5 minutes)                              │
│           ┌───────────────────────┐                             │
│           │         ✕             │                             │
│           │   Waktu Habis         │                             │
│           │   Silakan coba lagi   │                             │
│           └───────────────────────┘                             │
│                                                                 │
│ [Ganti Metode]              [Coba Lagi]                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ STEP 3: SUCCESS SCREEN

```
┌─────────────────────────────────────────────────────────────────┐
│                    PEMBAYARAN BERHASIL                          │
│                                                                 │
│                     ┌──────────────┐                            │
│                     │              │                            │
│                     │   ✓ (Huge)   │                            │
│                     │   (Green)    │                            │
│                     │              │                            │
│                     └──────────────┘                            │
│              (Bounce-in animation 600ms)                        │
│              (Glow effect background)                           │
│                                                                 │
│              Pembayaran Berhasil!                               │
│              Transaksi telah diselesaikan                       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Total Pembayaran                                            │ │
│ │              Rp 124.500                                     │ │
│ │              (48px, bold)                                   │ │
│ │ ─────────────────────────────────────                       │ │
│ │ Metode Pembayaran                            Tunai          │ │
│ │ Uang Diterima                         Rp 150.000            │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Kembalian                          Rp 25.500 (Green)   │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ Waktu Transaksi            2024-12-24 14:30:45              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌──────────────────────┐    ┌───────────────────────────────┐  │
│ │   🖨️  Cetak Struk    │    │      SELESAI                  │  │
│ │                      │    │   (Primary, Bold, Shimmer)    │  │
│ └──────────────────────┘    └───────────────────────────────┘  │
│                                                                 │
│                        Tutup                                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACK TO CASHIER PAGE                          │
│                                                                 │
│  ✅ Cart cleared                                                │
│  ✅ Manual discount reset                                       │
│  ✅ Search input auto-focused                                   │
│  ✅ Transaction recorded                                        │
│  ✅ Recent sales updated                                        │
│                                                                 │
│  READY FOR NEXT TRANSACTION                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎬 Animation Timeline

### Modal Open (Total: 300ms)
```
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Backdrop fade-in (black/60%)
      │ Modal slide-up from bottom
      │
100ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Total amount fade-in + scale
      │
200ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Payment method cards fade-in (stagger)
      │
300ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Complete, ready for interaction
```

### Cash Input Error (Total: 400ms)
```
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ User enters insufficient amount
      │ Presses Enter
      │
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Border turns red
      │ Background turns red/50
      │ Error message appears
      │ Shake animation starts:
      │   0ms:  translateX(0)
      │  50ms:  translateX(-4px)
      │ 100ms:  translateX(4px)
      │ 150ms:  translateX(-4px)
      │ 200ms:  translateX(4px)
      │ 250ms:  translateX(-4px)
      │ 300ms:  translateX(4px)
      │ 350ms:  translateX(-4px)
      │ 400ms:  translateX(0) - Done
```

### QRIS Scan Animation (Continuous Loop)
```
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Scan line at top (-150px)
      │ Opacity: 0
      │
1000ms━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Scan line at center (0px)
      │ Opacity: 1
      │
2000ms━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Scan line at bottom (150px)
      │ Opacity: 0
      │ → Repeat from top
```

### Success Screen (Total: 600ms)
```
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Previous screen fades out
      │
0ms   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Success icon bounce-in:
      │   0ms:  scale(0.3), opacity(0)
      │ 300ms:  scale(1.05), opacity(1)
      │ 420ms:  scale(0.9)
      │ 600ms:  scale(1) - Done
      │
100ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Title "Pembayaran Berhasil!" slide-up
      │
200ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Subtitle slide-up
      │
300ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Details card slide-up
      │
400ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Action buttons slide-up
      │
600ms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Complete, ready for action
```

---

## 🎯 State Transitions

```
                    ┌─────────────┐
                    │   CLOSED    │
                    │  (Initial)  │
                    └──────┬──────┘
                           │ F2 pressed
                           │ or "Bayar" clicked
                           ↓
                    ┌─────────────┐
                    │   OPENED    │
                    │   (Step 1)  │
                    │Select Method│
                    └──────┬──────┘
                           │ Method selected
                           ↓
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │  CASH   │      │   QRIS    │    │ TRANSFER  │
    │ INPUT   │      │  WAITING  │    │   (TBD)   │
    │(Step 2A)│      │ (Step 2B) │    │(Step 2C)  │
    └────┬────┘      └─────┬─────┘    └─────┬─────┘
         │                 │                 │
         │ Enter pressed   │ Payment success │
         │ & valid         │ detected        │
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ↓
                    ┌─────────────┐
                    │   SUCCESS   │
                    │   (Step 3)  │
                    │   Receipt   │
                    └──────┬──────┘
                           │ "Selesai" clicked
                           ↓
                    ┌─────────────┐
                    │   CLOSED    │
                    │ + Cart clear│
                    │ + Focus back│
                    └─────────────┘
```

---

## 🔁 Error Recovery Flow

```
┌──────────────────────────────────────────────────────┐
│         CASH PAYMENT - ERROR SCENARIOS               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Input amount < total                                │
│         ↓                                            │
│  [Shake animation]                                   │
│  Show error: "Uang tidak cukup"                      │
│         ↓                                            │
│  User corrects amount                                │
│         ↓                                            │
│  Error clears automatically                          │
│         ↓                                            │
│  [Normal state restored]                             │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Input empty                                         │
│         ↓                                            │
│  Show error: "Masukkan jumlah uang diterima"        │
│         ↓                                            │
│  User enters amount                                  │
│         ↓                                            │
│  Error clears                                        │
│                                                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│         QRIS PAYMENT - ERROR SCENARIOS               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  QR generation failed                                │
│         ↓                                            │
│  Show error message                                  │
│  [Coba Lagi] button                                  │
│         ↓                                            │
│  User clicks "Coba Lagi"                             │
│         ↓                                            │
│  Retry QR generation                                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Timeout (5 minutes)                                 │
│         ↓                                            │
│  Show "Waktu Habis" message                          │
│  [Ganti Metode] [Coba Lagi] buttons                 │
│         ↓                                            │
│  User chooses action                                 │
│         ↓                                            │
│  Either: Go back to Step 1                           │
│  Or: Generate new QR                                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📐 Layout Specifications

### Desktop (≥1024px)
```
┌─────────────────────────────────────┐
│ Backdrop (black/60%, blur-sm)       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Modal Container               │  │
│  │ max-w-2xl (672px)             │  │
│  │ max-h-90vh                    │  │
│  │ rounded-2xl                   │  │
│  │                               │  │
│  │ [Header: 80px]                │  │
│  │ [Content: flex-1, scroll-y]   │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Mobile (<1024px)
```
┌─────────────────────────────┐
│ Backdrop (black/60%)        │
│                             │
│ ┌─────────────────────────┐ │
│ │ Modal Container         │ │
│ │ w-full, h-full          │ │
│ │ (Fullscreen)            │ │
│ │                         │ │
│ │ [Header: 80px, sticky]  │ │
│ │ [Content: flex-1]       │ │
│ │ [Buttons: fixed bottom] │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## 🎨 Color Palette

```
Primary (Blue):
  - bg-blue-600: Header, Primary buttons
  - bg-blue-50:  Total background
  - border-blue-500: Active states

Success (Green):
  - text-green-600: Kembalian, Success states
  - bg-green-50: Success backgrounds
  - border-green-200: Success borders

Error (Red):
  - text-red-600: Error text
  - bg-red-50: Error backgrounds
  - border-red-500: Error borders

Neutral (Gray):
  - bg-gray-50: Card backgrounds
  - border-gray-200: Card borders
  - text-gray-600: Secondary text
  - text-gray-900: Primary text
```

---

**End of Flow Diagram**