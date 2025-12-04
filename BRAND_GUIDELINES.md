# 🎨 Toko POS Brand Assets & Logo Guidelines

## 📦 Logo Files

### Available Logo Variants

#### 1. **Horizontal Logo** (Default)
- **File**: `/public/brand/toko-pos-logo.svg`
- **Dimensions**: 220×56px
- **Usage**: Header, navbar, main branding
- **Background**: Light/white backgrounds

#### 2. **Icon Only**
- **File**: `/public/brand/toko-pos-icon.svg`
- **Dimensions**: 64×64px
- **Usage**: Favicon, app icon, avatar
- **Background**: Light/white backgrounds

#### 3. **Horizontal Logo - Inverted**
- **File**: `/public/brand/toko-pos-logo-inverted.svg`
- **Dimensions**: 220×56px
- **Usage**: Dark mode, dark backgrounds, hero sections
- **Background**: Dark backgrounds

#### 4. **Icon Only - Inverted**
- **File**: `/public/brand/toko-pos-icon-inverted.svg`
- **Dimensions**: 64×64px
- **Usage**: Dark mode favicon, dark backgrounds
- **Background**: Dark backgrounds

---

## 🎨 Brand Colors

### Primary Palette
```css
/* Receipt Container */
--bg-receipt: #ECFDF3;        /* Emerald 50 - light mint */
--border-receipt: #16A34A;     /* Green 600 - primary brand */

/* Receipt Lines */
--line-primary: #16A34A;       /* Green 600 - 95% opacity */
--line-secondary: #16A34A;     /* Green 600 - 75% opacity */

/* Transaction Indicator (Dot) */
--dot-active: #22C55E;         /* Green 500 - bright accent */

/* Typography */
--text-primary: #111827;       /* Gray 900 - headings */
--text-secondary: #6B7280;     /* Gray 500 - body */
```

### Color Usage
| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Emerald 50 | `#ECFDF3` | Icon container background |
| Border | Green 600 | `#16A34A` | Icon container border, receipt lines |
| Accent | Green 500 | `#22C55E` | Active indicator dot |
| Text | Gray 900 | `#111827` | Brand text "Toko POS" |
| Text Light | Gray 500 | `#6B7280` | Supporting text |

---

## 🧩 Logo Design Elements

### Icon Composition
The icon consists of three key elements:

