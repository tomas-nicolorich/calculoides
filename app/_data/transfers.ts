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

/** A single `/api/transfers/by-category` entry — the route returns Prisma's
 * raw relation shape (`fromMember`/`toMember` -> `CategoryMember` ->
 * `GroupMember` -> `user`), unlike `TransfersList`'s flattened
 * `fromMemberName`/`toMemberName` shape. */
export interface CategoryTransferHistoryItem {
  id: string;
  amount: number;
  date: string;
  fromMember?: { member?: { user?: { name?: string } } };
  toMember?: { member?: { user?: { name?: string } } };
}

// dashboard-view: "Budget Transfers Support Inline Creation and Per-Category
// History" — `BudgetCategories`' accordion drill-down (PR 15). `enabled`
// keeps this a lazy fetch: only the expanded row's own query runs, and
// `invalidateGroupQueries` (any `["group", groupId]`-prefixed mutation)
// covers this key too since it nests under the same prefix.
export function useTransfersByCategory(
  groupId: string,
  categoryId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.transfersByCategory(groupId, categoryId),
    queryFn: () =>
      fetchJson<CategoryTransferHistoryItem[]>(
        `/api/transfers/by-category?categoryId=${categoryId}`,
      ),
    enabled,
  });
}
