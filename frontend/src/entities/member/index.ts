export type { Member } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";
import type { Member } from "../../shared/api/types";

export const memberApi = {
  list: (groupId: string) =>
    apiClient.fetch<Member[]>(`/members?groupId=${groupId}`),
  updateIncome: (memberId: string, income: number) =>
    apiClient.fetch<Member>(`/members?id=${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ income }),
    }),
  remove: (groupId: string, memberId: string) =>
    apiClient.fetch<undefined>(`/members?id=${memberId}&groupId=${groupId}`, {
      method: "DELETE",
    }),
};
