import { describe, expect, it } from "vitest";

import { e2eBypassSession, isE2EAuthBypassEnabled } from "@/lib/e2e-bypass";

/**
 * The bypass fabricates an ADMIN session with no credentials, so these tests
 * exist to keep it impossible to enable by accident. Each case removes exactly
 * one condition and asserts the bypass stays shut.
 */
describe("isE2EAuthBypassEnabled", () => {
  const enabled = {
    NEXT_PUBLIC_E2E: "true",
    E2E_AUTH_BYPASS: "true",
    NEXTAUTH_URL: "http://127.0.0.1:3100",
  };

  it("enables the bypass when all three conditions hold", () => {
    expect(isE2EAuthBypassEnabled(enabled)).toBe(true);
  });

  it("accepts localhost as loopback too", () => {
    expect(
      isE2EAuthBypassEnabled({ ...enabled, NEXTAUTH_URL: "http://localhost:3100" }),
    ).toBe(true);
  });

  it("stays disabled without the explicit E2E_AUTH_BYPASS opt-in", () => {
    expect(
      isE2EAuthBypassEnabled({ ...enabled, E2E_AUTH_BYPASS: undefined }),
    ).toBe(false);
  });

  it("stays disabled when NEXT_PUBLIC_E2E is not set", () => {
    expect(
      isE2EAuthBypassEnabled({ ...enabled, NEXT_PUBLIC_E2E: undefined }),
    ).toBe(false);
  });

  it("refuses to engage on a public hostname even with both flags set", () => {
    expect(
      isE2EAuthBypassEnabled({
        ...enabled,
        NEXTAUTH_URL: "https://toko-pos.example.com",
      }),
    ).toBe(false);
  });

  it("refuses to engage when NEXTAUTH_URL is missing", () => {
    expect(
      isE2EAuthBypassEnabled({ ...enabled, NEXTAUTH_URL: undefined }),
    ).toBe(false);
  });

  it("refuses to engage when NEXTAUTH_URL is not a valid URL", () => {
    expect(
      isE2EAuthBypassEnabled({ ...enabled, NEXTAUTH_URL: "not-a-url" }),
    ).toBe(false);
  });

  it("is not fooled by a hostname that merely contains 'localhost'", () => {
    expect(
      isE2EAuthBypassEnabled({
        ...enabled,
        NEXTAUTH_URL: "https://localhost.attacker.example.com",
      }),
    ).toBe(false);
  });

  it("treats any value other than the exact string 'true' as off", () => {
    expect(isE2EAuthBypassEnabled({ ...enabled, E2E_AUTH_BYPASS: "1" })).toBe(false);
    expect(isE2EAuthBypassEnabled({ ...enabled, E2E_AUTH_BYPASS: "TRUE" })).toBe(false);
    expect(isE2EAuthBypassEnabled({ ...enabled, NEXT_PUBLIC_E2E: "yes" })).toBe(false);
  });

  it("is disabled for a completely empty environment", () => {
    expect(isE2EAuthBypassEnabled({})).toBe(false);
  });
});

describe("e2eBypassSession", () => {
  it("returns the fixed E2E admin user", () => {
    const session = e2eBypassSession();

    expect(session.user.id).toBe("e2e-user");
    expect(session.user.role).toBe("ADMIN");
    expect(session.user.email).toBe("kasir@example.com");
  });

  it("expires in the future so next-auth does not treat it as stale", () => {
    const session = e2eBypassSession();

    expect(new Date(session.expires).getTime()).toBeGreaterThan(Date.now());
  });
});
