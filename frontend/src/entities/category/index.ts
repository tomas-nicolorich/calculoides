import type { User } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";

export interface CategoryBalance {
  memberId: string;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
  share: number;
  percentage: number;
  user?: User;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  monthlyBudget: number;
  totalSpent: number;
  balances: CategoryBalance[];
}

export const categoryApi = {
  list: (groupId: string) =>
    apiClient.fetch<Category[]>(`/categories?groupId=${groupId}`),
  create: (
    groupId: string,
    data: {
      name: string;
      monthlyBudget: number;
      icon?: string;
      memberIds?: string[];
    },
  ) =>
    apiClient.fetch<Category>(`/categories?groupId=${groupId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
