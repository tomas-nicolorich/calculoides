import { useReducer, useEffect, useCallback } from "react";
import { groupApi } from "../group/index";

export type IncomeSessionPhase = "idle" | "editing" | "saving";

export interface IncomeSessionMember {
  id: string;
  income: number;
}

interface IncomeSessionState {
  phase: IncomeSessionPhase;
  overrideAmounts: Record<string, number>;
  sessionStartSnapshot: Record<string, number>;
}

type IncomeSessionAction =
  | { type: "sessionStart"; snapshot: Record<string, number> }
  | { type: "overrideIncome"; memberId: string; amount: number }
  | { type: "saveStart" }
  | { type: "saveSuccess" }
  | { type: "saveFailure" }
  | { type: "cancelSession" };

export interface IncomeSession {
  phase: IncomeSessionPhase;
  overrideAmounts: Record<string, number>;
  shares: Record<string, number>;
  saveError: string | null;
  overrideIncome(memberId: string, amount: number): void;
  saveSession(): Promise<boolean>;
  cancelSession(): void;
}

const initialState: IncomeSessionState = {
  phase: "idle",
  overrideAmounts: {},
  sessionStartSnapshot: {},
};

function startSession(snapshot: Record<string, number>): IncomeSessionState {
  return {
    phase: "editing",
    overrideAmounts: snapshot,
    sessionStartSnapshot: snapshot,
  };
}

function overrideIncome(
  state: IncomeSessionState,
  memberId: string,
  amount: number,
): IncomeSessionState {
  if (state.phase !== "editing") return state;
  if (isNaN(amount) || amount < 0) return state;
  return {
    ...state,
    overrideAmounts: { ...state.overrideAmounts, [memberId]: amount },
  };
}

function startSave(state: IncomeSessionState): IncomeSessionState {
  if (state.phase !== "editing") return state;
  return { ...state, phase: "saving" };
}

function failSave(state: IncomeSessionState): IncomeSessionState {
  if (state.phase !== "saving") return state;
  return { ...state, phase: "editing" };
}

function reducer(
  state: IncomeSessionState,
  action: IncomeSessionAction,
): IncomeSessionState {
  switch (action.type) {
    case "sessionStart":
      return startSession(action.snapshot);
    case "overrideIncome":
      return overrideIncome(state, action.memberId, action.amount);
    case "saveStart":
      return startSave(state);
    case "saveSuccess":
      return { ...initialState };
    case "saveFailure":
      return failSave(state);
    case "cancelSession":
      return { ...initialState, overrideAmounts: state.sessionStartSnapshot };
    default:
      return state;
  }
}

/**
 * Reducer-based session for the dashboard Income Overview card's inline edit
 * mode. Mirrors `useContributionSession`, simplified: no diff/forecast/ceiling
 * logic — just an override map + live share % + save/cancel.
 *
 * `members` is `null` while the card is in view mode; the widget passes the
 * live member list once the header pencil toggles edit mode on.
 */
export function useIncomeSession(
  members: IncomeSessionMember[] | null,
): IncomeSession {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [saveError, setSaveError] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  );

  const isActive = members !== null;

  useEffect(() => {
    if (!isActive) {
      dispatch({ type: "cancelSession" });
      setSaveError(null);
      return;
    }
    const snapshot: Record<string, number> = Object.fromEntries(
      members.map((m) => [m.id, m.income]),
    );
    dispatch({ type: "sessionStart", snapshot });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // intentional: only re-snapshot on the idle<->editing transition

  const totalIncome = Object.values(state.overrideAmounts).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const shares: Record<string, number> = Object.fromEntries(
    Object.entries(state.overrideAmounts).map(([memberId, amount]) => [
      memberId,
      totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    ]),
  );

  const overrideIncome = useCallback((memberId: string, amount: number) => {
    dispatch({ type: "overrideIncome", memberId, amount });
  }, []);

  const cancelSession = useCallback(() => {
    dispatch({ type: "cancelSession" });
    setSaveError(null);
  }, []);

  const saveSession = useCallback(async (): Promise<boolean> => {
    if (state.phase !== "editing") return false;
    dispatch({ type: "saveStart" });
    setSaveError(null);
    try {
      const changed = Object.entries(state.overrideAmounts).filter(
        ([memberId, amount]) => state.sessionStartSnapshot[memberId] !== amount,
      );
      await Promise.all(
        changed.map(([memberId, amount]) =>
          groupApi.updateMemberIncome(memberId, amount),
        ),
      );
      dispatch({ type: "saveSuccess" });
      setSaveError(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      dispatch({ type: "saveFailure" });
      setSaveError(message);
      return false;
    }
  }, [state.phase, state.overrideAmounts, state.sessionStartSnapshot]);

  return {
    phase: state.phase,
    overrideAmounts: state.overrideAmounts,
    shares,
    saveError,
    overrideIncome,
    saveSession,
    cancelSession,
  };
}
