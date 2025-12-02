import { vi } from "vitest";

import { writeAuditLog } from "@/server/services/audit";

describe("writeAuditLog", () => {
  it("persists activity rows with provided metadata", async () => {
    const createMock = vi.fn().mockResolvedValue(null);

    await writeAuditLog(
      {
        action: "SHIFT_OPEN",
        userId: "user-1",
        outletId: "outlet-1",
        entity: "CASH_SESSION",
        entityId: "session-1",
        details: { openingCash: 200000 },
      },
      {
        activityLog: {
          create: createMock,
        },
      },
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        action: "SHIFT_OPEN",
        userId: "user-1",
        outletId: "outlet-1",
        entity: "CASH_SESSION",
        entityId: "session-1",
        details: { openingCash: 200000 },
      },
    });
  });

  it("supports every audit action used across routers", async () => {
    const actions = [
      "SHIFT_OPEN",
      "SHIFT_CLOSE",
      "SALE_RECORD",
      "SALE_VOID",
      "SALE_REFUND",
      "LOW_STOCK_TRIGGER",
    ] as const;
    const createMock = vi.fn().mockResolvedValue(null);

    for (const action of actions) {
      await writeAuditLog(
        {
          action,
          userId: `actor-${action}`,
          outletId: "outlet-any",
          entity: action === "LOW_STOCK_TRIGGER" ? "LOW_STOCK_ALERT" : "SALE",
          entityId: `${action.toLowerCase()}-entity`,
          details: { action },
        },
        {
          activityLog: {
            create: createMock,
          },
        },
      );
    }

    expect(createMock).toHaveBeenCalledTimes(actions.length);
    actions.forEach((action, index) => {
      expect(createMock).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        data: expect.objectContaining({
          action,
          entityId: expect.stringContaining(action.toLowerCase()),
        }),
      }));
    });
  });
});
