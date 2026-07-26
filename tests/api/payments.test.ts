import type { Session } from "next-auth";
import { Role } from "@prisma/client";

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

let adminUserId: string;
let outletId: string;

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@payments.test.local`;

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `${role.toLowerCase()}@payments.test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("payments router", () => {
  beforeAll(async () => {
    const [admin, outlet] = await Promise.all([
      db.user.create({
        data: { name: "Payments Admin", email: uniqueEmail("admin"), role: Role.ADMIN },
      }),
      db.outlet.create({
        data: { name: "Payments Test Outlet", code: `PO-${Date.now().toString(36)}` },
      }),
    ]);

    adminUserId = admin.id;
    outletId = outlet.id;
  });

  it("creates a mock QRIS charge", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const result = await caller.payments.createQRIS({
      outletId,
      amount: 100000,
      referenceId: `TEST-QRIS-${Date.now()}`,
      description: "Test QRIS charge",
    });

    expect(result.amount).toBe(100000);
    expect(result.status).toBe("PENDING");
    expect(result.qrString).toContain("MOCK|QRIS|");
    expect(result.transactionId).toContain("MOCK-QRIS-");
  });

  it("checks a mock QRIS status", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const charge = await caller.payments.createQRIS({
      outletId,
      amount: 50000,
      referenceId: `TEST-QRIS-STATUS-${Date.now()}`,
    });

    const status = await caller.payments.checkQRIS({
      transactionId: charge.transactionId,
    });

    expect(status.transactionId).toBe(charge.transactionId);
    expect(["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"]).toContain(status.status);
  });

  it("initiates a mock EDC charge", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const result = await caller.payments.initiateEDC({
      outletId,
      amount: 75000,
      referenceId: `TEST-EDC-${Date.now()}`,
      description: "Test EDC charge",
    });

    expect(result.amount).toBe(75000);
    expect(result.status).toBe("PENDING");
    expect(result.transactionId).toContain("MOCK-EDC-");
  });

  it("exposes gateway configuration without secrets", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const config = await caller.payments.getGatewayConfig();

    expect(config).toHaveProperty("qrisProvider");
    expect(config).toHaveProperty("edcProvider");
    expect(config).toHaveProperty("mode");
    expect(config).toHaveProperty("isMock");
    expect(config.qrisProvider).toBe("mock");
  });
});
