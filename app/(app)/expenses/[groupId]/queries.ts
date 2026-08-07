import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  queryKeys,
  type ExpenseFilters,
} from "../../../../frontend/src/shared/api/queryKeys";
import type { ExpensesList } from "shared/src/types/redesign";
import {
  create,
  deleteExpense,
  deleteAll,
} from "../../../../lib/actions/expense";

/**
 * Lean Next-app equivalent of `frontend/src/shared/api/dashboardHooks.ts`'s
 * `useExpensesList`, backing the `/api/expenses` Route Handler's
 * refetch-on-focus/pagination for the same `queryKeys.expenses` tuple
 * (4b.3, 4b.6). Same "lean new implementation, not full port" precedent as
 * `app/(app)/dashboard/[groupId]/queries.ts` (Phase 2) — plain `fetch` is
 * used instead of `apiClient.fetch`, which pulls in a Vite-only
 * `import.meta.env` read that breaks under Next's bundler. `queryKeys`
 * itself is reused unchanged.
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

export function useExpensesList(groupId: string, filters: ExpenseFilters = {}) {
  const { categoryId, memberId, limit = 20, offset = 0, from, to } = filters;
  return useQuery({
    queryKey: queryKeys.expenses(groupId, filters),
    queryFn: () => {
      const params = new URLSearchParams({
        groupId,
        limit: String(limit),
        offset: String(offset),
      });
      if (categoryId) params.append("categoryId", categoryId);
      if (memberId) params.append("memberId", memberId);
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      return fetchJson<ExpensesList>(`/api/expenses?${params.toString()}`);
    },
  });
}

/**
 * client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
 * Prefix" (4b.7). `queryKeys.group(groupId)` is the `["group", groupId]`
 * prefix; TanStack Query's default `invalidateQueries` only marks cache
 * entries whose key starts with that exact tuple as stale, so a mutation
 * for one group can never mark another group's cached queries stale
 * (client-data-cache: "Mutation for one group does not affect another",
 * 4b.8).
 */
export function invalidateGroupQueries(
  queryClient: QueryClient,
  groupId: string,
) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
}

// The four hooks below wire every Phase 4a expense mutation to group-scoped
// client cache invalidation (4b.7); `lib/actions/expense.ts` itself handles
// the companion Dashboard Server Component revalidation server-side.

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteAllExpenses(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAll,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
