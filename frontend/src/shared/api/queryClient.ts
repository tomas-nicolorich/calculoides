import { QueryClient, DefaultOptions } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

export const BASE_QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} satisfies DefaultOptions["queries"];

export const GROUPS_STALE_TIME = 5 * 60_000;

export function createQueryClient(
  o: {
    queries?: DefaultOptions["queries"];
    mutations?: DefaultOptions["mutations"];
  } = {},
): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { ...BASE_QUERY_DEFAULTS, ...o.queries }, // per-section merge, not top-level spread
      mutations: { retry: 0, ...o.mutations },
    },
  });
  client.setQueryDefaults(queryKeys.groups(), { staleTime: GROUPS_STALE_TIME });
  return client;
}

/** App singleton — mounted once in `App.tsx`. Everywhere else uses `useQueryClient()`. */
export const queryClient = createQueryClient();
