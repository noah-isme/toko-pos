import { validateImageFile, isDataUrl } from "@/lib/storage";
import { productUpsertInputSchema, productSummarySchema } from "@/server/api/schemas/products";
import { generateProductCode } from "@/components/ui/barcode";

describe("product image upload validation", () => {
  it("accepts png within size limit", () => {
    const result = validateImageFile("image/png", 1024);
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported mime type", () => {
    const result = validateImageFile("application/pdf", 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe("invalid_type");
      expect(result.error.message).toMatch(/pdf/i);
    }
  });

  it("rejects files exceeding 5MB", () => {
    const oversized = 5 * 1024 * 1024 + 1;
    const result = validateImageFile("image/jpeg", oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reason).toBe("too_large");
      expect(result.error.message).toMatch(/5 mb/i);
    }
  });

  it("performs case-insensitive mime check", () => {
    const result = validateImageFile("IMAGE/PNG", 1024);
    expect(result.ok).toBe(true);
  });
});

describe("isDataUrl", () => {
  it("detects data urls", () => {
    expect(isDataUrl("data:image/png;base64,iVBORw0KG")).toBe(true);
  });

  it("rejects http urls", () => {
    expect(isDataUrl("https://cdn.example.com/img.png")).toBe(false);
    expect(isDataUrl(null)).toBe(false);
    expect(isDataUrl(undefined)).toBe(false);
    expect(isDataUrl("")).toBe(false);
  });
});

describe("generateProductCode", () => {
  it("produces uppercase alphanumeric from sku", () => {
    const code = generateProductCode({ sku: "AM-003" });
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code.length).toBeGreaterThanOrEqual(8);
  });

  it("falls back to name when sku missing", () => {
    const code = generateProductCode({ name: "Kopi Susu" });
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code.startsWith("KOPISUSU".slice(0, 4).toUpperCase())).toBe(true);
  });

  it("falls back to PROD prefix when both missing", () => {
    const code = generateProductCode({});
    expect(code.startsWith("PROD")).toBe(true);
  });

  it("strips non-alphanumeric characters", () => {
    const code = generateProductCode({ sku: "A-1!@# B" });
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code).not.toContain("-");
    expect(code).not.toContain("!");
  });

  it("returns distinct codes across rapid successive calls", async () => {
    const a = generateProductCode({ sku: "TEST" });
    await new Promise((r) => setTimeout(r, 5));
    const b = generateProductCode({ sku: "TEST" });
    expect(a).not.toBe(b);
  });
});

describe("product imageUrl schema", () => {
  it("accepts a valid http url", () => {
    const parsed = productUpsertInputSchema.parse({
      name: "Produk A",
      sku: "SKU-A",
      price: 1000,
      imageUrl: "https://cdn.example.com/img.png",
    });
    expect(parsed.imageUrl).toBe("https://cdn.example.com/img.png");
  });

  it("accepts an empty string and treats it as optional", () => {
    const parsed = productUpsertInputSchema.parse({
      name: "Produk A",
      sku: "SKU-A",
      price: 1000,
      imageUrl: "",
    });
    expect(parsed.imageUrl).toBe("");
  });

  it("allows undefined imageUrl", () => {
    const parsed = productUpsertInputSchema.parse({
      name: "Produk A",
      sku: "SKU-A",
      price: 1000,
    });
    expect(parsed.imageUrl).toBeUndefined();
  });

  it("rejects a malformed url", () => {
    const result = productUpsertInputSchema.safeParse({
      name: "Produk A",
      sku: "SKU-A",
      price: 1000,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("productSummarySchema accepts nullable imageUrl", () => {
    const parsed = productSummarySchema.parse({
      id: "p-1",
      name: "Produk A",
      sku: "SKU-A",
      barcode: null,
      imageUrl: "https://cdn.example.com/img.png",
      price: 1000,
      categoryId: null,
      category: null,
      supplierId: null,
      supplier: null,
      costPrice: null,
      isActive: true,
      defaultDiscountPercent: null,
      promoName: null,
      promoPrice: null,
      promoStart: null,
      promoEnd: null,
      isTaxable: false,
      taxRate: null,
      minStock: 0,
    });
    expect(parsed.imageUrl).toBe("https://cdn.example.com/img.png");
  });

  it("productSummarySchema accepts null imageUrl", () => {
    const parsed = productSummarySchema.parse({
      id: "p-1",
      name: "Produk A",
      sku: "SKU-A",
      barcode: null,
      imageUrl: null,
      price: 1000,
      categoryId: null,
      category: null,
      supplierId: null,
      supplier: null,
      costPrice: null,
      isActive: true,
      defaultDiscountPercent: null,
      promoName: null,
      promoPrice: null,
      promoStart: null,
      promoEnd: null,
      isTaxable: false,
      taxRate: null,
      minStock: 0,
    });
    expect(parsed.imageUrl).toBeNull();
  });
});
