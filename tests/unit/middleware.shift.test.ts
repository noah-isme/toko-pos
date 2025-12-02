import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const cashSessionFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: {
    cashSession: {
      findFirst: cashSessionFindFirst,
    },
  },
}));

import { Role } from "@/server/db/enums";
import { protectedProcedure, requireActiveShift, router } from "@/server/api/trpc";

const shiftInputSchema = z.object({ outletId: z.string() });

const testRouter = router({
  needsShift: protectedProcedure
    .input(shiftInputSchema)
    .use(
      requireActiveShift(({ input }: { input: z.infer<typeof shiftInputSchema> }) => ({
        outletId: input.outletId,
      })),
    )
    .query(({ ctx }) => ctx.activeShift?.id),
});

const createCaller = testRouter.createCaller;

describe("requireActiveShift middleware", () => {
  beforeEach(() => {
    cashSessionFindFirst.mockReset();
  });

  it("throws FORBIDDEN when no active session is found", async () => {
    cashSessionFindFirst.mockResolvedValue(null);
    const caller = createCaller({
      session: {
        user: { id: "cashier-1", role: Role.CASHIER },
        expires: new Date().toISOString(),
      },
    });

    await expect(
      caller.needsShift({ outletId: "OUTLET-1" }),
    ).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      } satisfies Partial<TRPCError>,
    );

    expect(cashSessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ outletId: "OUTLET-1" }),
      }),
    );
  });

  it("attaches the active shift id so downstream procedures (e.g. recordSale) can reuse it", async () => {
    cashSessionFindFirst.mockResolvedValue({
      id: "session-123",
      outletId: "OUTLET-1",
      userId: "cashier-1",
      user: { id: "cashier-1", name: "Kasir Demo" },
      openTime: new Date(),
      closeTime: null,
    });

    const caller = createCaller({
      session: {
        user: { id: "cashier-1", role: Role.CASHIER },
        expires: new Date().toISOString(),
      },
    });

    const activeShiftId = await caller.needsShift({ outletId: "OUTLET-1" });

    expect(activeShiftId).toBe("session-123");
  });
});
