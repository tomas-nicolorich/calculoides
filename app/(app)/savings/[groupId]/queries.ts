import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../../../../lib/query-keys";
import {
  create,
  deleteGoal,
  contributionUpsert,
  contributionDelete,
} from "../../../../lib/actions/savings";

/**
 * Lean Next-app equivalent of `frontend/src/shared/api/savingsHooks.ts`'s
 * `useSavingsGoals`, backing the `/api/savings` Route Handler's
 * refetch-on-focus for the same `queryKeys.savingsGoals` tuple (6b.1, 6b.4).
 * Same "lean new implementation, not full port" precedent as
 * `app/(app)/expenses/[groupId]/queries.ts` (4b.6) /
 * `app/(app)/transfers/[groupId]/queries.ts` (5.8) — plain `fetch` instead
 * of `apiClient.fetch`, which pulls in a Vite-only `import.meta.env` read
 * that breaks under Next's bundler. `queryKeys`/`SavingsGoal` themselves are
 * reused unchanged.
 */
// Local shape, not imported from `frontend/src/entities/savings-goal` —
// that module transitively pulls in `frontend/src/shared/api/client.ts`'s
// Vite-only `import.meta.env` read (`supabase.ts`), which breaks
// `tsc --noEmit -p tsconfig.next.json`, same class of issue 4b.6/5.8 avoided
// by using plain `fetch` instead of `apiClient.fetch`.
export interface SavingsContributionBreakdown {
  memberId: string;
  share: number;
  percentage: number;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  remainingBalance: number;
  user?: { name: string | null; email: string };
}

export interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  icon?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  isNever: boolean;
  breakdown: SavingsContributionBreakdown[];
}

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

export function useSavingsGoalsList(groupId: string) {
  return useQuery({
    queryKey: queryKeys.savingsGoals(groupId),
    queryFn: () => fetchJson<SavingsGoal[]>(`/api/savings?groupId=${groupId}`),
  });
}

/**
 * client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
 * Prefix". `queryKeys.group(groupId)` is the `["group", groupId]` prefix,
 * reused unchanged from Phase 2/4b — see
 * `app/(app)/expenses/[groupId]/queries.test.ts`'s cache-isolation coverage
 * (4b.8) for this helper's prefix-match semantics; not duplicated here.
 */
function invalidateGroupQueries(queryClient: QueryClient, groupId: string) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.group(groupId),
  });
}

// The five hooks below wire every Phase 6a savings/contribution mutation to
// group-scoped client cache invalidation; `lib/actions/savings.ts` itself
// handles the companion Dashboard Server Component revalidation
// server-side.

export function useCreateGoal(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteGoal(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useContributionUpsert(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contributionUpsert,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useContributionDelete(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contributionDelete,
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
