import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["_tests/**/*.test.ts"],
    setupFiles: ["_src/env.ts"],
    env: {
      CALC_ENVIRONMENT: "test-local",
      SUPABASE_URL: "https://placeholder.supabase.co",
      SUPABASE_ANON_KEY: "placeholder-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "scripts/**", "_tests/**"],
    },
  },
});
