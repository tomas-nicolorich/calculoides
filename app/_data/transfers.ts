import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, type TransferFilters } from "../../lib/query-keys";
import type { TransfersList } from "shared/src/types/redesign";
import { create, deleteTransfer, deleteAll } from "../../lib/actions/transfer";
import { fetchJson } from "./fetch-json";
import { invalidateGroupQueries } from "./invalidate";

/** Hoisted from `app/(app)/transfers/[groupId]/queries.ts` per ADR-2. */
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

// The three hooks below wire every transfer mutation to group-scoped client
// cache invalidation; `lib/actions/transfer.ts` itself handles the
// companion Dashboard Server Component revalidation server-side.

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
