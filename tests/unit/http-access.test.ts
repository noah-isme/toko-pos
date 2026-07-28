import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerAuthSessionMock = vi.hoisted(() => vi.fn());
const getUserAccessMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth", () => ({
  getServerAuthSession: getServerAuthSessionMock,
}));

vi.mock("@/server/api/utils/access", () => ({
  getUserAccess: getUserAccessMock,
}));

import { Role } from "@/server/db/enums";
import { requireAdminOrOwnerSession } from "@/server/api/utils/http-access";

describe("REST admin authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session", async () => {
    getServerAuthSessionMock.mockResolvedValue(null);

    await expect(requireAdminOrOwnerSession()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("returns 403 for a cashier using the database role", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      user: { id: "cashier-1", role: Role.ADMIN },
    });
    getUserAccessMock.mockResolvedValue({ role: Role.CASHIER, outletIds: [] });

    await expect(requireAdminOrOwnerSession()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it.each([Role.ADMIN, Role.OWNER])("allows %s", async (role) => {
    const session = { user: { id: "manager-1", role } };
    getServerAuthSessionMock.mockResolvedValue(session);
    getUserAccessMock.mockResolvedValue({ role, outletIds: [] });

    await expect(requireAdminOrOwnerSession()).resolves.toEqual({
      ok: true,
      session,
    });
  });
});
