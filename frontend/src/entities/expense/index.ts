import type { User } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer: { user: User };
}

export const expenseApi = {
  list: (groupId: string, categoryId?: string) =>
    apiClient.fetch<{ expenses: Expense[] }>(
      `/expenses?groupId=${groupId}${categoryId ? `&categoryId=${categoryId}` : ""}`,
    ),
  log: (data: {
    categoryId: string;
    description: string;
    amount: number;
    date?: string;
    payerId?: string;
  }) =>
    apiClient.fetch<undefined>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiClient.fetch<undefined>(`/transactions/${id}`, { method: "DELETE" }),
};
