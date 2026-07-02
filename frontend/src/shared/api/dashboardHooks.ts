import { useCallback } from "react";
import { apiClient } from "./client";
import {
  DashboardSummary,
  CategoryWithBalances,
  ExpensesList,
  TransfersList,
} from "../../../../shared/src/types/redesign";
import { useApiQuery } from "./useApiQuery";

export function useDashboardSummary(groupId: string | null) {
  const fetcher = useCallback(
    (gId: string, signal: AbortSignal) =>
      apiClient.fetch<DashboardSummary>(`/summary?groupId=${gId}`, { signal }),
    [],
  );
  return useApiQuery<DashboardSummary | null>(groupId, fetcher, null);
}

export function useCategoriesList(groupId: string | null) {
  const fetcher = useCallback(
    (gId: string, signal: AbortSignal) =>
      apiClient.fetch<CategoryWithBalances[]>(`/categories?groupId=${gId}`, {
        signal,
      }),
    [],
  );
  return useApiQuery<CategoryWithBalances[]>(groupId, fetcher, []);
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
  const fetcher = useCallback(
    (gId: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        groupId: gId,
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
    [categoryId, memberId, limit, offset, from, to],
  );
  return useApiQuery<ExpensesList | null>(groupId, fetcher, null);
}

export function useTransfersList(
  groupId: string | null,
  categoryId?: string,
  memberId?: string,
  limit = 20,
  offset = 0,
) {
  const fetcher = useCallback(
    (gId: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        groupId: gId,
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (categoryId) params.append("categoryId", categoryId);
      if (memberId) params.append("memberId", memberId);
      return apiClient.fetch<TransfersList>(`/transfers?${params.toString()}`, {
        signal,
      });
    },
    [categoryId, memberId, limit, offset],
  );
  return useApiQuery<TransfersList | null>(groupId, fetcher, null);
}
