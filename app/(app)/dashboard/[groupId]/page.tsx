import { Suspense } from "react";
import { requireGroupMember } from "../../../../lib/server/authz";
import { SummaryService } from "../../../../lib/server/services/summary";
import { BudgetService } from "../../../../lib/server/services/budget";
import { SavingsService } from "../../../../lib/server/services/savings";
import { DashboardSkeleton, CategoriesColumnSkeleton } from "./_skeletons";
import { SummaryRegion, CategoriesRegion, SavingsWarmRegion } from "./_regions";

/**
 * Server Component for the Dashboard read path (2.1, restructured for
 * design.md Decision 4/Slice B). Only the auth gate stays blocking here —
 * `params` → `createClient` → `getUser` → `isGroupMember`. The three
 * service calls below are started in the same tick (same parallel-start
 * guarantee the prior `Promise.all` gave) but deliberately NOT awaited:
 * each is handed to its own independently streamed `<Suspense>` region,
 * which awaits only its own promise, `prefetchQuery`s it into the *same*
 * TanStack Query keys `useDashboardSummary`/`useCategoriesList` use, and
 * `dehydrate`s its own ephemeral `QueryClient` (client-data-cache:
 * "Server-Component-served read has no query key"). `void p.catch(() => undefined)`
 * marks each promise handled so an eventual rejection doesn't surface as an
 * unhandled-rejection warning before the owning region's own
 * `prefetchQuery` observes it.
 *
 * `CategoriesRegion` is nested *inside* `SummaryRegion`'s `children`, not a
 * sibling — `queryKeys.summary` must already be hydrated before it mounts,
 * because `QuickAddExpense` (rendered by `SummaryRegion`'s `DashboardClient`)
 * and `BudgetCategories` (rendered by `CategoriesRegion`) both cross-read
 * `summary`/`categories` (client-data-cache: "A Streamed Region's Hydration
 * Boundary Must Cover or Nest Below Every Key Its Subtree Reads"). The
 * `savingsGoals` warm-up region is a true sibling with `fallback={null}`:
 * no dashboard widget consumes it, so it can never justify blocking first
 * paint (Decision 3).
 *
 * resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" — `SummaryService`/`BudgetService`/`SavingsService` perform NO
 * authz check themselves (see their doc comments), so this Server Component
 * is the caller responsible for verifying membership before touching group
 * data, the same non-negotiable the Route Handlers below carry (2.7-2.8).
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

  const { userId } = await requireGroupMember(groupId);

  const summaryPromise = SummaryService.getGroupSummary(groupId);
  void summaryPromise.catch(() => undefined);

  const categoriesPromise = BudgetService.listCategoriesWithBalances(groupId);
  void categoriesPromise.catch(() => undefined);

  const savingsPromise = SavingsService.getGoalsForGroup(groupId);
  void savingsPromise.catch(() => undefined);

  return (
    <>
      <Suspense fallback={<DashboardSkeleton />}>
        <SummaryRegion
          groupId={groupId}
          currentUserId={userId}
          summaryPromise={summaryPromise}
        >
          <Suspense fallback={<CategoriesColumnSkeleton />}>
            <CategoriesRegion
              groupId={groupId}
              currentUserId={userId}
              categoriesPromise={categoriesPromise}
            />
          </Suspense>
        </SummaryRegion>
      </Suspense>
      <Suspense fallback={null}>
        <SavingsWarmRegion groupId={groupId} savingsPromise={savingsPromise} />
      </Suspense>
    </>
  );
}
