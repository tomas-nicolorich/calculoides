import { notFound } from "next/navigation";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { SummaryService } from "../../../../lib/server/services/summary";
import { BudgetService } from "../../../../lib/server/services/budget";
import { createQueryClient } from "../../../../frontend/src/shared/api/queryClient";
import { queryKeys } from "../../../../frontend/src/shared/api/queryKeys";
import { DashboardClient } from "./DashboardClient";

/**
 * Server Component for the Dashboard read path (2.1). Fetches first-paint
 * `summary`/`categories-list` data directly against
 * `lib/server/services/{summary,budget}` — no HTTP hop — then dehydrates
 * into the *same* TanStack Query keys `useDashboardSummary`/
 * `useCategoriesList` use, so client navigation back to this route is a
 * cache hit within the staleness window (2.2, 2.4-2.6; client-data-cache:
 * "Server-Component-served read has no query key").
 *
 * resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" — `SummaryService`/`BudgetService` perform NO authz check
 * themselves (see their doc comments), so this Server Component is the
 * caller responsible for verifying membership before touching group data,
 * the same non-negotiable the Route Handlers below carry (2.7-2.8).
 * `app/(app)/layout.tsx` already guarantees a verified session; `notFound()`
 * hides both "doesn't exist" and "not a member" behind one response, the
 * standard Next.js pattern for not leaking a resource's existence to a
 * non-member.
 */
export default async function DashboardPage({
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

  const queryClient: QueryClient = createQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.summary(groupId),
      queryFn: () => SummaryService.getGroupSummary(groupId),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories(groupId),
      queryFn: () => BudgetService.listCategoriesWithBalances(groupId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient groupId={groupId} />
    </HydrationBoundary>
  );
}
