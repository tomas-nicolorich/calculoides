import { useCallback } from "react";
import { savingsGoalApi, SavingsGoal } from "../../entities/savings-goal";
import { useApiQuery } from "./useApiQuery";

export function useSavingsGoals(groupId: string | null) {
  const fetcher = useCallback(
    (gId: string, _signal: AbortSignal) => savingsGoalApi.list(gId),
    [],
  );
  return useApiQuery<SavingsGoal[]>(groupId, fetcher, []);
}
