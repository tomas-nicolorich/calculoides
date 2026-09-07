import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The repo-root `tsconfig.json` covers `shared/`. Next.js requires
    // specific compiler options (`jsx: "preserve"`, the `next` plugin,
    // `.next/types` in `include`) that would conflict with that base, so
    // the Next app type-checks against its own `tsconfig.next.json` instead
    // of mutating the shared one.
    tsconfigPath: "tsconfig.next.json",
  },
  experimental: {
    // The `(app)` segment reads cookies (auth) and is always dynamically
    // rendered, so it gets Next's default dynamic Router Cache staleTime of
    // 0 — every client-side navigation re-hits the server and re-shows the
    // Suspense skeleton even though TanStack Query's own 30s client cache
    // (lib/query-client.ts) still has fresh data. Match that here so quick
    // revisits reuse the cached RSC payload instead of re-fetching.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
