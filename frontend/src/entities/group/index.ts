import type { Member, Summary } from "../../shared/api/types";
import { apiClient } from "../../shared/api/client";

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
  role: "OWNER" | "MEMBER";
}

interface Invitation {
  id: string;
  token: string;
  groupId: string;
  group: { name: string };
  inviter: { name: string | null; email: string };
  status: string;
}

export const groupApi = {
  list: () => apiClient.fetch<Group[]>("/groups"),
  create: (name: string) =>
    apiClient.fetch<Group>("/groups", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getById: (id: string) => apiClient.fetch<Group>(`/groups?id=${id}`),
  getSummary: (groupId: string) =>
    apiClient.fetch<Summary>(`/summary?groupId=${groupId}`),
  updateMemberIncome: (memberId: string, income: number) =>
    apiClient.fetch<Member>(`/members/${memberId}/income`, {
      method: "PUT",
      body: JSON.stringify({ income }),
    }),
  transferOwnership: (groupId: string, newOwnerId: string) =>
    apiClient.fetch<undefined>(`/transfer-ownership?groupId=${groupId}`, {
      method: "POST",
      body: JSON.stringify({ newOwnerId }),
    }),
  invitations: {
    list: () => apiClient.fetch<Invitation[]>("/invitations"),
    create: (groupId: string, email: string) =>
      apiClient.fetch<Invitation>(`/invitations?groupId=${groupId}`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    respond: (token: string, action: "ACCEPT" | "REJECT") =>
      apiClient.fetch<undefined>("/respond-invitation", {
        method: "POST",
        body: JSON.stringify({ token, action }),
      }),
  },
  archive: {
    archiveMonth: (groupId: string, periodMonth: string) =>
      apiClient.fetch<{ periodMonth: string }>("/archive", {
        method: "POST",
        body: JSON.stringify({ groupId, periodMonth }),
      }),
    undoArchive: (groupId: string, periodMonth: string) =>
      apiClient.fetch<{ success: boolean }>("/undo-archive", {
        method: "POST",
        body: JSON.stringify({ groupId, periodMonth }),
      }),
  },
};
