import { useReducer, useEffect, useCallback } from "react";
import { calculateProjectedMonths, addMonths } from "shared";
import type {
  SavingsGoal,
  ContributionSessionPhase,
  ContributionSessionState,
  ContributionSessionAction,
  PreResetSnapshot,
  SessionStartSnapshot,
} from "./index";
import { savingsGoalApi } from "./index";

export interface ContributionSession {
  phase: ContributionSessionPhase;
  overrideAmounts: Record<string, number>;
  sessionStartSnapshot: SessionStartSnapshot;
  preResetSnapshot: PreResetSnapshot;
  localProjectedMonths: number | null;
  localProjectedDate: Date | null;
  forecastColor: "neutral" | "green" | "amber" | "red";
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
    goal.startingAmount,
    totalMonthly,
  );
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
      if (isNaN(action.amount)) return state;
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

export function useContributionSession(
  activeGoal: SavingsGoal | null,
): ContributionSession {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [saveError, setSaveError] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  );

  useEffect(() => {
    if (activeGoal === null) {
      dispatch({ type: "cancelSession" });
      setSaveError(null);
      return;
    }
    const snapshot: SessionStartSnapshot = Object.fromEntries(
      activeGoal.breakdown
        .filter((b) => b.isOverridden)
        .map((b) => [b.memberId, b.actualAmount]),
    );
    dispatch({ type: "sessionStart", snapshot });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoal?.id]); // intentional: only re-run when the goal ID changes, not on every reference update

  const localProjectedMonths =
    activeGoal && state.phase !== "idle"
      ? computeProjectedMonths(activeGoal, state.overrideAmounts)
      : null;

  const localProjectedDate =
    localProjectedMonths !== null
      ? addMonths(new Date(), localProjectedMonths)
      : null;

  const targetMonths = activeGoal
    ? (() => {
        const now = new Date();
        const target = new Date(activeGoal.targetDate);
        return (
          (target.getFullYear() - now.getFullYear()) * 12 +
          (target.getMonth() - now.getMonth())
        );
      })()
    : 0;

  const forecastColor: ContributionSession["forecastColor"] =
    state.phase === "idle" || localProjectedMonths === null
      ? "neutral"
      : localProjectedMonths === Infinity
        ? "red"
        : localProjectedMonths <= targetMonths
          ? "green"
          : "amber";

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
      await Promise.all(
        activeGoal.breakdown.map((b) =>
          savingsGoalApi.upsertContribution(
            activeGoal.id,
            b.memberId,
            state.overrideAmounts[b.memberId] ?? b.proportionalAmount,
          ),
        ),
      );
      dispatch({ type: "saveSuccess" });
      setSaveError(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      dispatch({ type: "saveFailure", error: message });
      setSaveError(message);
      return false;
    }
  }, [activeGoal, state.phase, state.overrideAmounts]);

  return {
    phase: state.phase,
    overrideAmounts: state.overrideAmounts,
    sessionStartSnapshot: state.sessionStartSnapshot,
    preResetSnapshot: state.preResetSnapshot,
    localProjectedMonths,
    localProjectedDate,
    forecastColor,
    saveError,
    overrideMember,
    resetToIncomeSplit,
    undoReset,
    saveSession,
    cancelSession,
  };
}
