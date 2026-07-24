import { apiClient } from "../../shared/api/client";

export const transferApi = {
  delete: (id: string) =>
    apiClient.fetch<undefined>(`/transactions/${id}?type=transfer`, {
      method: "DELETE",
    }),
  deleteAll: (groupId: string) =>
    apiClient.fetch<undefined>(`/transfers?groupId=${groupId}`, {
      method: "DELETE",
    }),
};
