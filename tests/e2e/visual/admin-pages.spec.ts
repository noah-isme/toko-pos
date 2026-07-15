import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { setupTrpcMock } from "../mocks";

const ADMIN_EMAIL = "admin@example.com";

test.skip(
  process.env.PLAYWRIGHT_VISUAL_AUTH !== "true",
  "Jalankan melalui pnpm run test:e2e:visual agar bypass sesi dimatikan.",
);
test.setTimeout(120_000);

const screenshotOptions = {
  fullPage: false,
  animations: "allow" as const,
  maxDiffPixelRatio: 0.01,
};

async function settle(page: Page) {
  await page.waitForTimeout(500);
  await page.addStyleTag({
    content: `*, *::before, *::after { caret-color: transparent !important; }
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; width: 0 !important; }
    nextjs-portal { display: none !important; }`,
  });
}

async function authenticateAsAdmin(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET ?? "test-secret",
    token: {
      sub: "visual-admin",
      name: "Admin Visual",
      email: ADMIN_EMAIL,
      role: "ADMIN",
    },
  });

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1_000) + 60 * 60,
    },
  ]);

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const session = (await sessionResponse.json()) as {
    user?: { email?: string; role?: string };
  };
  expect(session.user).toMatchObject({ email: ADMIN_EMAIL, role: "ADMIN" });
}

async function mockStableAdminData(page: Page) {
  const outlet = {
    id: "visual-outlet-main",
    name: "Outlet Utama",
    code: "MAIN",
    address: "Jl. Merdeka No. 123, Jakarta Pusat",
  };

  await setupTrpcMock(page, {
    "outlets.getUserOutlets": () => [
      {
        id: "visual-admin-outlet",
        outletId: outlet.id,
        role: "MANAGER",
        outlet,
      },
    ],
    "cashSessions.getActive": () => null,
    "sales.getDailySummary": () => ({
      date: "2026-07-15T00:00:00.000Z",
      totals: {
        totalGross: 0,
        totalDiscount: 0,
        totalNet: 0,
        totalItems: 0,
        totalCash: 0,
        totalTax: 0,
      },
      sales: [],
    }),
    "inventory.listLowStock": () => [
      {
        id: "visual-low-stock",
        productId: "visual-product",
        outletId: outlet.id,
        productName: "Kopi Arabica Aceh Gayo 250g",
        productSku: "SKU-COFFEE-ARABICA-250",
        outletName: outlet.name,
        quantity: 2,
        minStock: 5,
        triggeredAt: "2026-07-15T01:00:00.000Z",
        clearedAt: null,
        note: null,
      },
    ],
  });
}

test.beforeEach(async ({ page }) => {
  await mockStableAdminData(page);
  await authenticateAsAdmin(page);
});

test("dashboard admin", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Admin Visual", { exact: false })).toBeVisible();
  await expect(page.getByText("Outlet Utama", { exact: true }).first()).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("admin-dashboard.png", screenshotOptions);
});
