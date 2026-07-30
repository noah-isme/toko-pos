import { afterEach, describe, expect, it, vi } from "vitest";

import {
  E2E_FALLBACK_SECRET,
  e2eAuthSecret,
} from "../e2e/helpers/test-secret";

/**
 * The E2E fallback secret has to satisfy the same production rule as `src/env.ts`
 * (see tests/unit/env.auth.test.ts). When it did not, `next start` refused to
 * boot for the whole Playwright suite and the only symptom was a `webServer`
 * timeout with no mention of the secret. These tests keep that regression from
 * coming back silently.
 */
const PRODUCTION_MIN_LENGTH = 32;

describe("e2eAuthSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("has a fallback long enough for src/env.ts to accept in production", () => {
    expect(E2E_FALLBACK_SECRET.length).toBeGreaterThanOrEqual(
      PRODUCTION_MIN_LENGTH,
    );
  });

  it("prefers a strong ambient NEXTAUTH_SECRET so signing matches the server", () => {
    const ambient = "ambient-secret-that-is-long-enough-for-prod";
    vi.stubEnv("NEXTAUTH_SECRET", ambient);

    expect(e2eAuthSecret()).toBe(ambient);
  });

  it("ignores an ambient secret that production would reject", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "too-short");

    expect(e2eAuthSecret()).toBe(E2E_FALLBACK_SECRET);
  });

  it("falls back when NEXTAUTH_SECRET is unset", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");

    expect(e2eAuthSecret()).toBe(E2E_FALLBACK_SECRET);
  });

  it("returns a value src/env.ts accepts under NODE_ENV=production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", e2eAuthSecret());
    vi.resetModules();

    const { env } = await import("@/env");
    expect(env.NEXTAUTH_SECRET).toBe(E2E_FALLBACK_SECRET);

    vi.resetModules();
  });
});
