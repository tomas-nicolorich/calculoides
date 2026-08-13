import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, type ExpenseFilters } from "../../lib/query-keys";
import type { ExpensesList } from "shared/src/types/redesign";
import {
  create,
  update,
  deleteExpense,
  deleteAll,
} from "../../lib/actions/expense";
import { fetchJson } from "./fetch-json";
import { invalidateGroupQueries } from "./invalidate";

/** Hoisted from `app/(app)/expenses/[groupId]/queries.ts` per ADR-2. */
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

// The three hooks below wire every expense mutation to group-scoped client
// cache invalidation; `lib/actions/expense.ts` itself handles the companion
// Dashboard Server Component revalidation server-side.

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

/** Backs `ExpenseForm`'s edit path (PR 16). */
export function useUpdateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: update,
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
