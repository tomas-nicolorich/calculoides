import { useQuery } from "@tanstack/react-query";
import { savingsGoalApi, SavingsGoal } from "../../entities/savings-goal";
import { queryKeys, NO_GROUP } from "./queryKeys";
import { toApiQueryResult } from "./apiQueryResult";

const EMPTY_GOALS: SavingsGoal[] = [];

/** `enabled: false` guarantees this branch is unreachable; it only guards the type. */
function requireGroupId(groupId: string | null): string {
  if (groupId === null) {
    throw new Error("Query function called while disabled (groupId is null)");
  }
  return groupId;
}

export function useSavingsGoals(groupId: string | null) {
  const q = useQuery({
    queryKey: queryKeys.savingsGoals(groupId ?? NO_GROUP),
    queryFn: () => savingsGoalApi.list(requireGroupId(groupId)),
    enabled: groupId !== null,
  });
  return toApiQueryResult<SavingsGoal[]>(q, EMPTY_GOALS);
}
