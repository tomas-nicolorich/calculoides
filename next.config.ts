import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The repo-root `tsconfig.json` is the shared base `frontend`/`api` extend
    // via their own tsconfig files (see `frontend/tsconfig.json`). Next.js
    // requires specific compiler options (`jsx: "preserve"`, the `next`
    // plugin, `.next/types` in `include`) that would conflict with that
    // shared base, so the Next app type-checks against its own
    // `tsconfig.next.json` instead of mutating the shared one.
    tsconfigPath: "tsconfig.next.json",
  },
};

export default nextConfig;
