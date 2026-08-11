/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

// Root-level Vitest config for the Next.js shell (`app/**`, `lib/**`,
// `proxy.ts`). Server Components and the routing proxy are plain
// async/sync functions that return React elements or `NextResponse`s, so a
// plain "node" environment is enough — no DOM is exercised.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
    test: {
      environment: "node",
      include: [
        "proxy.test.ts",
        "app/**/*.test.ts",
        "app/**/*.test.tsx",
        "lib/**/*.test.ts",
        // Phase 7.2: `shared/logic/{projection,rounding}.test.ts` rehomed
        // from `api/_tests/logic/**` — `shared/` has no vitest devDependency
        // of its own, so root Vitest covers it (mirrors how `lib/**` above
        // already covers the rehomed `api/_src/services/**` tests).
        "shared/**/*.test.ts",
      ],
      env: {
        // Vitest (unlike `next dev`/`next build`) does not auto-load
        // `.env.local` — mirrors `frontend/vite.config.ts`'s fallback
        // pattern. `@supabase/ssr` itself is mocked in these tests, so
        // these values only need to satisfy `getSupabaseServerEnv`'s
        // presence check, never reach a real network call.
        SUPABASE_URL: env.SUPABASE_URL || "https://placeholder.supabase.co",
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "placeholder-anon-key",
      },
    },
  };
});
