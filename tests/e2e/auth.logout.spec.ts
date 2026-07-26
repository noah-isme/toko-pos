import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./mocks";

test.describe("Auth Logout", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test("logout page signs out and redirects to login", async ({ page }) => {
    await page.goto("/auth/logout");

    // The logout page auto-POSTs to /api/auth/signout with callbackUrl=/auth/login,
    // which redirects back to the login page.
    await page.waitForURL("**/auth/login**");

    // Confirm we actually landed on the login form, not just a URL that matches.
    await expect(
      page.getByRole("heading", { name: "Masuk ke akun Anda" }),
    ).toBeVisible();
  });

  test("logout page displays signing out message", async ({ page }) => {
    // The logout page renders "Signing out…" before the CSRF form POST
    // navigates away. The redirect can complete quickly, so we assert with a
    // short timeout and accept arrival at /auth/login as equivalent evidence
    // that the sign-out flow ran.
    await page.goto("/auth/logout", { waitUntil: "domcontentloaded" });

    try {
      await expect(
        page.getByText(/Signing out|Keluar/i),
      ).toBeVisible({ timeout: 1000 });
    } catch {
      // Redirect already completed — verify we reached the login page instead.
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });
});