1. **Receipt Container**
   - Rounded rectangle (rx="12" or rx="14")
   - Light emerald background (#ECFDF3)
   - Green border (#16A34A)
   - Represents a POS receipt

2. **Receipt Lines**
   - 2 horizontal lines with rounded caps
   - Primary line (95% opacity) - transaction item
   - Secondary line (75% opacity) - subtotal/detail
   - Represent printed receipt data

3. **Transaction Indicator**
   - Bright green circle (#22C55E)
   - Positioned at bottom right
   - Represents active transaction/live status
   - Creates visual interest and movement

### Typography
- **"Toko"**: Font-weight 600 (semibold), 18px
- **"POS"**: Font-weight 500 (medium), 16px, letter-spacing 0.18em
- Font Family: Inter, system-ui, -apple-system, sans-serif

---

## 💻 Usage in Code

### Brand Component

We've created a reusable `<Brand />` component:

```tsx
import { Brand } from "@/components/ui/brand";

// Logo variant (full horizontal)
<Brand variant="logo" size="md" />

// Icon only
<Brand variant="icon" size="md" />

// Text only
<Brand variant="text" size="md" />

// Inverted for dark backgrounds
<Brand variant="logo" inverted size="md" />

// Custom className
<Brand variant="logo" size="sm" className="opacity-90" />
```

### Size Options
- `sm`: Small (140×36 logo, 32×32 icon)
- `md`: Medium (180×45 logo, 48×48 icon) - **default**
- `lg`: Large (220×56 logo, 64×64 icon)

### BrandWithText Component

```tsx
import { BrandWithText } from "@/components/ui/brand";

// Icon + Text combination
<BrandWithText size="md" />

// Inverted version
<BrandWithText inverted size="lg" />
```

---

## 📐 Logo Specifications

### Clear Space
Maintain clear space around the logo equal to the height of the icon:
- Minimum clear space: 40px on all sides (for standard logo)
- Never place other elements closer than this distance

### Minimum Size
- **Logo (horizontal)**: 100px width minimum
- **Icon only**: 24px minimum
- Below minimum size, logo legibility is compromised

### Scalability
Logo is vector-based (SVG) and scales infinitely:
- ✅ Retina displays
- ✅ Print materials
- ✅ Large format displays
- ✅ Responsive web design

---

## ✅ Do's and ❌ Don'ts

### ✅ Do:
- Use the provided SVG files
- Maintain aspect ratio when scaling
- Use inverted version on dark backgrounds
- Ensure sufficient contrast with background
- Use appropriate size for context

### ❌ Don't:
- Change brand colors
- Distort or stretch the logo
- Add effects (shadows, gradients, outlines)
- Rotate the logo
- Place on busy backgrounds
- Use low-resolution raster versions
- Modify the icon elements

---

## 🎯 Usage Examples

### 1. Site Header
```tsx
<header className="bg-white border-b">
  <div className="container flex items-center justify-between">
    <Brand variant="logo" size="sm" />
    {/* navigation */}
  </div>
</header>
```

### 2. Login Page (Hero)
```tsx
<div className="bg-emerald-600">
  <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-4">
    <Brand variant="icon" inverted size="md" />
    <span className="text-white text-3xl font-bold">Toko POS</span>
  </div>
</div>
```

### 3. Mobile Logo
```tsx
<div className="lg:hidden">
  <Brand variant="logo" size="md" />
</div>
```

### 4. Favicon (in metadata)
```tsx
// app/layout.tsx
export const metadata = {
  icons: {
    icon: '/brand/toko-pos-icon.svg',
  },
};
```

---

## 🌈 Background Compatibility

### Light Backgrounds
Use **standard** versions:
- White: ✅ Perfect
- Gray 50-100: ✅ Perfect
- Light colors: ✅ Good (ensure contrast)
- Gradients (light): ✅ Good

### Dark Backgrounds
Use **inverted** versions:
- Black: ✅ Perfect
- Gray 800-900: ✅ Perfect
- Dark emerald: ✅ Perfect (hero sections)
- Dark colors: ✅ Good

### Avoid
- ❌ Busy patterns
- ❌ Low contrast combinations
- ❌ Textured backgrounds
- ❌ Competing colors (red, orange)

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
- Use full horizontal logo
- Size: `md` or `lg`
- Positioned in header/navbar

### Tablet (640px - 1024px)
- Use full horizontal logo
- Size: `sm` or `md`
- Centered or left-aligned

### Mobile (<640px)
- Use icon only OR compact logo
- Size: `sm`
- Optimized for touch targets

---

## 🎨 Brand Philosophy

### Design Intent
The Toko POS logo represents:
- **Simplicity**: Clean, minimal design
- **Reliability**: Solid, trustworthy appearance
- **Modernity**: Contemporary aesthetic
- **Functionality**: Receipt icon = core POS function

### Visual Language
- **Rounded corners**: Friendly, approachable
- **Green palette**: Growth, success, go/active
- **Receipt motif**: Clear industry association
- **Active dot**: Live transactions, real-time

---

## 📂 File Structure

```
public/
└── brand/
    ├── toko-pos-logo.svg              # Horizontal logo
    ├── toko-pos-icon.svg              # Icon only
    ├── toko-pos-logo-inverted.svg     # Dark mode logo
    └── toko-pos-icon-inverted.svg     # Dark mode icon

src/
└── components/
    └── ui/
        └── brand.tsx                   # Brand component
```

---

## 🚀 Implementation Checklist

### Pages Updated
- ✅ Login page (hero + mobile)
- ✅ Site header/navbar
- ✅ Components with Brand component
- ⏳ Dashboard (if needed)
- ⏳ Footer (if needed)
- ⏳ Email templates (future)

### To Do
- [ ] Generate PNG versions for email/social
- [ ] Create favicon.ico from icon.svg
- [ ] Add apple-touch-icon.png
- [ ] Create og-image with logo
- [ ] Print stylesheet logo optimization

---

## 📊 Technical Specs

### SVG Attributes
```xml
width="220" height="56"           <!-- Logo horizontal -->
width="64" height="64"            <!-- Icon only -->
viewBox="0 0 220 56"              <!-- Logo viewport -->
viewBox="0 0 64 64"               <!-- Icon viewport -->
fill="none"                       <!-- No default fill -->
xmlns="http://www.w3.org/2000/svg"
```

### Optimization
- ✅ Clean SVG code (no unnecessary attributes)
- ✅ Optimized paths
- ✅ Minimal file size (~1-2KB)
- ✅ No embedded fonts (system fonts)
- ✅ Inline styles (no external CSS)

---

## 🎓 Brand Guidelines Summary

| Aspect | Guideline |
|--------|-----------|
| **Primary Logo** | Horizontal logo on light backgrounds |
| **Colors** | Green 600 (#16A34A) + Emerald 50 (#ECFDF3) |
| **Typography** | Inter/System fonts, semibold + medium |
| **Spacing** | 40px minimum clear space |
| **Size** | 100px width minimum for logo |
| **Format** | SVG (vector) for all uses |
| **Accessibility** | Alt text: "Toko POS" |

---

## 💡 Tips

1. **Always use SVG** for web - perfect scaling
2. **Choose correct variant** - standard vs inverted
3. **Maintain aspect ratio** - never distort
4. **Test on backgrounds** - ensure readability
5. **Use Brand component** - consistent implementation
6. **Provide alt text** - accessibility first

---

**Version**: 1.0.0  
**Last Updated**: December 4, 2025  
**Status**: ✅ Production Ready
