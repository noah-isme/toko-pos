# 🔧 Debugging Guide - Toko POS

Panduan ini membantu Anda debug aplikasi tanpa log spam yang mengganggu.

---

## 🚫 Masalah: Log Server Tidak Berhenti

### Penyebab Umum
1. **Prisma Query Log** - Setiap database query di-log
2. **Console.log berlebihan** - Debug log yang lupa dihapus
3. **Auto-refresh/retry** - Frontend terus retry request yang gagal
4. **Polling/realtime updates** - Request berkala yang tidak perlu

---

## ✅ Solusi: Matikan Log yang Tidak Perlu

### 1. Prisma Query Log

**File:** `src/server/db.ts`

```typescript
// ❌ JANGAN ini (log spam):
log: ["query", "error", "warn"]

// ✅ GUNAKAN ini:
log: ["error", "warn"]
```

**Jika butuh query log sementara:**
```bash
# Set environment variable
DATABASE_LOG_LEVEL=query npm run dev
```

### 2. Debug Console.log

**Hapus semua console.log yang tidak perlu:**

```typescript
// ❌ JANGAN:
console.log("Debug info:", data);
console.log("Processing...");

// ✅ GUNAKAN conditional logging:
if (process.env.DEBUG_SALES === "true") {
  console.log("Sales debug:", data);
}
```

### 3. Error Logging yang Baik

**Gunakan error logging yang informatif:**

```typescript
// ✅ BAIK: Log dengan context
try {
  const result = await processData(input);
} catch (error) {
  console.error("❌ Error processing data:", {
    input,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

---

## 🔍 Cara Debug Tanpa Log Spam

### Method 1: Conditional Breakpoints (VSCode)

1. Buka file yang ingin di-debug
2. Klik di sebelah line number untuk set breakpoint
3. Right-click breakpoint → Edit Breakpoint → Add Condition
4. Set kondisi: `input.outletId === "specific-id"`

### Method 2: Debug Endpoint Khusus

Buat endpoint temporary untuk debug:

```typescript
// src/server/api/routers/debug.ts
export const debugRouter = router({
  inspectSale: protectedProcedure
    .input(z.object({ saleId: z.string() }))
    .query(async ({ input }) => {
      const sale = await db.sale.findUnique({
        where: { id: input.saleId },
        include: { items: true, payments: true },
      });
      return sale; // View in browser/Postman
    }),
});
```

### Method 3: Try-Catch dengan Error Detail

Wrap kode suspect dengan try-catch:

```typescript
try {
  // Kode yang dicurigai error
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Log sekali saja dengan detail lengkap
  console.error("🚨 CRITICAL ERROR:", {
    operation: "riskyOperation",
    input: { /* data input */ },
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error),
    timestamp: new Date().toISOString(),
  });
  throw error; // Re-throw agar tRPC tangani
}
```

### Method 4: Single Log Point

Tambahkan ONE log point di tempat strategis:

```typescript
.query(async ({ input, ctx }) => {
  const startTime = Date.now();
  
  try {
    // ... semua logic ...
    const result = await buildResponse();
    
    // ✅ ONE log with all info
    console.log("✓ Query success:", {
      endpoint: "getDailySummary",
      userId: ctx.session.user.id,
      duration: `${Date.now() - startTime}ms`,
      resultCount: result.sales.length,
    });
    
    return result;
  } catch (error) {
    // ❌ ONE error log
    console.error("✗ Query failed:", {
      endpoint: "getDailySummary",
      userId: ctx.session.user.id,
      duration: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});
```

---

## 🎯 Debugging Checklist

### Saat Dapat Error 500

- [ ] **Check browser console** - Lihat error message dari tRPC
- [ ] **Check Network tab** - Lihat request/response payload
- [ ] **Check server terminal** - Cari error merah/stack trace
- [ ] **Isolate the issue** - Test endpoint langsung (Postman/Thunder Client)
- [ ] **Add targeted logging** - Hanya di tempat suspect
- [ ] **Remove logs after fix** - Bersihkan debug logs

### Saat Debug Date/Time Issues

```typescript
// Log sekali saja dengan format jelas
console.log("📅 Date Debug:", {
  input: input.date,
  parsed: baseDate.toISOString(),
  local: baseDate.toLocaleString("id-ID"),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  rangeStart: rangeStart.toISOString(),
  rangeEnd: rangeEnd.toISOString(),
});
```

### Saat Debug Permission Issues

```typescript
// Log permission check hasil
console.log("🔐 Permission Check:", {
  userId: user.id,
  role: user.role,
  requestedOutlet: input.outletId,
  accessibleOutlets: user.userOutlets.map(uo => uo.outletId),
  hasAccess: hasAccess,
});
```

---

## 🧪 Testing Tanpa Log Spam

### Unit Test dengan Jest

```typescript
describe("getDailySummary", () => {
  it("should parse ISO date correctly", () => {
    const input = "2025-12-03T16:31:27.378Z";
    const dateStr = input.split("T")[0];
    expect(dateStr).toBe("2025-12-03");
  });
});
```

### Integration Test dengan Playwright

```typescript
test("dashboard loads without 500 error", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Wait for API call
  const response = await page.waitForResponse(
    (res) => res.url().includes("getDailySummary")
  );
  
  expect(response.status()).toBe(200);
  
  // Verify content
  await expect(page.locator("text=Total Penjualan")).toBeVisible();
});
```

---

## 🛠️ Tools Rekomendasi

### Browser DevTools
- **Network Tab:** Monitor semua API calls
- **Console Tab:** Lihat client-side errors
- **Performance Tab:** Check memory leaks

### VSCode Extensions
- **Thunder Client:** Test API tanpa Postman
- **Prisma:** Syntax highlighting & autocomplete
- **Error Lens:** Inline error messages

### Database Tools
- **Prisma Studio:** `npx prisma studio`
- **DBeaver / TablePlus:** GUI untuk inspect database

---

## 📋 Quick Reference

### Enable Debug Mode (Temporary)

```bash
# Terminal 1: Run with debug env
DEBUG_SALES=true npm run dev

# Terminal 2: Watch specific logs
npm run dev 2>&1 | grep "getDailySummary"
```

### Disable All Logs (Production-like)

```bash
# In .env.local
NODE_ENV=production
LOG_LEVEL=error
```

### Filter Server Logs

```bash
# Linux/Mac
npm run dev 2>&1 | grep -v "prisma:query"

# Or use | grep "ERROR" to only see errors
npm run dev 2>&1 | grep "ERROR"
```

---

## 🚀 Best Practices

1. **Log strategically** - Hanya log yang berguna
2. **Use log levels** - error, warn, info, debug
3. **Remove before commit** - Cleanup debug logs
4. **Use environment flags** - Conditional debugging
5. **Test in isolation** - Debug one feature at a time

---

**Remember:** Good debugging = targeted logging, not log spam! 🎯