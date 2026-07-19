import {
  userCreateInputSchema,
  userDeleteInputSchema,
  userOutletAssignmentInputSchema,
  userOutletAssignmentRemoveInputSchema,
  userOutletRoleSchema,
  userRoleSchema,
  userListOutputSchema,
  userOutletsOutputSchema,
  userUpdateInputSchema,
} from "@/server/api/schemas/users";
import { Role, OutletRole } from "@prisma/client";

describe("user schema validation", () => {
  describe("userRoleSchema", () => {
    it("accepts valid role values", () => {
      expect(userRoleSchema.parse(Role.OWNER)).toBe(Role.OWNER);
      expect(userRoleSchema.parse(Role.ADMIN)).toBe(Role.ADMIN);
      expect(userRoleSchema.parse(Role.CASHIER)).toBe(Role.CASHIER);
    });

    it("rejects invalid role", () => {
      const result = userRoleSchema.safeParse("SUPERUSER");
      expect(result.success).toBe(false);
    });
  });

  describe("userCreateInputSchema", () => {
    const validInput = {
      name: "Kasir Satu",
      email: "kasir@example.com",
      password: "password123",
      role: Role.CASHIER,
    };

    it("accepts a valid payload", () => {
      const parsed = userCreateInputSchema.parse(validInput);
      expect(parsed.name).toBe("Kasir Satu");
      expect(parsed.email).toBe("kasir@example.com");
      expect(parsed.role).toBe(Role.CASHIER);
    });

    it("trims whitespace in name and email", () => {
      const parsed = userCreateInputSchema.parse({
        ...validInput,
        name: "  Kasir Satu  ",
        email: "  kasir@example.com  ",
      });
      expect(parsed.name).toBe("Kasir Satu");
      expect(parsed.email).toBe("kasir@example.com");
    });

    it("rejects empty name", () => {
      const result = userCreateInputSchema.safeParse({
        ...validInput,
        name: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("rejects malformed email", () => {
      const result = userCreateInputSchema.safeParse({
        ...validInput,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = userCreateInputSchema.safeParse({
        ...validInput,
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown extra fields via strict", () => {
      const result = userCreateInputSchema.safeParse({
        ...validInput,
        extra: "field",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("userUpdateInputSchema", () => {
    it("accepts a partial update with one field", () => {
      const parsed = userUpdateInputSchema.parse({ id: "u-1", name: "Updated" });
      expect(parsed.name).toBe("Updated");
      expect(parsed.email).toBeUndefined();
      expect(parsed.role).toBeUndefined();
      expect(parsed.password).toBeUndefined();
    });

    it("rejects an empty update with only id", () => {
      const result = userUpdateInputSchema.safeParse({ id: "u-1" });
      expect(result.success).toBe(false);
    });

    it("accepts optional password reset meeting minimum length", () => {
      const parsed = userUpdateInputSchema.parse({
        id: "u-1",
        password: "newpassword",
      });
      expect(parsed.password).toBe("newpassword");
    });

    it("rejects a too-short password reset", () => {
      const result = userUpdateInputSchema.safeParse({
        id: "u-1",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty id", () => {
      const result = userUpdateInputSchema.safeParse({ id: "", name: "X" });
      expect(result.success).toBe(false);
    });
  });

  describe("userDeleteInputSchema", () => {
    it("accepts a valid id", () => {
      expect(userDeleteInputSchema.parse({ id: "u-1" }).id).toBe("u-1");
    });

    it("rejects empty id", () => {
      expect(userDeleteInputSchema.safeParse({ id: "" }).success).toBe(false);
    });
  });

  describe("userOutletAssignmentInputSchema", () => {
    it("defaults isActive to true", () => {
      const parsed = userOutletAssignmentInputSchema.parse({
        userId: "u-1",
        outletId: "o-1",
        role: OutletRole.CASHIER,
      });
      expect(parsed.isActive).toBe(true);
    });

    it("accepts an explicit isActive false", () => {
      const parsed = userOutletAssignmentInputSchema.parse({
        userId: "u-1",
        outletId: "o-1",
        role: OutletRole.MANAGER,
        isActive: false,
      });
      expect(parsed.isActive).toBe(false);
    });

    it("rejects missing outletId", () => {
      expect(
        userOutletAssignmentInputSchema.safeParse({
          userId: "u-1",
          role: OutletRole.CASHIER,
        }).success,
      ).toBe(false);
    });

    it("rejects invalid OutletRole", () => {
      expect(
        userOutletAssignmentInputSchema.safeParse({
          userId: "u-1",
          outletId: "o-1",
          role: "SUPER",
        }).success,
      ).toBe(false);
    });
  });

  describe("userOutletRoleSchema", () => {
    it("accepts valid OutletRole values", () => {
      expect(userOutletRoleSchema.parse(OutletRole.OWNER)).toBe(OutletRole.OWNER);
      expect(userOutletRoleSchema.parse(OutletRole.MANAGER)).toBe(OutletRole.MANAGER);
      expect(userOutletRoleSchema.parse(OutletRole.CASHIER)).toBe(OutletRole.CASHIER);
    });
  });

  describe("userOutletAssignmentRemoveInputSchema", () => {
    it("accepts valid input", () => {
      expect(
        userOutletAssignmentRemoveInputSchema.parse({
          userId: "u-1",
          outletId: "o-1",
        }).userId,
      ).toBe("u-1");
    });

    it("rejects missing userId", () => {
      expect(
        userOutletAssignmentRemoveInputSchema.safeParse({ outletId: "o-1" }).success,
      ).toBe(false);
    });
  });

  describe("userListOutputSchema", () => {
    it("parses a list of users", () => {
      const parsed = userListOutputSchema.parse([
        {
          id: "u-1",
          name: "A",
          email: "a@example.com",
          role: Role.ADMIN,
          isActive: true,
          outletCount: 2,
          createdAt: new Date().toISOString(),
        },
        {
          id: "u-2",
          name: null,
          email: null,
          role: Role.CASHIER,
          isActive: false,
          outletCount: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      expect(parsed).toHaveLength(2);
      expect(parsed[1]?.name).toBeNull();
    });
  });

  describe("userOutletsOutputSchema", () => {
    it("parses a list of outlet assignments", () => {
      const parsed = userOutletsOutputSchema.parse([
        {
          id: "uo-1",
          outletId: "o-1",
          outletName: "Outlet Utama",
          outletCode: "MAIN",
          role: OutletRole.MANAGER,
          isActive: true,
        },
      ]);
      expect(parsed[0]?.outletCode).toBe("MAIN");
    });
  });
});
