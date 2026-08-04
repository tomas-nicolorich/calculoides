import { apiClient } from "../../shared/api/client";
import type { CategoryWithBalances } from "../../../../shared/src/types/redesign";

interface CategoryInput {
  name: string;
  monthlyBudget: number;
  icon: string;
  memberIds?: string[];
}

export const categoryApi = {
  create: (groupId: string, input: CategoryInput) =>
    apiClient.fetch<CategoryWithBalances>(
      `/transactions?action=category-create&groupId=${groupId}`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  update: (id: string, input: CategoryInput) =>
    apiClient.fetch<CategoryWithBalances>(
      `/transactions?action=category-update&id=${id}`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  delete: (id: string) =>
    apiClient.fetch<undefined>(
      `/transactions?action=category-delete&id=${id}`,
      {
        method: "DELETE",
      },
    ),
  /** `signal` is additive — unused until a future read-hook migration. */
  list: (groupId: string, signal?: AbortSignal) =>
    apiClient.fetch<CategoryWithBalances[]>(`/categories?groupId=${groupId}`, {
      signal,
    }),
};
