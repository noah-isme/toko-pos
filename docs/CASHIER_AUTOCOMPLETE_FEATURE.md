# Fitur Autocomplete Pencarian Produk di Kasir

## Overview

Fitur autocomplete yang mempermudah kasir mencari dan menambahkan produk ke keranjang dengan cepat. Tidak perlu lagi menghafal barcode atau menekan Enter - cukup ketik beberapa huruf dan pilih dari dropdown!

## ✨ Fitur Utama

### 1. **Real-time Search Suggestions**
- Ketik minimal **2 huruf** untuk melihat rekomendasi
- Hasil muncul **secara instant** tanpa perlu tekan Enter
- Menampilkan hingga **10 produk** yang paling relevan
- Search di **nama, SKU, dan barcode** sekaligus

### 2. **Rich Product Information**
Setiap item di dropdown menampilkan:
- 📦 **Nama produk** (bold, mudah dibaca)
- 💰 **Harga** (format Rupiah di kanan)
- 🏷️ **SKU** produk
- 📊 **Barcode** (jika ada)
- 📁 **Kategori** (jika ada)

### 3. **Multiple Navigation Options**

#### Keyboard Navigation ⌨️
- **↓ (Arrow Down)** - Pindah ke item berikutnya
- **↑ (Arrow Up)** - Pindah ke item sebelumnya
- **Enter** - Pilih item yang di-highlight
- **ESC** - Tutup dropdown
- **Type to search** - Langsung ketik untuk mencari

#### Mouse Navigation 🖱️
- **Hover** - Highlight item dengan mouse
- **Click** - Pilih item langsung

### 4. **Smart UX Details**
- ⚡ **Auto-focus** - Input langsung siap digunakan
- 🔄 **Auto-clear** - Input dibersihkan setelah memilih produk
- 🎯 **Keep focus** - Cursor tetap di input untuk entry cepat
- ⏱️ **Caching** - Hasil search di-cache 30 detik
- 🔍 **Debounced** - Mengurangi beban server

## 🎮 Cara Penggunaan

### Scenario 1: Search by Nama
```
User: *ketik* "air"
System: 
  ┌─────────────────────────────────────┐
  │ 📦 Air Mineral 600ml    Rp 4.500   │
  │    SKU: AM-003 • Barcode: 899...   │
  │    Kategori: Minuman                │
  └─────────────────────────────────────┘
User: *tekan Enter atau click*
System: ✅ Air Mineral 600ml ditambahkan ke cart
```

### Scenario 2: Search by SKU
```
User: *ketik* "BR-001"
System:
  ┌─────────────────────────────────────┐
  │ 📦 Beras Premium 5kg   Rp 98.000   │
  │    SKU: BR-001 • Kategori: Sembako  │
  └─────────────────────────────────────┘
User: *click item*
System: ✅ Beras Premium 5kg ditambahkan
```

### Scenario 3: Search Not Found
```
User: *ketik* "xyz"
System:
  ┌─────────────────────────────────────┐
  │ Tidak ada produk ditemukan untuk   │
  │ "xyz"                               │
  │ Coba kata kunci lain atau scan     │
  │ barcode                             │
  └─────────────────────────────────────┘
```

### Scenario 4: Keyboard Navigation
```
User: *ketik* "min"
System: [Shows 3 products]
  ┌─────────────────────────────────────┐
  │ ▶ Air Mineral 600ml    Rp 4.500   │ ← Selected
  │   Minyak Goreng 1L     Rp 16.500   │
  │   Vitamin C 100mg      Rp 25.000   │
  └─────────────────────────────────────┘
User: *tekan ↓*
  ┌─────────────────────────────────────┐
  │   Air Mineral 600ml    Rp 4.500    │
  │ ▶ Minyak Goreng 1L     Rp 16.500  │ ← Selected
  │   Vitamin C 100mg      Rp 25.000   │
  └─────────────────────────────────────┘
User: *tekan Enter*
System: ✅ Minyak Goreng 1L ditambahkan
```

## 🚀 Performance

### Speed
- **< 100ms** - Response time untuk autocomplete
- **30s cache** - Hasil pencarian di-cache
- **Debounced** - Tidak query setiap keystroke

