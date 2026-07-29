import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const OUTLETS = [
  { id: "outlet-1", name: "Outlet Pusat", code: "MAIN", address: "Jl. Melati No.9" },
  { id: "outlet-2", name: "Outlet Cabang", code: "BR01", address: "Jl. Kenanga No.2" },
];

const CUSTOMERS = [
  {
    id: "cust-1",
    name: "Siti Rahayu",
    email: "siti@example.com",
    phone: "081234567890",
    membershipCard: "CARD-0001",
    tier: "GOLD",
    points: 320,
    totalSpent: 1_500_000,
    visitCount: 12,
    lastVisitAt: "2026-01-10T04:00:00.000Z",
    birthDate: null,
    notes: null,
    isActive: true,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2026-01-10T04:00:00.000Z",
  },
  {
    id: "cust-2",
    name: "Budi Santoso",
    email: null,
    phone: "081999888777",
    membershipCard: null,
    tier: "REGULAR",
    points: 0,
    totalSpent: 0,
    visitCount: 0,
    lastVisitAt: null,
    birthDate: null,
    notes: null,
    isActive: true,
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
];

test.describe("Customers & loyalty management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    await setupTrpcMock(page, {
      "outlets.list": () => OUTLETS,
      "customers.list": ({ input }) => {
        const search =
          typeof input === "object" && input !== null
            ? (input as { search?: string }).search
            : undefined;
        const tier =
          typeof input === "object" && input !== null
            ? (input as { tier?: string }).tier
            : undefined;

        let customers = CUSTOMERS;
        if (search) {
          const needle = search.toLowerCase();
          customers = customers.filter((c) =>
            [c.name, c.email, c.phone, c.membershipCard]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(needle)),
          );
        }
        if (tier) {
          customers = customers.filter((c) => c.tier === tier);
        }

        return { customers, nextCursor: undefined };
      },
      "customers.create": ({ input }) => ({
        ...CUSTOMERS[1],
        id: "cust-new",
        name: (input as { name: string }).name,
      }),
      "customers.adjustPoints": () => ({
        customer: { ...CUSTOMERS[0], points: 370 },
        pointHistory: {
          id: "ph-1",
          points: 50,
          type: "EARNED",
          reference: null,
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  test("lists customers with tier, points and spend", async ({ page }) => {
    await page.goto("/management/customers");

    await expect(page.getByTestId("customers-title")).toBeVisible();
    await expect(page.getByTestId("customer-row")).toHaveCount(2);
    await expect(page.getByText("Siti Rahayu")).toBeVisible();
    await expect(page.getByText("CARD-0001")).toBeVisible();
    await expect(page.getByText("Gold")).toBeVisible();
    await expect(page.getByTestId("customers-count")).toHaveText("2");
  });

  test("filters the list by search term", async ({ page }) => {
    await page.goto("/management/customers");
    await expect(page.getByTestId("customer-row")).toHaveCount(2);

    await page.getByTestId("customer-search-input").fill("Budi");

    await expect(page.getByTestId("customer-row")).toHaveCount(1);
    await expect(page.getByText("Budi Santoso")).toBeVisible();
  });

  test("creates a customer through the dialog", async ({ page }) => {
    await page.goto("/management/customers");

    await page.getByTestId("customer-add-button").click();
    await page.getByTestId("customer-name-input").fill("Pelanggan Baru E2E");
    await page.getByTestId("customer-phone-input").fill("081200001111");

    const createRequest = page.waitForRequest((request) =>
      request.url().includes("customers.create"),
    );
    await page.getByTestId("customer-submit").click();
    await createRequest;

    await expect(page.getByText("Pelanggan berhasil ditambahkan")).toBeVisible();
  });

  test("adjusts loyalty points", async ({ page }) => {
    await page.goto("/management/customers");

    await page
      .getByTestId("customer-row")
      .first()
      .getByRole("button", { name: "Poin" })
      .click();

    await page.getByTestId("point-amount-input").fill("50");

    const adjustRequest = page.waitForRequest((request) =>
      request.url().includes("customers.adjustPoints"),
    );
    await page.getByTestId("point-submit").click();
    await adjustRequest;

    await expect(page.getByText(/saldo baru 370/)).toBeVisible();
  });

  test("shows an empty state when no customer matches", async ({ page }) => {
    await page.goto("/management/customers");
    await expect(page.getByTestId("customer-row")).toHaveCount(2);

    await page.getByTestId("customer-search-input").fill("tidak-ada-nama-ini");

    await expect(page.getByTestId("customers-empty")).toBeVisible();
  });
});
