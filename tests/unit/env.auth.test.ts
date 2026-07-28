import { afterEach, describe, expect, it, vi } from "vitest";

describe("authentication environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails closed when production has no NEXTAUTH_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.resetModules();

    await expect(import("@/env")).rejects.toThrow(
      "NEXTAUTH_SECRET must contain at least 32 characters in production",
    );
  });

  it("fails closed when the production NEXTAUTH_SECRET is weak", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "too-short");
    vi.resetModules();

    await expect(import("@/env")).rejects.toThrow(
      "NEXTAUTH_SECRET must contain at least 32 characters in production",
    );
  });

  it("accepts a strong production NEXTAUTH_SECRET", async () => {
    const secret = "production-secret-with-at-least-32-characters";
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", secret);
    vi.resetModules();

    const { env } = await import("@/env");
    expect(env.NEXTAUTH_SECRET).toBe(secret);
  });
});
