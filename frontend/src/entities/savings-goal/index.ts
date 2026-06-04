import type { User } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";

export interface ContributionBreakdown {
  memberId: string;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: User;
}

export interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}

export const savingsGoalApi = {
  list: (groupId: string) =>
    apiClient.fetch<SavingsGoal[]>(`/savings?groupId=${groupId}`),
  create: (
    groupId: string,
    data: {
      name: string;
      targetAmount: number;
      startingAmount?: number;
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
      targetAmount: number;
      startingAmount?: number;
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
