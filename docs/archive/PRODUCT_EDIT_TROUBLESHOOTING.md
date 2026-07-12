# 🔧 Product Edit Troubleshooting Guide

## Problem
Saat mencoba update informasi produk, proses gagal tanpa keterangan dan nilai selalu kembali kosong.

## Root Causes Identified

### 1. Field Name Mismatch
**Problem:** API response menggunakan field name yang berbeda dengan yang diharapkan frontend.

**API sends:**
- `price` 
- `promoPrice`
- `promoStart`
- `promoEnd`

**Frontend expects:**
- `sellingPrice`
- `promoValue`
- `promoStartDate`
- `promoEndDate`

**Fix:** API response sekarang mengirim kedua format field names untuk kompatibilitas.

### 2. Missing Error Messages
**Problem:** Error handler di frontend tidak menampilkan detail error dari API.

**Before:**
```typescript
catch {
  toast({
    title: "Error",
    description: "Terjadi kesalahan saat menyimpan produk",
  });
}
```

**After:**
```typescript
catch (error) {
  console.error("Error saving product:", error);
  toast({
    title: "Error",
    description: error instanceof Error 
      ? error.message 
      : "Terjadi kesalahan saat menyimpan produk",
  });
}
```

### 3. No Request/Response Logging
**Problem:** Sulit debug karena tidak ada logging.

**Fix:** Added comprehensive logging:
```typescript
// Frontend
console.log("Sending update payload:", payload);
console.log("Update response:", result);

// Backend
console.log("Updating product:", id);
console.log("Request body:", JSON.stringify(body, null, 2));
```

## Solutions Applied

### ✅ 1. Fixed API Response Format
**File:** `src/app/api/products/[id]/route.ts`

Added compatibility fields:
```typescript
const response = {
  // Original fields
  price: Number(product.price),
  promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
  promoStart: product.promoStart?.toISOString(),
  promoEnd: product.promoEnd?.toISOString(),
  
  // Compatibility fields for frontend
  sellingPrice: Number(product.price),
  promoValue: product.promoPrice ? Number(product.promoPrice) : null,
  promoStartDate: product.promoStart?.toISOString(),
  promoEndDate: product.promoEnd?.toISOString(),
  
  // Additional fields
  discount: product.defaultDiscountPercent ? Number(product.defaultDiscountPercent) : null,
  taxId: product.taxRate ? product.taxRate.toString() : null,
  unit: "",
  tags: [],
}
```

### ✅ 2. Enhanced Error Handling
**File:** `src/app/api/products/[id]/route.ts`

Added validation and detailed error messages:
```typescript
// Validate required fields
if (!body.name || !body.sku) {
  return NextResponse.json(
    { error: "Name and SKU are required" },
    { status: 400 }
  );
}

if (!body.sellingPrice || parseFloat(body.sellingPrice) <= 0) {
  return NextResponse.json(
    { error: "Selling price must be greater than 0" },
    { status: 400 }
  );
}

// Better error response
catch (error) {
  console.error("Error updating product:", error);
  return NextResponse.json(
    {
      error: "Failed to update product",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" 
        ? error instanceof Error ? error.stack : undefined 
        : undefined,
    },
    { status: 500 }
  );
}
```

### ✅ 3. Improved Frontend Error Display
**File:** `src/app/management/products/edit/[id]/page.tsx`

Shows actual error message from API:
```typescript
const result = await response.json();
console.log("Update response:", result);

if (!response.ok) {
  throw new Error(
    result.error || result.details || "Gagal menyimpan produk"
  );
}
```

## How to Debug

### Step 1: Open Browser Console
Press `F12` or right-click → Inspect → Console tab

### Step 2: Try to Save Product
Fill in product form and click save button.

### Step 3: Check Console Logs
You should see:
```
Sending update payload: { name: "...", sku: "...", ... }
Updating product: cmh0l4vpb0016jynnj3weh2en
Request body: { ... }
Update response: { success: true, ... }
```

### Step 4: Look for Errors
If there's an error, console will show:
```
Error saving product: Error: Name and SKU are required
```
or
```
Error updating product: Error: Selling price must be greater than 0
```

## Common Issues & Solutions

### Issue 1: "Name and SKU are required"
**Cause:** Form fields empty or not being sent
**Solution:** 
- Check formData state is populated
- Verify input fields are bound to formData
- Ensure validation passes before submit

