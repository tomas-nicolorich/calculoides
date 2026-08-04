import { useReducer, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calculateProjectedMonths,
  addMonths,
  calculateMonthsRemaining,
} from "shared";
import type {
  SavingsGoal,
  ContributionSessionPhase,
  ContributionSessionState,
  ContributionSessionAction,
  PreResetSnapshot,
  SessionStartSnapshot,
} from "./index";
import { savingsGoalApi } from "./index";
import { diffContributionPersistence } from "./contributionDiff";
import { toFriendlySavingsError } from "./errorMessages";
import { queryKeys } from "../../shared/api/queryKeys";

export interface ContributionSession {
  phase: ContributionSessionPhase;
  overrideAmounts: Record<string, number>;
  sessionStartSnapshot: SessionStartSnapshot;
  preResetSnapshot: PreResetSnapshot;
  localProjectedMonths: number | null;
  localProjectedDate: Date | null;
  forecastColor: "neutral" | "green" | "amber" | "red";
  ceilingWarnings: Record<string, boolean>;
  saveError: string | null;
  overrideMember(memberId: string, amount: number): void;
  resetToIncomeSplit(): void;
  undoReset(): void;
  saveSession(): Promise<boolean>;
  cancelSession(): void;
}

const initialState: ContributionSessionState = {
  phase: "idle",
  overrideAmounts: {},
  sessionStartSnapshot: {},
  preResetSnapshot: null,
  localProjectedMonths: null,
};

function computeProjectedMonths(
  goal: SavingsGoal,
  overrideAmounts: Record<string, number>,
): number {
  const totalMonthly = goal.breakdown.reduce(
    (sum, b) => sum + (overrideAmounts[b.memberId] ?? b.proportionalAmount),
    0,
  );
  return calculateProjectedMonths(
    goal.targetAmount,
    goal.currentAmount,
    totalMonthly,
  );
}

function buildSessionStartSnapshot(goal: SavingsGoal): SessionStartSnapshot {
  return Object.fromEntries(
    goal.breakdown
      .filter((b) => b.isOverridden)
      .map((b) => [b.memberId, b.actualAmount]),
  );
}

/**
 * Mirrors the backend's varianceMonths (api/_src/services/savings.ts): it
 * re-derives the projected month count via calculateMonthsRemaining on the
 * projected date rather than comparing the raw month count — skipping that
 * rebasing flips the color a month early on the on-target boundary.
 */
function computeForecastColor(
  now: Date,
  phase: ContributionSessionPhase,
  localProjectedMonths: number | null,
  targetMonths: number,
): ContributionSession["forecastColor"] {
  if (phase === "idle" || localProjectedMonths === null) return "neutral";
  if (localProjectedMonths === Infinity) return "red";
  const rebasedMonths = calculateMonthsRemaining(
    now,
    addMonths(now, localProjectedMonths),
  );
  return rebasedMonths <= targetMonths ? "green" : "amber";
}

// fallow-ignore-next-line complexity
function reducer(
  state: ContributionSessionState,
  action: ContributionSessionAction,
): ContributionSessionState {
  switch (action.type) {
    case "sessionStart": {
      const { snapshot } = action;
      return {
        ...state,
        phase: "editing",
        overrideAmounts: snapshot,
        sessionStartSnapshot: snapshot,
        preResetSnapshot: null,
        localProjectedMonths: null,
      };
    }
    case "overrideAmount": {
      if (state.phase !== "editing") return state;
      if (isNaN(action.amount) || action.amount < 0) return state;
      const newOverrides = {
        ...state.overrideAmounts,
        [action.memberId]: action.amount,
      };
      return { ...state, overrideAmounts: newOverrides };
    }
    case "resetToIncomeSplit": {
      if (state.phase !== "editing") return state;
      return {
        ...state,
        preResetSnapshot: state.overrideAmounts,
        overrideAmounts: {},
      };
    }
    case "undoReset": {
      if (state.phase !== "editing" || state.preResetSnapshot === null)
        return state;
      return {
        ...state,
        overrideAmounts: state.preResetSnapshot,
        preResetSnapshot: null,
      };
    }
    case "saveStart": {
      if (state.phase !== "editing") return state;
      return { ...state, phase: "saving" };
    }
    case "saveSuccess": {
      return {
        ...initialState,
      };
    }
    case "saveFailure": {
      if (state.phase !== "saving") return state;
      return {
        ...state,
        phase: "editing",
        localProjectedMonths: state.localProjectedMonths,
      };
    }
    case "cancelSession": {
      return {
        ...initialState,
        overrideAmounts: state.sessionStartSnapshot,
      };
    }
    default:
      return state;
  }
}

