import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import type { DashboardSummary } from "shared/src/types/redesign";
import { fetchJson } from "./fetch-json";

/**
 * Hoisted from `app/(app)/dashboard/[groupId]/queries.ts` per ADR-2.
 * Backs refetch-on-focus for the `queryKeys.summary` tuple the Server
 * Component prefetches into.
 */
export function useDashboardSummary(groupId: string) {
  return useQuery({
    queryKey: queryKeys.summary(groupId),
    queryFn: () =>
      fetchJson<DashboardSummary>(`/api/summary?groupId=${groupId}`),
  });
}