### Issue 2: "Selling price must be greater than 0"
**Cause:** Price field empty or invalid
**Solution:**
- Enter valid price > 0
- Check number parsing: `parseFloat(formData.sellingPrice)`

### Issue 3: Values Reset to Empty
**Cause:** 
- API response not matching frontend expectations
- Form not properly loading data from API

**Solution:**
- Check API response format matches frontend types
- Verify useEffect loads data correctly
- Check console for "Failed to load product" errors

### Issue 4: No Error Message Shown
**Cause:** Silent failure without error handling

**Solution:**
- Check browser console for errors
- Verify network tab shows request/response
- Look for CORS or authentication errors

## Testing Checklist

- [ ] Open product edit page
- [ ] Check console: "Loading product..." should appear
- [ ] Verify form fields are populated with existing data
- [ ] Make a change (e.g., update name)
- [ ] Click save
- [ ] Check console logs for request payload
- [ ] Check console logs for response
- [ ] Verify success toast appears
- [ ] Confirm redirect to products list
- [ ] Verify changes are saved in database

## API Response Structure

### GET /api/products/[id]
```json
{
  "id": "string",
  "name": "string",
  "sku": "string",
  "barcode": "string|null",
  "description": "string|null",
  "price": 100000,
  "sellingPrice": 100000,
  "costPrice": 75000,
  "categoryId": "string|null",
  "categoryName": "string|null",
  "supplierId": "string|null",
  "supplierName": "string|null",
  "minStock": 10,
  "discount": 5,
  "defaultDiscountPercent": 5,
  "promoName": "string|null",
  "promoPrice": 90000,
  "promoValue": 90000,
  "promoStart": "2024-01-01T00:00:00.000Z",
  "promoStartDate": "2024-01-01T00:00:00.000Z",
  "promoEnd": "2024-12-31T23:59:59.999Z",
  "promoEndDate": "2024-12-31T23:59:59.999Z",
  "isTaxable": true,
  "taxRate": 11,
  "taxId": "11",
  "isActive": true,
  "status": "active",
  "unit": "",
  "tags": [],
  "image": null,
  "stocks": [
    {
      "outletId": "string",
      "outlet": { "id": "string", "name": "string" },
      "quantity": 50,
      "minStock": 10
    }
  ]
}
```

### PUT /api/products/[id] Request
```json
{
  "name": "Product Name",
  "sku": "SKU-001",
  "barcode": "123456789",
  "description": "Product description",
  "sellingPrice": 100000,
  "costPrice": 75000,
  "categoryId": "cat-id",
  "supplierId": "sup-id",
  "status": "active",
  "outlets": [
    {
      "outletId": "outlet-id",
      "stock": 50,
      "minStock": 10
    }
  ]
}
```

### PUT /api/products/[id] Response (Success)
```json
{
  "success": true,
  "product": {
    "id": "product-id",
    "name": "Product Name",
    "sku": "SKU-001"
  }
}
```

### PUT /api/products/[id] Response (Error)
```json
{
  "error": "Failed to update product",
  "details": "Name and SKU are required"
}
```

## Files Modified

1. ✅ `src/app/api/products/[id]/route.ts`
   - Added compatibility fields in GET response
   - Added validation in PUT handler
   - Enhanced error logging and messages

2. ✅ `src/app/management/products/edit/[id]/page.tsx`
   - Added request/response logging
   - Improved error handling
   - Display actual error messages

## Build Status
```bash
pnpm build
# ✅ Compiled successfully
```

## Next Steps

If issues persist:

1. **Check Database Connection**
   ```bash
   pnpm prisma studio
   ```

2. **Verify Product Exists**
   - Check product ID is valid
   - Verify product is not deleted

3. **Check Authentication**
   - Ensure user is logged in
   - Verify session is active

4. **Check Permissions**
   - Ensure user has edit permissions
   - Verify role allows product updates

5. **Check Network**
   - Open Network tab in DevTools
   - Look for failed requests
   - Check request/response details

## Support

If problem continues:
1. Open browser console (F12)
2. Take screenshot of errors
3. Copy console logs
4. Check network tab for failed requests
5. Report issue with all details above

---

**Status:** ✅ Issues identified and fixed  
**Last Updated:** 2024-12-03  
**Version:** 1.1.0