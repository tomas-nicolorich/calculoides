import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import {
  create,
  update,
  deleteGoal,
  contributionUpsert,
  contributionDelete,
} from "../../lib/actions/savings";
import { fetchJson } from "./fetch-json";
import { invalidateGroupQueries } from "./invalidate";

// Local shape, not imported from `frontend/src/entities/savings-goal` —
// that module transitively pulls in a Vite-only `import.meta.env` read
// that breaks `tsc --noEmit -p tsconfig.next.json`, same class of issue
// the other `app/_data/**` modules avoid by using plain `fetch` instead of
// `apiClient.fetch`.
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

/** Hoisted from `app/(app)/savings/[groupId]/queries.ts` per ADR-2. */
export function useSavingsGoalsList(groupId: string) {
  return useQuery({
    queryKey: queryKeys.savingsGoals(groupId),
    queryFn: () => fetchJson<SavingsGoal[]>(`/api/savings?groupId=${groupId}`),
  });
}

// The four hooks below wire every savings/contribution mutation to
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

/** Backs `SavingsGoalForm`'s row-menu edit path (PR 16). */
export function useUpdateGoal(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: update,
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

// Plain-language translations for the errors the savings Server Actions can
// actually return (`lib/server/errors.ts`'s `STATUS_BY_MESSAGE` table),
// mirroring prod's `entities/savings-goal/errorMessages.ts` known-case /
// generic-fallback pattern. Server Actions here return `ActionResult` rather
// than throwing, so this takes the plain `error` string directly instead of
// an `unknown` caught value.
const KNOWN_SAVINGS_ERRORS: Record<string, string> = {
  "Savings goal not found":
    "This savings goal no longer exists — it may have already been removed.",
  "Group member not found": "That member no longer belongs to this group.",
  "Member does not belong to the group associated with this savings goal":
    "That member doesn't belong to this group.",
  "User does not belong to the group associated with this savings goal":
    "You don't have access to this savings goal.",
  Unauthorized: "You need to be signed in to do that.",
  "Access denied to this group": "You don't have access to this group.",
};

const GENERIC_SAVINGS_ERROR = "Something went wrong. Please try again.";

export function toFriendlySavingsError(error: string): string {
  return KNOWN_SAVINGS_ERRORS[error] ?? GENERIC_SAVINGS_ERROR;
}
