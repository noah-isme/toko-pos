import { beforeEach, describe, expect, it, vi } from "vitest";

const cashSessionFindFirst = vi.hoisted(() => vi.fn());
const saleFindUniqueOutside = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => {
  const db = {
    cashSession: {
      findFirst: cashSessionFindFirst,
    },
    sale: {
      findUnique: saleFindUniqueOutside,
    },
    $transaction: transactionMock,
  };

  return { db };
});

const writeAuditLogMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/server/services/audit", () => ({
  writeAuditLog: writeAuditLogMock,
}));

const evaluateLowStockMock = vi.hoisted(() => vi.fn().mockResolvedValue({ status: "unchanged" }));
vi.mock("@/server/services/lowStock", () => ({
  evaluateLowStock: evaluateLowStockMock,
}));

import { Role, SaleStatus } from "@/server/db/enums";
import { salesRouter } from "@/server/api/routers/sales";

const createCaller = () =>
  salesRouter.createCaller({
    session: {
      user: {
        id: "cashier-test",
        name: "Kasir Test",
        role: Role.CASHIER,
      },
      expires: new Date().toISOString(),
    },
  });

const sampleSale = {
  id: "sale-1",
  outletId: "OUTLET-1",
  receiptNumber: "POS-0001",
  status: SaleStatus.COMPLETED,
  totalNet: 120000,
  items: [
    {
      id: "item-1",
      productId: "product-1",
      quantity: 2,
      unitPrice: 30000,
    },
    {
      id: "item-2",
      productId: "product-2",
      quantity: 1,
      unitPrice: 60000,
    },
  ],
  refunds: [],
};

const setupTransaction = (overrides?: Partial<typeof sampleSale>) => {
  const saleData = { ...sampleSale, ...overrides };
  const saleFindUniqueTx = vi.fn().mockResolvedValue(saleData);
  const saleUpdateMock = vi.fn().mockResolvedValue({ ...saleData, status: saleData.status });
  const refundCreateMock = vi.fn().mockResolvedValue({ id: "refund-1" });
  const inventoryUpsertMock = vi.fn().mockResolvedValue({ id: "inventory-1" });
  const stockMovementCreateMock = vi.fn().mockResolvedValue(null);

  transactionMock.mockImplementation(async (callback) =>
    callback({
      sale: {
        findUnique: saleFindUniqueTx,
        update: saleUpdateMock,
      },
      refund: {
        create: refundCreateMock,
      },
      inventory: {
        upsert: inventoryUpsertMock,
      },
      stockMovement: {
        create: stockMovementCreateMock,
      },
    }),
  );

  return {
    saleUpdateMock,
    refundCreateMock,
    inventoryUpsertMock,
    stockMovementCreateMock,
  };
};

describe("sales router refund & void mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashSessionFindFirst.mockResolvedValue({
      id: "session-123",
      outletId: "OUTLET-1",
      userId: "cashier-test",
      user: { id: "cashier-test", name: "Kasir Test" },
    });
    saleFindUniqueOutside.mockResolvedValue({ outletId: "OUTLET-1" });
  });

  it("refundSale marks sale as refunded and restocks every item", async () => {
    const { saleUpdateMock, refundCreateMock, inventoryUpsertMock } = setupTransaction();
    const caller = createCaller();

    const result = await caller.refundSale({
      saleId: "sale-1",
      reason: "Barang rusak",
      amount: 50000,
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(saleUpdateMock).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: expect.objectContaining({ status: SaleStatus.REFUNDED }),
    });
    expect(refundCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleId: "sale-1",
          amount: expect.any(Object),
          items: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ saleItemId: "item-1", quantity: 2 }),
            ]),
          }),
        }),
      }),
    );
    expect(inventoryUpsertMock).toHaveBeenCalledTimes(sampleSale.items.length);
    expect(result.status).toBe(SaleStatus.REFUNDED);
    expect(result.restockedQuantity).toBe(3);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SALE_REFUND",
        entity: "REFUND",
      }),
      expect.any(Object),
    );
  });

  it("voidSale returns all stock and sets sale status to VOIDED", async () => {
    const { saleUpdateMock, inventoryUpsertMock } = setupTransaction();
    const caller = createCaller();

    const result = await caller.voidSale({
      saleId: "sale-1",
      reason: "Pembayaran ganda",
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(saleUpdateMock).toHaveBeenCalledWith({
      where: { id: "sale-1" },
      data: expect.objectContaining({ status: SaleStatus.VOIDED }),
    });
    expect(inventoryUpsertMock).toHaveBeenCalledTimes(sampleSale.items.length);
    expect(result.status).toBe(SaleStatus.VOIDED);
    expect(result.restockedQuantity).toBe(3);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SALE_VOID",
        entity: "SALE",
      }),
      expect.any(Object),
    );
  });
});