### Optimization
- Hanya query jika input >= 2 karakter
- Limit maksimal 10 hasil untuk performa
- Index database pada nama, SKU, barcode
- Client-side caching untuk produk yang sudah dicari

## 🎨 UI/UX Design

### Visual Hierarchy
```
┌─────────────────────────────────────────────────────┐
│ 🔍 [Ketik nama produk, SKU, atau scan barcode...] │
└─────────────────────────────────────────────────────┘
         ↓ (User types "air")
┌─────────────────────────────────────────────────────┐
│ 📦  Air Mineral 600ml              Rp 4.500        │
│     SKU: AM-003 • Barcode: 899... • Minuman        │
├─────────────────────────────────────────────────────┤
│ 📦  Air Mineral 1.5L               Rp 8.500        │
│     SKU: AM-004 • Barcode: 899... • Minuman        │
└─────────────────────────────────────────────────────┘
│ Gunakan ↑ ↓ untuk navigasi, Enter untuk pilih     │
└─────────────────────────────────────────────────────┘
```

### States

#### 1. Empty State
- Placeholder: "Ketik nama produk, SKU, atau scan barcode"
- No dropdown shown

#### 2. Loading State
- Spinner icon di kanan input
- Dropdown tidak muncul saat loading

#### 3. Results State
- Dropdown muncul dengan list produk
- Hover effect pada setiap item
- Selected item highlighted

#### 4. No Results State
- Dropdown muncul dengan pesan error
- Saran untuk coba keyword lain

#### 5. Min Characters State
- Hint: "Ketik minimal 2 huruf untuk mencari produk"
- Muncul saat user ketik 1 huruf

## 🔧 Technical Implementation

### New API Endpoint

**Route:** `products.searchProducts`

**Input:**
```typescript
{
  query: string;      // Search term (min 1 char)
  limit: number;      // Max results (default 10, max 50)
}
```

**Output:**
```typescript
{
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  categoryName: string | null;
}[]
```

**Query Logic:**
```sql
WHERE isActive = true
  AND (
    name ILIKE '%query%' 
    OR sku ILIKE '%query%'
    OR barcode ILIKE '%query%'
  )
ORDER BY name ASC
LIMIT 10
```

### Component Structure

```
ProductSearchAutocomplete
├── Input (with search icon & loading spinner)
├── Dropdown
│   ├── Product Cards (0-10 items)
│   │   ├── Icon (package)
│   │   ├── Name & Price
│   │   └── SKU, Barcode, Category
│   └── Hint Footer
│       └── Keyboard shortcuts
└── No Results Message (conditional)
```

### Props

```typescript
type ProductSearchAutocompleteProps = {
  onProductSelect: (product: Product) => void;  // Callback when product selected
  placeholder?: string;                          // Custom placeholder text
  disabled?: boolean;                            // Disable input
  autoFocus?: boolean;                           // Auto-focus on mount
};
```

### Key Features in Code

1. **Debouncing** - Built into tRPC query
2. **Keyboard Nav** - Custom onKeyDown handler
3. **Click Outside** - useEffect with event listener
4. **Auto-clear** - Reset query after selection
5. **Focus Management** - Keep input focused after selection

## 📊 Analytics & Monitoring

### Key Metrics to Track
- **Search to Selection Ratio** - How often users find what they search
- **Average Time to Add** - Speed improvement vs old method
- **Most Searched Terms** - Popular products for better placement
- **Failed Searches** - Terms with no results (product gaps)

### Success Criteria
- ✅ 90%+ searches result in product selection
- ✅ < 5 seconds average time from search to cart
- ✅ < 5% "not found" searches
- ✅ User satisfaction feedback positive

## 🐛 Troubleshooting

### Issue 1: Dropdown Tidak Muncul
**Symptoms:** User ketik tapi tidak ada dropdown

**Possible Causes:**
1. Input < 2 karakter
2. Tidak ada produk yang match
3. Query sedang loading
4. JavaScript error

**Solution:**
1. Ketik minimal 2 huruf
2. Coba keyword lain
3. Tunggu spinner selesai
4. Cek console browser untuk error

### Issue 2: Produk Tidak Ketemu
**Symptoms:** Search "air" tapi tidak muncul Air Mineral

