import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requireGroupMember } from "../../../../lib/server/authz";
import { TransferService } from "../../../../lib/server/services/transfer";
import { createQueryClient } from "../../../../lib/query-client";
import { queryKeys } from "../../../../lib/query-keys";
import { TransfersClient } from "./TransfersClient";

/** Mirrors `TransfersClient`'s default (no-filter) call to `useTransfersList`
 * (`categoryId`/`memberId` `undefined`, `limit: PAGE_SIZE`, `offset: 0`) —
 * must stay in sync with `TransfersClient.PAGE_SIZE` (25) so this prefetch's
 * query key is an exact hit for the client hook's first render. */
const PAGE_SIZE = 25;

/**
 * Server Component for the Transfers route (double-skeleton fix). Prefetches
 * the exact same TanStack Query key `useTransfersList`'s default (no-filter)
 * call reads, then hands it to the client via `HydrationBoundary` — same
 * pattern as `app/(app)/expenses/[groupId]/page.tsx`.
 * `TransferService.listTransfers` already returns the fully-mapped wire
 * shape (unlike `ExpenseService.listExpenses`), matching
 * `app/api/transfers/route.ts`'s own precedent of doing no extra mapping, so
 * the prefetch below calls it directly with no reshaping. `await`ing the
 * prefetch keeps `loading.tsx` as the only skeleton shown, same rationale as
 * the Expenses route. Same membership-gate precedent as
 * `app/(app)/expenses/[groupId]/page.tsx`.
 */
export default async function TransfersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  await requireGroupMember(groupId);

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.transfers(groupId, { limit: PAGE_SIZE, offset: 0 }),
    queryFn: async () => {
      const { transfers, total } = await TransferService.listTransfers(
        groupId,
        undefined,
        undefined,
        PAGE_SIZE,
        0,
      );
      return {
        transfers,
        pagination: { total, limit: PAGE_SIZE, offset: 0 },
      };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransfersClient groupId={groupId} />
    </HydrationBoundary>
  );
}
