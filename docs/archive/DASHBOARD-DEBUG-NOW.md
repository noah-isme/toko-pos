# 🚨 DASHBOARD DEBUG - LANGKAH DEMI LANGKAH

## ⚡ STEP 1: HAPUS CACHE & RESTART SERVER

```bash
# Di terminal, tekan Ctrl+C untuk stop server
# Lalu jalankan:
rm -rf .next
npm run dev
```

**TUNGGU** sampai muncul:
```
✓ Ready in 3s
○ Compiling / ...
✓ Compiled /dashboard in 2s
```

---

## 🌐 STEP 2: BUKA DASHBOARD DI BROWSER

1. Buka: **http://localhost:3000/dashboard**
2. Tekan **F12** (buka Developer Tools)
3. Pilih tab **Console**

---

## 👀 STEP 3: LIHAT LOG DI BROWSER CONSOLE

**HARUS ADA LOG INI:**

```
🔍 Dashboard Query State: {
  isLoading: false,
  hasError: false,
  hasData: true,
  currentOutlet: "cmgxy8e5j0000jyyqn6jux0yh"
}

✅ getDailySummary success: {
  salesCount: 2,
  totalNet: 185800,
  totalItems: 13,
  rawData: { ... }
}

💡 Calculating operational data: {
  salesArrayLength: 2,
  hasTodaySummary: true,
  totals: { totalNet: 185800, ... }
}
```

**KALAU TIDAK ADA LOG INI = CODE BELUM TER-COMPILE!**
Kembali ke STEP 1!

---

## 📺 STEP 4: LIHAT LOG DI TERMINAL SERVER

**HARUS ADA LOG INI DI TERMINAL:**

```
🚀🚀🚀 ===== getDailySummary CALLED ===== 🚀🚀🚀
📥 INPUT: {
  "date": "2025-12-03T23:23:03.280Z",
  "outletId": "cmgxy8e5j0000jyyqn6jux0yh"
}
👤 USER: cmgxye4bb0000jysf5alqvon7 - Owner Demo
=================================================

🎉🎉🎉 ===== getDailySummary SUCCESS ===== 🎉🎉🎉
📊 RESPONSE: {
  date: '2025-12-02T17:00:00.000Z',
  salesCount: 2,
  totalNet: 185800,
  totalItems: 13,
  totalGross: 188500,
  totalDiscount: 2700
}
🔥 FIRST SALE: {
  receipt: 'TRX-1764775055157',
  total: 170500,
  items: 2
}
=================================================
```

**KALAU TIDAK ADA LOG INI = ENDPOINT TIDAK DIPANGGIL!**

---

## 📋 CHECKLIST DEBUGGING

### ✅ KALAU SEMUA LOG MUNCUL TAPI DASHBOARD MASIH 0:

**Berarti ada bug di frontend rendering!**

Cek di browser console, cari log:
```
💡 Calculating operational data: { ... }
```

**Data yang SEHARUSNYA muncul:**
- Pendapatan: **Rp 185.800**
- Total Transaksi: **2**
- Item Terjual: **13**

---

### ❌ KALAU LOG TIDAK MUNCUL DI BROWSER CONSOLE:

**Kemungkinan 1:** Server belum restart dengan benar
- Coba: `pkill node && npm run dev`

**Kemungkinan 2:** Browser cache
- Hard refresh: **Ctrl+Shift+R** atau **Cmd+Shift+R**

**Kemungkinan 3:** Salah halaman
- Pastikan di: `/dashboard` bukan `/`

---

### 💥 KALAU ADA ERROR LOG:

**Di Browser Console, kalau ada:**
```
❌ getDailySummary error: ...
```

**Di Terminal Server, kalau ada:**
```
💥💥💥 ===== getDailySummary ERROR ===== 💥💥💥
```

**COPY-PASTE SELURUH ERROR MESSAGE!**

---

## 🔍 STEP 5: INSPECT NETWORK REQUEST

Jika masih bermasalah:

1. **F12** → tab **Network**
2. Refresh dashboard
3. Cari request: `getDailySummary`
4. Klik request tersebut
5. Lihat tab **Response**

**Response SEHARUSNYA:**
```json
[
  {
    "result": {
      "data": {
        "date": "2025-12-02T17:00:00.000Z",
        "totals": {
          "totalNet": 185800,
          "totalItems": 13,
          ...
        },
        "sales": [...]
      }
    }
  }
]
```

**Kalau response kosong atau error:**
- Screenshot response
- Screenshot server log
- Share ke assistant

---

## 🎯 EXPECTED RESULT

### Dashboard HARUS menampilkan:

**Pendapatan Hari Ini**
```
Rp 185.800
2 transaksi selesai
```

**Total Transaksi**
```
2
hari ini
```

**Item Terjual**
```
13
```

---

## 🆘 TROUBLESHOOTING

### Log Spam Sudah Berhenti?
✅ Ya - Prisma query log sudah dimatikan

### Server Restart Berhasil?
Cek: `rm -rf .next` dan `npm run dev`

### Browser Console Kosong?
- Hard refresh: **Ctrl+Shift+R**
- Clear cache: Settings → Clear browsing data

### Data Masih 0?
- Cek log browser console
- Cek log terminal server
- Screenshot keduanya dan share

---

## 📸 YANG PERLU DI-SCREENSHOT

1. **Browser Console (F12 → Console)**
   - Semua log yang muncul
   - Terutama emoji 🔍 ✅ 💡

2. **Terminal Server**
   - Log dengan emoji 🚀 🎉 💥
   - Mulai dari "getDailySummary CALLED" sampai "SUCCESS"

3. **Dashboard Page**
   - Screenshot seluruh halaman
   - Menunjukkan angka yang muncul (0 atau angka lain)

4. **Network Tab (F12 → Network)**
   - Request: `getDailySummary`
   - Tab: Response
   - Tab: Preview

---

## ✅ SUMMARY

**Yang Sudah Diperbaiki:**
- ✅ Date parsing (ISO & YYYY-MM-DD)
- ✅ Schema mismatch (unitPrice added)
- ✅ Error handling & logging
- ✅ Infinite loop (retry disabled)
- ✅ TypeScript errors (onError/onSuccess removed)
- ✅ Prominent logging (emoji & boxes)

**Data di Database:**
- ✅ 2 transaksi hari ini
- ✅ Rp 185.800 total
- ✅ 13 items terjual

**Next Step:**
1. Restart server (hapus .next)
2. Refresh browser (hard refresh)
3. Cek log console & terminal
4. Screenshot & share hasil

---

**INGAT:** Jika tidak ada log dengan emoji 🚀 🎉 di terminal, berarti endpoint tidak dipanggil!