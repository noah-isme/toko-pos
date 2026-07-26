import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

test.describe("Users Management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    const userOutlet = {
      id: "uo-1",
      outletId: "outlet-1",
      role: "MANAGER",
      outlet: {
        id: "outlet-1",
        name: "Outlet Pusat",
        code: "MAIN",
        address: "Jl. Melati No.9",
      },
    };

    const users = [
      {
        id: "user-1",
        name: "Owner Demo",
        email: "owner@example.com",
        role: "OWNER",
        isActive: true,
        outletCount: 2,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "user-2",
        name: "Admin Demo",
        email: "admin@example.com",
        role: "ADMIN",
        isActive: true,
        outletCount: 2,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "e2e-user",
        name: "E2E Tester",
        email: "e2e-user@toko-pos.test",
        role: "ADMIN",
        isActive: true,
        outletCount: 2,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ];

    await setupTrpcMock(page, {
      "outlets.getUserOutlets": () => [userOutlet],
      "outlets.list": () => [userOutlet.outlet],
      "users.list": () => users,
      "users.getOutletAssignments": () => [
        { outletId: "outlet-1", outletName: "Outlet Pusat", role: "MANAGER", isActive: true },
      ],
    });
  });

  test("renders users list heading and table", async ({ page }) => {
    await page.goto("/management/users");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Daftar Pengguna" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("displays add user button", async ({ page }) => {
    await page.goto("/management/users");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: "Tambah User" }),
    ).toBeVisible();
  });

  test("opens create user dialog", async ({ page }) => {
    await page.goto("/management/users");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Tambah User" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tambah User Baru" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nama Lengkap")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Role")).toBeVisible();
  });

  test("displays existing users in table", async ({ page }) => {
    await page.goto("/management/users");
    await page.waitForLoadState("networkidle");

    // The table is guaranteed at least one row (header + the seeded users).
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").first()).toBeVisible();
    // E2E Tester (ADMIN) is in the mock data and must appear.
    await expect(page.getByText("E2E Tester").first()).toBeVisible();
  });
});