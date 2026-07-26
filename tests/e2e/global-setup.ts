import { chromium } from "@playwright/test";

/**
 * Warm up heavy routes (dashboard, cashier, management) so the first test
 * doesn't pay the cold-compilation cost. Runs once before the test suite.
 */
async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const routes = [
    "/auth/login",
    "/",
    "/dashboard",
    "/dashboard/owner",
    "/management/products",
    "/management/reports",
    "/cashier",
  ];

  for (const route of routes) {
    try {
      await page.goto(route, { timeout: 15_000 });
      // Just wait for the page to be interactive — don't wait for networkidle
      // since dashboards with polling may never go idle.
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    } catch {
      // Warmup is best-effort; a slow route shouldn't block the suite.
      console.warn(`Warmup: ${route} was slow or failed`);
    }
  }

  await browser.close();
}

export default globalSetup;
