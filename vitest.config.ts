import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB-backed suites talk to a remote Postgres (Supabase pooler); the default
    // 10s hook/test timeout is too tight for setup/teardown over that latency.
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
