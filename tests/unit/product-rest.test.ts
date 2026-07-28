import { describe, expect, it } from "vitest";

import { hasValidOutletStocks } from "@/server/api/utils/product-rest";

describe("legacy REST product inventory validation", () => {
  it("accepts omitted and non-negative integer stock", () => {
    expect(hasValidOutletStocks(undefined)).toBe(true);
    expect(
      hasValidOutletStocks([
        { outletId: "outlet-1", stock: 0 },
        { outletId: "outlet-2", stock: 12 },
      ]),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    [{ outletId: "", stock: 1 }],
    [{ outletId: "outlet-1", stock: -1 }],
    [{ outletId: "outlet-1", stock: 1.5 }],
    [{ outletId: "outlet-1", stock: "2" }],
  ])("rejects malformed or negative stock: %j", (value) => {
    expect(hasValidOutletStocks(value)).toBe(false);
  });
});
