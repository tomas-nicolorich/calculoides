import { apiClient } from "../../shared/api/client";

export const transferApi = {
  create: (
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ) =>
    apiClient.fetch<undefined>("/transactions?action=transfer-create", {
      method: "POST",
      body: JSON.stringify({ categoryId, fromMemberId, toMemberId, amount }),
    }),
  delete: (id: string) =>
    apiClient.fetch<undefined>(`/transactions/${id}?type=transfer`, {
      method: "DELETE",
    }),
  deleteAll: (groupId: string) =>
    apiClient.fetch<undefined>(`/transfers?groupId=${groupId}`, {
      method: "DELETE",
    }),
};
