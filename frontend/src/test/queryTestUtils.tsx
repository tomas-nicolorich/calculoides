import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * A fresh `QueryClient` tuned for tests: no retries (so error-state
 * assertions don't wait on a retry), no GC timers left running after
 * teardown, no background refetching triggered by jsdom focus/online
 * events, and immediately-stale data so a `refetch()`/remount always hits
 * the mocked fetcher instead of serving a cached value.
 *
 * Always call this per test — a shared client leaks cached data across
 * cases.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wraps `children` in a fresh `QueryClientProvider`. Pass an explicit
 * `client` to seed the cache (e.g. via `client.setQueryData`) before
 * rendering; otherwise a new `createTestQueryClient()` is used.
 */
export function QueryWrapper({
  children,
  client = createTestQueryClient(),
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
