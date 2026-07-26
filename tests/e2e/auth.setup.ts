import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "tests/e2e/.auth/e2e-session.json";

/**
 * Generate a storage state for the E2E auto-session (NEXT_PUBLIC_E2E=true).
 * The server returns a fixed session for id "e2e-user" — no login form needed.
 * We just visit a page so the session cookie is set, then save the state.
 */
setup("generate e2e session storage", async ({ page }) => {
  // With NEXT_PUBLIC_E2E=true, the server auto-returns a session.
  // We just need to visit any page so the session cookie is set.
  await page.goto("/");
  await page.waitForURL("**/");

  // Save the storage state for reuse across tests.
  await page.context().storageState({ path: AUTH_FILE });
});
