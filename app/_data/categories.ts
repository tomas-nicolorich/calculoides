import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import type { CategoryWithBalances } from "shared/src/types/redesign";
import { create, update, deleteCategory } from "../../lib/actions/category";
import { fetchJson } from "./fetch-json";
import { invalidateGroupQueries } from "./invalidate";

/**
 * Hoisted from `app/(app)/dashboard/[groupId]/queries.ts` per ADR-2.
 * Backs refetch-on-focus for the `queryKeys.categories` tuple the Server
 * Component prefetches into.
 */
export function useCategoriesList(groupId: string) {
  return useQuery({
    queryKey: queryKeys.categories(groupId),
    queryFn: () =>
      fetchJson<CategoryWithBalances[]>(`/api/categories?groupId=${groupId}`),
  });
}

// PR 15 (dashboard-view: "BudgetCategories Mutations Invalidate the Group
// Cache"). Same `useMutation` + `invalidateGroupQueries` shape as
// `app/_data/transfers.ts`'s `useCreateTransfer`/`useDeleteTransfer` (PR 13)
// — `lib/actions/category.ts` handles the companion Server Component
// revalidation server-side, these three wire client cache invalidation.

export function useCreateCategory(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useUpdateCategory(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: update,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteCategory(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
