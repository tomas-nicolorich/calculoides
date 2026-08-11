import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import type { CategoryWithBalances } from "shared/src/types/redesign";
import { fetchJson } from "./fetch-json";

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
