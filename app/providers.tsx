"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../lib/query-client";

/**
 * Browser-side TanStack Query provider (design.md: "Keep TanStack Query;
 * Server Components prefetch into it"). `useState`'s lazy initializer, not
 * a module-level singleton, so each browser tab/hydration gets its own
 * client instance — the documented pattern for App Router (a shared module
 * singleton would leak across concurrent server renders if ever imported
 * server-side by mistake). `createQueryClient()` keeps the same D2
 * staleTime/gcTime defaults (30s/5min) as the pre-migration client.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