interface SaveContributionsInput {
  goalId: string;
  groupId: string;
  toUpsert: { memberId: string; amount: number }[];
  toDelete: string[];
}

export function useContributionSession(
  activeGoal: SavingsGoal | null,
): ContributionSession {
  const qc = useQueryClient();
  const saveContributions = useMutation({
    mutationFn: async ({
      goalId,
      toUpsert,
      toDelete,
    }: SaveContributionsInput) => {
      await Promise.all([
        ...toUpsert.map((entry) =>
          savingsGoalApi.upsertContribution(
            goalId,
            entry.memberId,
            entry.amount,
          ),
        ),
        ...toDelete.map((memberId) =>
          savingsGoalApi.deleteContribution(goalId, memberId),
        ),
      ]);
    },
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
  });
  const [state, dispatch] = useReducer(reducer, initialState);
  const [saveError, setSaveError] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  );
  const [prevActiveGoalId, setPrevActiveGoalId] = useState<string | null>(null);

  // Seeds/tears down the session synchronously during render (not in a
  // useEffect) so the very first render where activeGoal flips non-null
  // already has overrideAmounts populated. An effect-based version runs one
  // commit late, so AllocationAmountInput mounts on its initial render
  // showing proportionalAmount instead of any existing override.
  const activeGoalId = activeGoal?.id ?? null;
  if (activeGoalId !== prevActiveGoalId) {
    setPrevActiveGoalId(activeGoalId);
    if (activeGoal === null) {
      dispatch({ type: "cancelSession" });
      setSaveError(null);
    } else {
      dispatch({
        type: "sessionStart",
        snapshot: buildSessionStartSnapshot(activeGoal),
      });
    }
  }

  const now = new Date();

  const localProjectedMonths =
    activeGoal && state.phase !== "idle"
      ? computeProjectedMonths(activeGoal, state.overrideAmounts)
      : null;

  const localProjectedDate =
    localProjectedMonths !== null ? addMonths(now, localProjectedMonths) : null;

  const targetMonths = activeGoal
    ? calculateMonthsRemaining(now, new Date(activeGoal.targetDate))
    : 0;

  const forecastColor = computeForecastColor(
    now,
    state.phase,
    localProjectedMonths,
    targetMonths,
  );

  // Pure derived/selector value — NOT reducer state. Compares each member's
  // effective share (override, falling back to the proportional income-split
  // amount) against their live affordability ceiling (remainingBalance).
  // Never reads or writes overrideAmounts beyond this lookup.
  const ceilingWarnings: Record<string, boolean> = activeGoal
    ? Object.fromEntries(
        activeGoal.breakdown.map((b) => [
          b.memberId,
          (state.overrideAmounts[b.memberId] ?? b.proportionalAmount) >
            b.remainingBalance,
        ]),
      )
    : {};

  const overrideMember = useCallback((memberId: string, amount: number) => {
    dispatch({ type: "overrideAmount", memberId, amount });
  }, []);

  const resetToIncomeSplit = useCallback(() => {
    dispatch({ type: "resetToIncomeSplit" });
  }, []);

  const undoReset = useCallback(() => {
    dispatch({ type: "undoReset" });
  }, []);

  const cancelSession = useCallback(() => {
    dispatch({ type: "cancelSession" });
    setSaveError(null);
  }, []);

  const saveSession = useCallback(async (): Promise<boolean> => {
    if (!activeGoal || state.phase !== "editing") return false;
    dispatch({ type: "saveStart" });
    setSaveError(null);
    try {
      const { toUpsert, toDelete } = diffContributionPersistence(
        activeGoal.breakdown,
        state.overrideAmounts,
      );
      await saveContributions.mutateAsync({
        goalId: activeGoal.id,
        groupId: activeGoal.groupId,
        toUpsert,
        toDelete,
      });
      dispatch({ type: "saveSuccess" });
      setSaveError(null);
      return true;
    } catch (err) {
      const message = toFriendlySavingsError(err);
      dispatch({ type: "saveFailure", error: message });
      setSaveError(message);
      return false;
    }
  }, [activeGoal, state.phase, state.overrideAmounts, saveContributions]);

  return {
    phase: state.phase,
    overrideAmounts: state.overrideAmounts,
    sessionStartSnapshot: state.sessionStartSnapshot,
    preResetSnapshot: state.preResetSnapshot,
    localProjectedMonths,
    localProjectedDate,
    forecastColor,
    ceilingWarnings,
    saveError,
    overrideMember,
    resetToIncomeSplit,
    undoReset,
    saveSession,
    cancelSession,
  };
}
