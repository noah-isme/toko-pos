import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateLowStock } from "@/server/services/lowStock";

const createClient = () => ({
  product: {
    findUnique: vi.fn(),
  },
  inventory: {
    findUnique: vi.fn(),
  },
  lowStockAlert: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

describe("evaluateLowStock service", () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient();
  });

  it("creates a low stock alert when quantity is below threshold", async () => {
    client.product.findUnique.mockResolvedValue({ minStock: 10 });
    client.inventory.findUnique.mockResolvedValue({ quantity: 4 });
    client.lowStockAlert.findFirst.mockResolvedValue(null);
    client.lowStockAlert.create.mockResolvedValue({
      id: "alert-1",
      productId: "product-1",
      outletId: "outlet-1",
      triggeredAt: new Date(),
      clearedAt: null,
      note: null,
    });

    const result = await evaluateLowStock(
      { productId: "product-1", outletId: "outlet-1" },
      client as unknown as Parameters<typeof evaluateLowStock>[1],
    );

    expect(result.status).toBe("triggered");
    expect(client.lowStockAlert.create).toHaveBeenCalledWith({
      data: {
        productId: "product-1",
        outletId: "outlet-1",
        note: undefined,
      },
    });
  });

  it("deduplicates alerts within the same day", async () => {
    const now = new Date();
    client.product.findUnique.mockResolvedValue({ minStock: 5 });
    client.inventory.findUnique.mockResolvedValue({ quantity: 2 });
    client.lowStockAlert.findFirst.mockResolvedValue({
      id: "alert-existing",
      productId: "product-1",
      outletId: "outlet-1",
      triggeredAt: now,
      clearedAt: null,
      note: null,
    });

    const result = await evaluateLowStock(
      { productId: "product-1", outletId: "outlet-1" },
      client as unknown as Parameters<typeof evaluateLowStock>[1],
    );

    expect(result.status).toBe("unchanged");
    expect(client.lowStockAlert.create).not.toHaveBeenCalled();
    expect(client.lowStockAlert.update).not.toHaveBeenCalled();
  });

  it("clears existing alerts when stock recovers", async () => {
    const alert = {
      id: "alert-to-clear",
      productId: "product-1",
      outletId: "outlet-1",
      triggeredAt: new Date(Date.now() - 60 * 60 * 1000),
      clearedAt: null,
      note: null,
    };
    client.product.findUnique.mockResolvedValue({ minStock: 5 });
    client.inventory.findUnique.mockResolvedValue({ quantity: 20 });
    client.lowStockAlert.findFirst.mockResolvedValue(alert);
    client.lowStockAlert.update.mockResolvedValue({
      ...alert,
      clearedAt: new Date(),
    });

    const result = await evaluateLowStock(
      { productId: "product-1", outletId: "outlet-1" },
      client as unknown as Parameters<typeof evaluateLowStock>[1],
    );

    expect(result.status).toBe("cleared");
    expect(client.lowStockAlert.update).toHaveBeenCalledWith({
      where: { id: alert.id },
      data: expect.objectContaining({ clearedAt: expect.any(Date) }),
    });
  });
});
