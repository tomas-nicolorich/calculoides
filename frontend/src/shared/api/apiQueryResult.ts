import type { UseQueryResult } from "@tanstack/react-query";
import { toErrorMessage } from "./toErrorMessage";

/**
 * The consumer-facing shape every migrated read hook returns (A1). Preserves
 * the pre-TanStack `useApiQuery` 5-field contract exactly so every existing
 * page/widget consumer and `vi.mock`/`mockReturnValue` literal keeps
 * compiling unchanged. `isFetching`/`refetch` are additive and optional.
 */
export interface ApiQueryResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  isInitialLoading: boolean;
  isFetching?: boolean;
  refetch?: () => Promise<unknown>;
}

/**
 * Maps a TanStack `UseQueryResult` onto the preserved `ApiQueryResult`
 * contract (A1–A5).
 */
export function toApiQueryResult<T>(
  query: UseQueryResult<T>,
  fallback: T,
): ApiQueryResult<T> {
  return {
    data: query.data ?? fallback,
    // A4: `isLoading` (== isPending && isFetching) is false for a disabled
    // query, matching today's `groupId === null` -> not-loading behavior.
    loading: query.isLoading,
    isInitialLoading: query.isLoading,
    error: toErrorMessage(query.error),
    refresh: () => {
      void query.refetch();
    },
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
