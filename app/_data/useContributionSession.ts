import { useReducer, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calculateProjectedMonths,
  addMonths,
  calculateMonthsRemaining,
} from "shared";
import { contributionUpsert, contributionDelete } from "../../lib/actions/savings";
import { diffContributionPersistence } from "../../lib/contribution-diff";
import { invalidateGroupQueries } from "./invalidate";
import type { SavingsGoal } from "./savings";

export type ContributionSessionPhase = "idle" | "editing" | "saving";
export type SessionStartSnapshot = Record<string, number>;
export type PreResetSnapshot = Record<string, number> | null;

interface ContributionSessionState {
  phase: ContributionSessionPhase;
  overrideAmounts: Record<string, number>;
  sessionStartSnapshot: SessionStartSnapshot;
  preResetSnapshot: PreResetSnapshot;
}

type ContributionSessionAction =
  | { type: "sessionStart"; snapshot: SessionStartSnapshot }
  | { type: "overrideAmount"; memberId: string; amount: number }
  | { type: "resetToIncomeSplit" }
  | { type: "undoReset" }
  | { type: "saveStart" }
  | { type: "saveSuccess" }
  | { type: "saveFailure" }
  | { type: "cancelSession" };

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
 * Mirrors the backend's varianceMonths (`lib/server/services/savings.ts`):
 * re-derives the projected month count via `calculateMonthsRemaining` on the
 * projected date rather than comparing the raw month count — skipping that
 * rebasing flips the colour a month early on the on-target boundary.
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

type ContributionSessionActionHandlers = {
  [K in ContributionSessionAction["type"]]: (
    state: ContributionSessionState,
    action: Extract<ContributionSessionAction, { type: K }>,
  ) => ContributionSessionState;
};

const contributionSessionActionHandlers: ContributionSessionActionHandlers = {
  sessionStart: (state, action) => {
    const { snapshot } = action;
    return {
      ...state,
      phase: "editing",
      overrideAmounts: snapshot,
      sessionStartSnapshot: snapshot,
      preResetSnapshot: null,
    };
  },
  overrideAmount: (state, action) => {
    if (state.phase !== "editing") return state;
    if (isNaN(action.amount) || action.amount < 0) return state;
    return {
      ...state,
      overrideAmounts: {
        ...state.overrideAmounts,
        [action.memberId]: action.amount,
      },
    };
  },
  resetToIncomeSplit: (state) => {
    if (state.phase !== "editing") return state;
    return {
      ...state,
      preResetSnapshot: state.overrideAmounts,
      overrideAmounts: {},
    };
  },
  undoReset: (state) => {
    if (state.phase !== "editing" || state.preResetSnapshot === null)
      return state;
    return {
      ...state,
      overrideAmounts: state.preResetSnapshot,
      preResetSnapshot: null,
    };
  },
  saveStart: (state) => {
    if (state.phase !== "editing") return state;
    return { ...state, phase: "saving" };
  },
  saveSuccess: () => {
    return { ...initialState };
  },
  saveFailure: (state) => {
    if (state.phase !== "saving") return state;
    return { ...state, phase: "editing" };
  },
  cancelSession: (state) => {
    return { ...initialState, overrideAmounts: state.sessionStartSnapshot };
  },
};

function reducer(
  state: ContributionSessionState,
  action: ContributionSessionAction,
): ContributionSessionState {
  const handler = contributionSessionActionHandlers[action.type] as (
    state: ContributionSessionState,
    action: ContributionSessionAction,
  ) => ContributionSessionState;
  return handler(state, action);
}

/**
 * Ported/adapted from `main`'s
 * `frontend/src/entities/savings-goal/useContributionSession.ts` (PR 16).
 * Owns the `InlineAllocationEditor`'s Adjust session: seeds/tears down
 * synchronously during render (not a `useEffect`) so the very first render
 * where `activeGoal` flips non-null already has `overrideAmounts` populated
 * — an effect-based version runs one commit late, so the amount input mounts
 * showing `proportionalAmount` instead of any existing override.
 *
 * DEVIATION (documented): this repo's `contributionUpsert`/
 * `contributionDelete` Server Actions return `ActionResult` and never throw
 * (unlike `main`'s `apiClient.fetch`-backed `savingsGoalApi`) — the
 * `useMutation` here still throws internally on a `{ ok: false }` result so
 * `saveSession`'s existing try/catch flow (unchanged from `main`) keeps
 * working without inventing new failure-handling shape.
 */
export function useContributionSession(
  activeGoal: SavingsGoal | null,
): ContributionSession {
  const queryClient = useQueryClient();
  const saveContributions = useMutation({
    mutationFn: async ({
      goalId,
      toUpsert,
      toDelete,
    }: {
      goalId: string;
      groupId: string;
      toUpsert: { memberId: string; amount: number }[];
      toDelete: string[];
    }) => {
      const results = await Promise.all([
        ...toUpsert.map((entry) =>
          contributionUpsert({
            goalId,
            memberId: entry.memberId,
            amount: entry.amount,
          }),
        ),
        ...toDelete.map((memberId) =>
          contributionDelete({ goalId, memberId }),
        ),
      ]);
      const failed = results.find((result) => !result.ok);
      if (failed) throw new Error(failed.error);
    },
    onSuccess: (_data, { groupId }) =>
      invalidateGroupQueries(queryClient, groupId),
  });

  const [state, dispatch] = useReducer(reducer, initialState);
  const [saveError, setSaveError] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  );
  const [prevActiveGoalId, setPrevActiveGoalId] = useState<string | null>(
    null,
  );

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
    localProjectedMonths !== null
      ? addMonths(now, localProjectedMonths)
      : null;

  const targetMonths = activeGoal
    ? calculateMonthsRemaining(now, new Date(activeGoal.targetDate))
    : 0;

  const forecastColor = computeForecastColor(
    now,
    state.phase,
    localProjectedMonths,
    targetMonths,
  );

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
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: "saveFailure" });
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
