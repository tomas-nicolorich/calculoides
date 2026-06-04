import { apiClient } from "../../shared/api/client";

export const transferApi = {
  create: (data: {
    categoryId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
  }) =>
    apiClient.fetch<undefined>("/transfers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
