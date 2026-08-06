import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  queryKeys,
  type TransferFilters,
} from "../../../../frontend/src/shared/api/queryKeys";
import type { TransfersList } from "shared/src/types/redesign";
import {
  create,
  deleteTransfer,
  deleteAll,
} from "../../../../lib/actions/transfer";

/**
 * Lean Next-app equivalent of `frontend/src/shared/api/dashboardHooks.ts`'s
 * `useTransfersList`, backing the `/api/transfers` Route Handler's
 * refetch-on-focus/pagination for the same `queryKeys.transfers` tuple
 * (5.5, 5.8). Same "lean new implementation, not full port" precedent as
 * `app/(app)/expenses/[groupId]/queries.ts` (4b.6) — plain `fetch` instead
 * of `apiClient.fetch`, which pulls in a Vite-only `import.meta.env` read
 * that breaks under Next's bundler. `queryKeys` itself is reused unchanged.
 */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useTransfersList(
  groupId: string,
  filters: TransferFilters = {},
) {
  const { categoryId, memberId, limit = 20, offset = 0 } = filters;
  return useQuery({
    queryKey: queryKeys.transfers(groupId, filters),
    queryFn: () => {
      const params = new URLSearchParams({
        groupId,
        limit: String(limit),
        offset: String(offset),
      });
      if (categoryId) params.append("categoryId", categoryId);
      if (memberId) params.append("memberId", memberId);
      return fetchJson<TransfersList>(`/api/transfers?${params.toString()}`);
    },
  });
}

/**
 * client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
 * Prefix". `queryKeys.group(groupId)` is the `["group", groupId]` prefix,
 * reused unchanged from Phase 2/4b — see
 * `app/(app)/expenses/[groupId]/queries.test.ts`'s cache-isolation coverage
 * (4b.8) for this helper's prefix-match semantics; not duplicated here.
 */
export function invalidateGroupQueries(
  queryClient: QueryClient,
  groupId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.group(groupId),
  });
}

// The three hooks below wire every Phase 5 transfer mutation to
// group-scoped client cache invalidation; `lib/actions/transfer.ts` itself
// handles the companion Dashboard Server Component revalidation
// server-side.

export function useCreateTransfer(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteTransfer(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransfer,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteAllTransfers(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAll,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
