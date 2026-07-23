import {
  taxSettingSchema,
  listTaxSettingsOutputSchema,
  upsertTaxSettingInputSchema,
  activateTaxSettingInputSchema,
  activeTaxSettingOutputSchema,
  simpleSuccessSchema,
} from "@/server/api/schemas/settings";

describe("settings schema validation", () => {
  describe("upsertTaxSettingInputSchema", () => {
    it("accepts a valid create payload", () => {
      const parsed = upsertTaxSettingInputSchema.parse({
        name: "PPN 11%",
        rate: 11,
      });
      expect(parsed.name).toBe("PPN 11%");
      expect(parsed.rate).toBe(11);
      expect(parsed.id).toBeUndefined();
      expect(parsed.isActive).toBeUndefined();
    });

    it("accepts a valid update payload with id", () => {
      const parsed = upsertTaxSettingInputSchema.parse({
        id: "tax-123",
        name: "PPN 12%",
        rate: 12,
        isActive: true,
      });
      expect(parsed.id).toBe("tax-123");
      expect(parsed.isActive).toBe(true);
    });

    it("rejects empty name", () => {
      const result = upsertTaxSettingInputSchema.safeParse({
        name: "",
        rate: 11,
      });
      expect(result.success).toBe(false);
    });

    it("accepts whitespace-only name (min(1) checks length, not content)", () => {
      const result = upsertTaxSettingInputSchema.safeParse({
        name: "   ",
        rate: 11,
      });
      expect(result.success).toBe(true);
    });

    it("rejects rate below 0", () => {
      const result = upsertTaxSettingInputSchema.safeParse({
        name: "PPN",
        rate: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects rate above 100", () => {
      const result = upsertTaxSettingInputSchema.safeParse({
        name: "PPN",
        rate: 101,
      });
      expect(result.success).toBe(false);
    });

    it("accepts rate of 0", () => {
      const parsed = upsertTaxSettingInputSchema.parse({
        name: "Non-PPN",
        rate: 0,
      });
      expect(parsed.rate).toBe(0);
    });

    it("accepts rate of 100", () => {
      const parsed = upsertTaxSettingInputSchema.parse({
        name: "Max PPN",
        rate: 100,
      });
      expect(parsed.rate).toBe(100);
    });

    it("accepts decimal rates", () => {
      const parsed = upsertTaxSettingInputSchema.parse({
        name: "PPN 11.5%",
        rate: 11.5,
      });
      expect(parsed.rate).toBe(11.5);
    });
  });

  describe("activateTaxSettingInputSchema", () => {
    it("accepts a valid id", () => {
      const parsed = activateTaxSettingInputSchema.parse({
        id: "tax-123",
      });
      expect(parsed.id).toBe("tax-123");
    });

    it("rejects empty id", () => {
      const result = activateTaxSettingInputSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("taxSettingSchema", () => {
    it("accepts a valid tax setting object", () => {
      const parsed = taxSettingSchema.parse({
        id: "tax-1",
        name: "PPN 11%",
        rate: 11,
        isActive: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      expect(parsed.id).toBe("tax-1");
      expect(parsed.isActive).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = taxSettingSchema.safeParse({
        id: "tax-1",
        name: "PPN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("listTaxSettingsOutputSchema", () => {
    it("accepts an array of tax settings", () => {
      const parsed = listTaxSettingsOutputSchema.parse([
        {
          id: "tax-1",
          name: "PPN 11%",
          rate: 11,
          isActive: true,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ]);
      expect(parsed).toHaveLength(1);
    });

    it("accepts an empty array", () => {
      const parsed = listTaxSettingsOutputSchema.parse([]);
      expect(parsed).toHaveLength(0);
    });
  });

  describe("activeTaxSettingOutputSchema", () => {
    it("accepts a valid active setting", () => {
      const parsed = activeTaxSettingOutputSchema.parse({
        id: "tax-1",
        name: "PPN 11%",
        rate: 11,
      });
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe("tax-1");
    });

    it("accepts null when no active setting exists", () => {
      const parsed = activeTaxSettingOutputSchema.parse(null);
      expect(parsed).toBeNull();
    });
  });

  describe("simpleSuccessSchema", () => {
    it("accepts { success: true }", () => {
      const parsed = simpleSuccessSchema.parse({ success: true });
      expect(parsed.success).toBe(true);
    });

    it("rejects { success: false }", () => {
      const result = simpleSuccessSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });
  });
});