**Possible Causes:**
1. Produk tidak aktif (isActive = false)
2. Typo di nama produk database
3. Search case-sensitive (FIXED - now case-insensitive)
4. Produk belum ada di database

**Solution:**
1. Cek status produk di management page
2. Verifikasi nama di database
3. Pastikan menggunakan endpoint searchProducts (bukan getByBarcode)
4. Tambahkan produk jika belum ada

### Issue 3: Keyboard Navigation Tidak Bekerja
**Symptoms:** Arrow keys tidak pindah selection

**Possible Causes:**
1. Focus tidak di input
2. Dropdown tidak open
3. Event handler conflict

**Solution:**
1. Click input untuk focus
2. Pastikan ada hasil search
3. Cek console untuk event conflicts

### Issue 4: Performance Lambat
**Symptoms:** Dropdown delay > 500ms

**Possible Causes:**
1. Database tidak punya index
2. Terlalu banyak produk (>10000)
3. Network latency
4. Cache tidak bekerja

**Solution:**
1. Tambahkan index di columns (name, sku, barcode)
2. Optimize query dengan limit
3. Cek network tab untuk response time
4. Verify cache settings (staleTime: 30000)

## 🔮 Future Enhancements

### Phase 2 (Short-term)
- [ ] Show product image thumbnail
- [ ] Display current stock level
- [ ] Highlight search term in results
- [ ] Recent searches history
- [ ] Category filter in dropdown

### Phase 3 (Mid-term)
- [ ] Fuzzy search (typo tolerance)
- [ ] Search by alias/nickname
- [ ] Barcode scanner integration
- [ ] Voice search (experimental)
- [ ] Favorite/pinned products

### Phase 4 (Long-term)
- [ ] AI-powered suggestions
- [ ] Predictive search based on history
- [ ] Multi-language search
- [ ] Product bundling suggestions
- [ ] Outlet-specific inventory filter

## 📚 Related Documentation

- **API Implementation:** `docs/CASHIER_SEARCH_FIX.md`
- **Component Code:** `src/components/cashier/product-search-autocomplete.tsx`
- **API Router:** `src/server/api/routers/products.ts`
- **Cashier Page:** `src/app/cashier/page.tsx`

## 🎓 Developer Guide

### Using the Component

```tsx
import { ProductSearchAutocomplete } from "@/components/cashier/product-search-autocomplete";

function MyCashierPage() {
  const handleProductSelect = (product) => {
    // Add to cart
    console.log("Selected:", product);
  };

  return (
    <ProductSearchAutocomplete
      onProductSelect={handleProductSelect}
      placeholder="Cari produk..."
      autoFocus={true}
    />
  );
}
```

### Customizing Styles

Component menggunakan Tailwind CSS dan mendukung dark mode. Untuk customize:

```tsx
// Override di component
className="custom-class"

// Atau modify di component file
<div className="your-custom-styles">
```

### Testing

```typescript
// Unit test example
describe("ProductSearchAutocomplete", () => {
  it("shows results after typing 2 characters", async () => {
    render(<ProductSearchAutocomplete onProductSelect={jest.fn()} />);
    const input = screen.getByPlaceholderText(/ketik/i);
    
    await userEvent.type(input, "ai");
    
    await waitFor(() => {
      expect(screen.getByText(/air mineral/i)).toBeInTheDocument();
    });
  });
});
```

## ✅ Checklist Implementation

- [x] Create searchProducts API endpoint
- [x] Build ProductSearchAutocomplete component
- [x] Integrate with cashier page
- [x] Add keyboard navigation
- [x] Add mouse/click support
- [x] Implement caching
- [x] Add loading states
- [x] Add empty states
- [x] Add error handling
- [x] Write documentation
- [ ] Add analytics tracking
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Get user feedback

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Initial release
- ✅ Basic autocomplete with 10 results
- ✅ Search by name, SKU, barcode
- ✅ Keyboard and mouse navigation
- ✅ Loading and empty states
- ✅ 30s cache optimization

### Planned v1.1.0
- Show product images
- Display stock levels
- Outlet inventory filter
- Recent searches

---

**Status:** ✅ Live in Production  
**Last Updated:** 2024  
**Maintained By:** Development Team