import type { User } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";

export interface ContributionBreakdown {
  memberId: string;
  share: number;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: User;
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
  breakdown: ContributionBreakdown[];
}

export type ContributionSessionPhase = "idle" | "editing" | "saving";

export type SessionStartSnapshot = Record<string, number>;

export type PreResetSnapshot = Record<string, number> | null;

export interface ContributionSessionState {
  phase: ContributionSessionPhase;
  overrideAmounts: Record<string, number>;
  sessionStartSnapshot: SessionStartSnapshot;
  preResetSnapshot: PreResetSnapshot;
  localProjectedMonths: number | null;
}

export type ContributionSessionAction =
  | { type: "sessionStart"; snapshot: SessionStartSnapshot }
  | { type: "overrideAmount"; memberId: string; amount: number }
  | { type: "resetToIncomeSplit" }
  | { type: "undoReset" }
  | { type: "saveStart" }
  | { type: "saveSuccess" }
  | { type: "saveFailure"; error: string }
  | { type: "cancelSession" };

export const savingsGoalApi = {
  list: (groupId: string) =>
    apiClient.fetch<SavingsGoal[]>(`/savings?groupId=${groupId}`),
  create: (
    groupId: string,
    data: {
      name: string;
      icon?: string | null;
      targetAmount: number;
      currentAmount?: number;
      targetDate: string;
    },
  ) =>
    apiClient.fetch<SavingsGoal>(`/savings?groupId=${groupId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    goalId: string,
    data: {
      name: string;
      icon?: string | null;
      targetAmount: number;
      currentAmount?: number;
      targetDate: string;
    },
  ) =>
    apiClient.fetch<SavingsGoal>(`/savings?goalId=${goalId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  upsertContribution: (goalId: string, memberId: string, amount: number) =>
    apiClient.fetch<undefined>(
      `/savings/contribution?goalId=${goalId}&memberId=${memberId}`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      },
    ),
  delete: (goalId: string) =>
    apiClient.fetch<undefined>(`/savings?goalId=${goalId}`, {
      method: "DELETE",
    }),
};
