import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "./client";
import {
  DashboardSummary,
  CategoryWithBalances,
  ExpensesList,
  TransfersList,
} from "../../../../shared/src/types/redesign";
import {
  queryKeys,
  NO_GROUP,
  ExpenseFilters,
  TransferFilters,
} from "./queryKeys";
import { toApiQueryResult } from "./apiQueryResult";

/** `enabled: false` guarantees this branch is unreachable; it only guards the type. */
function requireGroupId(groupId: string | null): string {
  if (groupId === null) {
    throw new Error("Query function called while disabled (groupId is null)");
  }
  return groupId;
}

export function useDashboardSummary(groupId: string | null) {
  const q = useQuery({
    queryKey: queryKeys.summary(groupId ?? NO_GROUP),
    queryFn: ({ signal }) =>
      apiClient.fetch<DashboardSummary>(
        `/summary?groupId=${requireGroupId(groupId)}`,
        { signal },
      ),
    enabled: groupId !== null,
  });
  return toApiQueryResult<DashboardSummary | null>(q, null);
}

export function useCategoriesList(groupId: string | null) {
  const q = useQuery({
    queryKey: queryKeys.categories(groupId ?? NO_GROUP),
    queryFn: ({ signal }) =>
      apiClient.fetch<CategoryWithBalances[]>(
        `/categories?groupId=${requireGroupId(groupId)}`,
        { signal },
      ),
    enabled: groupId !== null,
  });
  return toApiQueryResult<CategoryWithBalances[]>(q, []);
}

export function useExpensesList(
  groupId: string | null,
  categoryId?: string,
  memberId?: string,
  limit = 20,
  offset = 0,
  from?: string,
  to?: string,
) {
  const filters: ExpenseFilters = {
    categoryId,
    memberId,
    limit,
    offset,
    from,
    to,
  };
  const q = useQuery({
    queryKey: queryKeys.expenses(groupId ?? NO_GROUP, filters),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        groupId: requireGroupId(groupId),
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (categoryId) params.append("categoryId", categoryId);
      if (memberId) params.append("memberId", memberId);
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      return apiClient.fetch<ExpensesList>(`/expenses?${params.toString()}`, {
        signal,
      });
    },
    enabled: groupId !== null,
    placeholderData: keepPreviousData, // A8 — no flash of empty state on page/filter change
  });
  return toApiQueryResult<ExpensesList | null>(q, null);
}

export function useTransfersList(
  groupId: string | null,
  categoryId?: string,
  memberId?: string,
  limit = 20,
  offset = 0,
) {
  const filters: TransferFilters = { categoryId, memberId, limit, offset };
  const q = useQuery({
    queryKey: queryKeys.transfers(groupId ?? NO_GROUP, filters),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        groupId: requireGroupId(groupId),
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (categoryId) params.append("categoryId", categoryId);
      if (memberId) params.append("memberId", memberId);
      return apiClient.fetch<TransfersList>(`/transfers?${params.toString()}`, {
        signal,
      });
    },
    enabled: groupId !== null,
    placeholderData: keepPreviousData, // A8
  });
  return toApiQueryResult<TransfersList | null>(q, null);
}
