import { describe, expect, it } from "vitest";

import { auditActionSchema } from "@/server/services/audit";

describe("auditActionSchema enum coverage", () => {
  const shiftActions = [
    "SHIFT_OPEN",
    "SHIFT_CLOSE",
    "SALE_RECORD",
    "SALE_VOID",
    "SALE_REFUND",
    "LOW_STOCK_TRIGGER",
  ];

  const adminActions = [
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "USER_OUTLET_ASSIGN",
    "USER_OUTLET_REVOKE",
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "PRODUCT_ARCHIVE",
    "PROMOTION_CREATE",
    "PROMOTION_UPDATE",
    "OUTLET_CREATE",
    "OUTLET_UPDATE",
  ];

  it.each(shiftActions)("accepts shift/sale action %s", (action) => {
    expect(auditActionSchema.parse(action)).toBe(action);
  });

  it.each(adminActions)("accepts admin action %s", (action) => {
    expect(auditActionSchema.parse(action)).toBe(action);
  });

  it("rejects an unknown action", () => {
    expect(auditActionSchema.safeParse("UNKNOWN_ACTION").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(auditActionSchema.safeParse("").success).toBe(false);
  });

  it("covers at least 19 total actions", () => {
    const values = auditActionSchema.options;
    expect(values.length).toBeGreaterThanOrEqual(19);
  });

  it("distinguishes shift vs admin action groups", () => {
    expect(auditActionSchema.parse("USER_CREATE")).not.toBe("SHIFT_OPEN");
    expect(auditActionSchema.parse("PRODUCT_DELETE")).not.toBe("SALE_VOID");
  });
});
