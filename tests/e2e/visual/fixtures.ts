import { test as base, expect } from "@playwright/test";

/**
 * Visual tests assert a heading is visible and then screenshot. A page that
 * renders its heading and *then* throws during hydration or data binding still
 * produces a green run — the screenshot just captures Next.js's "Application
 * error" boundary, and `--update-snapshots` will happily bless it as the
 * baseline. That is exactly how six crash screens became committed baselines.
 *
 * This fixture fails any test whose page threw an uncaught exception, so a
 * broken page can never be recorded as an expected screenshot.
 */
export const test = base.extend<{
  reduceMotion: void;
  failOnPageError: void;
}>({
  reduceMotion: [
    async ({ page }, use) => {
      // Applied here rather than in config `use` (not a valid test option in
      // Playwright 1.61) so unauthenticated specs get it too — previously only
      // authenticateAsAdmin set it, leaving the public pages animating.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await use();
    },
    { auto: true },
  ],
  failOnPageError: [
    async ({ page }, use) => {
      const pageErrors: Error[] = [];
      page.on("pageerror", (error) => pageErrors.push(error));

      await use();

      if (pageErrors.length > 0) {
        const details = pageErrors
          .map((error, index) => `  ${index + 1}. ${error.message}`)
          .join("\n");
        throw new Error(
          `Page threw ${pageErrors.length} uncaught exception(s):\n${details}`,
        );
      }
    },
    { auto: true },
  ],
});

export { expect };
