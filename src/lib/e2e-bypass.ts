/**
 * Single source of truth for the E2E session bypass.
 *
 * The bypass exists because Playwright runs never mint a real NextAuth JWT: the
 * server fabricates a fixed session instead. It is therefore a genuine
 * authentication hole and must be impossible to enable on a real deployment.
 *
 * Three independent conditions must all hold, so no single leaked variable is
 * enough to open it:
 *
 *  1. `NEXT_PUBLIC_E2E === "true"`  — the app was built/served in E2E mode.
 *  2. `E2E_AUTH_BYPASS === "true"`  — an explicit, server-only opt-in that is
 *     set exclusively by playwright.config.ts and never by .env or a deploy.
 *  3. The app is being served on loopback, per `NEXTAUTH_URL`. A real
 *     deployment answers on a public hostname, so even if both flags were set
 *     by accident the bypass still refuses to engage.
 *
 * Deliberately *not* gated on `NODE_ENV !== "production"`. `next start` forces
 * NODE_ENV=production, so that check silently disabled the bypass in exactly
 * the mode the E2E suite runs under, which made every authenticated route
 * redirect to /auth/login. Condition 3 replaces the safety that check was
 * meant to provide.
 *
 * Kept free of imports so it is usable from middleware (edge runtime) as well
 * as from Node server code.
 */

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const isLoopbackUrl = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
};

export const isE2EAuthBypassEnabled = (
  env: {
    NEXT_PUBLIC_E2E?: string;
    E2E_AUTH_BYPASS?: string;
    NEXTAUTH_URL?: string;
  } = process.env,
): boolean =>
  env.NEXT_PUBLIC_E2E === "true" &&
  env.E2E_AUTH_BYPASS === "true" &&
  isLoopbackUrl(env.NEXTAUTH_URL);

/** Fixed user id the E2E fixtures seed. Keep in sync with tests/e2e/helpers. */
export const E2E_USER_ID = "e2e-user";

/**
 * The session both `getServerAuthSession()` and `GET /api/auth/session` return
 * while the bypass is active. Defined once so the server-rendered page and the
 * client-side `useSession()` refetch cannot disagree about who is logged in.
 */
export const e2eBypassSession = () => ({
  user: {
    id: E2E_USER_ID,
    role: "ADMIN" as const,
    name: "Kasir Uji",
    email: "kasir@example.com",
    image: null,
  },
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});
