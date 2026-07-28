type OutletStockInput = {
  outletId?: unknown;
  stock?: unknown;
};

export const hasValidOutletStocks = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;

  return value.every((outlet: OutletStockInput) => {
    const stock = outlet.stock ?? 0;
    return (
      typeof outlet.outletId === "string" &&
      outlet.outletId.length > 0 &&
      typeof stock === "number" &&
      Number.isInteger(stock) &&
      stock >= 0
    );
  });
};
