import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { SavingsService } from "../../../../lib/server/services/savings";
import { createQueryClient } from "../../../../lib/query-client";
import { queryKeys } from "../../../../lib/query-keys";
import { SavingsClient } from "./SavingsClient";

/**
 * Server Component for the Savings route (double-skeleton fix). Prefetches
 * `queryKeys.savingsGoals(groupId)` — the exact key `useSavingsGoalsList`
 * reads — via the same `SavingsService.getGoalsForGroup` call
 * `app/api/savings/route.ts` and `app/(app)/dashboard/[groupId]/_regions.tsx`'s
 * `SavingsWarmRegion` already use, then hands it to the client via
 * `HydrationBoundary`. `await`ing the prefetch keeps `loading.tsx` as the
 * only skeleton shown on a direct navigation here, same rationale as the
 * Expenses/Transfers routes — a prior Dashboard visit already warms this key
 * via `SavingsWarmRegion`, but a direct link to `/savings` has no such
 * warm-up to rely on. Same membership-gate precedent as
 * `app/(app)/expenses/[groupId]/page.tsx` /
 * `app/(app)/transfers/[groupId]/page.tsx`.
 */
export default async function SavingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const isMember = await isGroupMember(user.id, groupId);
  if (!isMember) {
    notFound();
  }

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.savingsGoals(groupId),
    queryFn: () => SavingsService.getGoalsForGroup(groupId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SavingsClient groupId={groupId} />
    </HydrationBoundary>
  );
}
