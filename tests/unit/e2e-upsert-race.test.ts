import { describe, expect, it, vi } from "vitest";

import {
  isUniqueConstraintError,
  upsertTolerantOfRace,
} from "../e2e/helpers/upsert-race";

/**
 * Guards the parallel-worker seeding race in `ensureE2EUser`. Prisma's upsert
 * reads before it writes, so two Playwright workers seeding the same fixed-id
 * row both miss the read and both insert; the loser used to get P2002 and take
 * its whole spec file down in `beforeAll`.
 */
function prismaUniqueViolation() {
  return Object.assign(
    new Error("Unique constraint failed on the fields: (`id`)"),
    { code: "P2002" },
  );
}

describe("upsertTolerantOfRace", () => {
  it("passes the result through when there is no contention", async () => {
    const operation = vi.fn().mockResolvedValue("seeded");

    await expect(upsertTolerantOfRace(operation)).resolves.toBe("seeded");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries once after P2002 and returns the second result", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(prismaUniqueViolation())
      .mockResolvedValueOnce("seeded by the other worker");

    await expect(upsertTolerantOfRace(operation)).resolves.toBe(
      "seeded by the other worker",
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not swallow a persistent P2002", async () => {
    const operation = vi.fn().mockRejectedValue(prismaUniqueViolation());

    await expect(upsertTolerantOfRace(operation)).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("rethrows unrelated errors immediately instead of retrying", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("Can't reach database server"), {
          code: "P1001",
        }),
      );

    await expect(upsertTolerantOfRace(operation)).rejects.toThrow(
      "Can't reach database server",
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("classifies only P2002 as a unique-constraint error", () => {
    expect(isUniqueConstraintError(prismaUniqueViolation())).toBe(true);
    expect(isUniqueConstraintError({ code: "P1001" })).toBe(false);
    expect(isUniqueConstraintError(new Error("plain"))).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError("P2002")).toBe(false);
  });
});
