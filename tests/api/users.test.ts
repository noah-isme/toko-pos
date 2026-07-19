import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import bcrypt from "bcryptjs";
import { OutletRole, Role } from "@prisma/client";

import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

let adminUserId: string;
let cashierUserId: string;
let ownerAId: string;
let ownerBId: string;
let createdUserId: string;
let outletId: string;

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@users.test.local`;

const buildSession = (userId: string, role: Role): Session => ({
  user: {
    id: userId,
    name: `User ${role}`,
    email: `${role.toLowerCase()}@users.test.local`,
    role,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const createCaller = async (session: Session) => {
  const ctx = await createTRPCContext({ session });
  return appRouter.createCaller(ctx);
};

describe("users router", () => {
  beforeAll(async () => {
    const [admin, cashier, ownerA, ownerB, outlet] = await Promise.all([
      db.user.create({
        data: { name: "Users Admin", email: uniqueEmail("admin"), role: Role.ADMIN },
      }),
      db.user.create({
        data: { name: "Users Cashier", email: uniqueEmail("cashier"), role: Role.CASHIER },
      }),
      db.user.create({
        data: { name: "Users Owner A", email: uniqueEmail("owner-a"), role: Role.OWNER },
      }),
      db.user.create({
        data: { name: "Users Owner B", email: uniqueEmail("owner-b"), role: Role.OWNER },
      }),
      db.outlet.create({
        data: { name: "Users Test Outlet", code: `UO-${Date.now().toString(36)}` },
      }),
    ]);

    adminUserId = admin.id;
    cashierUserId = cashier.id;
    ownerAId = ownerA.id;
    ownerBId = ownerB.id;
    outletId = outlet.id;
  });

  afterAll(async () => {
    await db.userOutlet.deleteMany({
      where: { outletId },
    });
    await db.outlet.deleteMany({ where: { id: outletId } });
    const userIds = [adminUserId, cashierUserId, ownerAId, ownerBId, createdUserId].filter(
      Boolean,
    );
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("allows admin to list users", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const users = await caller.users.list();

    expect(Array.isArray(users)).toBe(true);
    expect(users.find((u) => u.id === adminUserId)).toBeTruthy();
  });

  it("rejects cashier access to users.list", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));
    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a user with a hashed password", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const email = uniqueEmail("created");
    const created = await caller.users.create({
      name: "Created User",
      email,
      password: "supersecret",
      role: Role.CASHIER,
    });
    createdUserId = created.id;

    expect(created.email).toBe(email);
    expect(created.role).toBe(Role.CASHIER);

    const row = await db.user.findUnique({
      where: { id: created.id },
      select: { passwordHash: true },
    });
    expect(row?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare("supersecret", row!.passwordHash!)).toBe(true);
  });

  it("rejects creating a user with a duplicate email", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    await expect(
      caller.users.create({
        name: "Dup",
        email: "admin@example.com",
        password: "password123",
        role: Role.CASHIER,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates a user name and role", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const updated = await caller.users.update({
      id: createdUserId,
      name: "Renamed User",
      role: Role.ADMIN,
    });
    expect(updated.name).toBe("Renamed User");
    expect(updated.role).toBe(Role.ADMIN);
  });

  it("resets the password when provided", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    await caller.users.update({ id: createdUserId, password: "newpassword" });

    const row = await db.user.findUnique({
      where: { id: createdUserId },
      select: { passwordHash: true },
    });
    expect(await bcrypt.compare("newpassword", row!.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("supersecret", row!.passwordHash!)).toBe(false);
  });

  it("allows demoting an owner when there are multiple owners", async () => {
    // ownerA and ownerB are both OWNER (plus any seeded owners), so demoting
    // ownerA must succeed. The "last owner" rejection branch is intentionally
    // not asserted here — it depends on the global owner count being exactly
    // one, which we cannot guarantee without isolation.
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    const updated = await caller.users.update({
      id: ownerAId,
      role: Role.ADMIN,
    });
    expect(updated.role).toBe(Role.ADMIN);
  });

  it("blocks self-delete", async () => {
    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    await expect(caller.users.delete({ id: adminUserId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("blocks delete for a user with dependent records", async () => {
    // Create a sale tied to createdUserId so the dependent-record guard fires.
    const outlet = await db.outlet.findUniqueOrThrow({ where: { id: outletId } });
    await db.sale.create({
      data: {
        receiptNumber: `R-USER-${Date.now()}`,
        outletId: outlet.id,
        cashierId: createdUserId,
        totalGross: 0,
        totalNet: 0,
      },
    });

    const caller = await createCaller(buildSession(adminUserId, Role.ADMIN));
    await expect(caller.users.delete({ id: createdUserId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    // Cleanup the sale so afterAll can delete the user.
    await db.sale.deleteMany({ where: { cashierId: createdUserId } });
  });

  it("assigns, lists, and removes an outlet assignment", async () => {
    const adminCaller = await createCaller(buildSession(adminUserId, Role.ADMIN));

    await adminCaller.users.setOutletAssignment({
      userId: createdUserId,
      outletId,
      role: OutletRole.CASHIER,
      isActive: true,
    });

    const assignments = await adminCaller.users.getOutletAssignments({
      id: createdUserId,
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.outletId).toBe(outletId);
    expect(assignments[0]?.role).toBe(OutletRole.CASHIER);
    expect(assignments[0]?.isActive).toBe(true);

    await adminCaller.users.removeOutletAssignment({
      userId: createdUserId,
      outletId,
    });

    const after = await adminCaller.users.getOutletAssignments({
      id: createdUserId,
    });
    expect(after).toHaveLength(0);
  });

  it("rejects cashier access to setOutletAssignment", async () => {
    const caller = await createCaller(buildSession(cashierUserId, Role.CASHIER));
    await expect(
      caller.users.setOutletAssignment({
        userId: createdUserId,
        outletId,
        role: OutletRole.CASHIER,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
