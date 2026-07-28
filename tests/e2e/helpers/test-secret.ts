/**
 * Single source of truth for the NEXTAUTH_SECRET used by E2E runs.
 *
 * Two constraints have to hold at once:
 *  - `playwright.config.ts` boots the app with `next start`, i.e. NODE_ENV=production,
 *    and `src/env.ts` rejects a production secret shorter than 32 characters. A short
 *    fallback makes every request 500 and the webServer wait time out.
 *  - The specs mint their own session JWTs (`tests/e2e/helpers/db.ts`,
 *    `tests/e2e/visual/helpers.ts`). Those must sign with the exact same secret the
 *    server verifies with, otherwise every page redirects to /auth/login.
 *
 * Keeping the fallback here means the length rule and the sign/verify pairing cannot
 * drift apart. A real `NEXTAUTH_SECRET` in the environment always wins.
 */
export const E2E_FALLBACK_SECRET =
  "jcode-e2e-test-secret-not-for-production-use";

export function e2eAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET;
  // Ignore a too-short ambient value rather than passing it through: `next start`
  // would refuse to boot with it and the failure surfaces as an opaque webServer
  // timeout instead of a bad-secret message.
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  return E2E_FALLBACK_SECRET;
}
