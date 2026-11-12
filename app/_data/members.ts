import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateIncome } from "../../lib/actions/member";
import { invalidateGroupQueries } from "./invalidate";
import { throwOnFailure } from "./throw-on-failure";

/**
 * Hoisted mutation hook (ADR-2). `IncomeOverview` is the first consumer of
 * `lib/actions/member.ts` `updateIncome` in the Next.js port; mirrors
 * `useCreateTransfer`'s (`transfers.ts`) `onSuccess` →
 * `invalidateGroupQueries` contract (client-data-cache: "Mutations
 * Invalidate Group-Scoped Queries by Key Prefix").
 */
export function useUpdateIncome(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: throwOnFailure(updateIncome),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
