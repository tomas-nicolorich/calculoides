import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import type { SummaryService } from "../../../../lib/server/services/summary";
import type { BudgetService } from "../../../../lib/server/services/budget";
import type { SavingsService } from "../../../../lib/server/services/savings";
import { createQueryClient } from "../../../../lib/query-client";
import { queryKeys } from "../../../../lib/query-keys";
import { DashboardClient } from "./DashboardClient";
import { BudgetCategories } from "./_widgets/BudgetCategories";

/**
 * Independently streamed dashboard regions (design.md Decision 4). `page.tsx`
 * starts all three service calls in the same tick without awaiting; each
 * region below is itself `async`, awaits only its own hoisted promise, and
 * owns an ephemeral `createQueryClient()` -> `prefetchQuery` -> `dehydrate`
 * -> `HydrationBoundary` cycle for its own query key. `CategoriesRegion` is
 * nested strictly inside `SummaryRegion` (its `children`), not a sibling, so
 * `queryKeys.summary` is guaranteed hydrated before `BudgetCategories`/
 * `QuickAddExpense` — both cross-reading consumers — mount
 * (client-data-cache: "A Streamed Region's Hydration Boundary Must Cover or
 * Nest Below Every Key Its Subtree Reads").
 */

/** Wraps `DashboardClient`; `children` is the nested `<Suspense>` subtree
 * (`CategoriesRegion`) `page.tsx` passes down through this region. */
export async function SummaryRegion({
  groupId,
  currentUserId,
  summaryPromise,
  children,
}: {
  groupId: string;
  currentUserId: string;
  summaryPromise: Promise<
    Awaited<ReturnType<typeof SummaryService.getGroupSummary>>
  >;
  children: ReactNode;
}) {
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.summary(groupId),
    queryFn: () => summaryPromise,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient groupId={groupId} currentUserId={currentUserId}>
        {children}
      </DashboardClient>
    </HydrationBoundary>
  );
}

/** The right-column region. `currentUserId` is forwarded to `BudgetCategories`
 * for its owner-only delete affordance — the same prop `DashboardClient`
 * used to pass it directly before this region existed. Renders the same
 * `flex flex-col gap-6` wrapper `CategoriesColumnSkeleton` uses, so the
 * `<Suspense>` fallback -> resolved-content hand-off causes no layout shift. */
export async function CategoriesRegion({
  groupId,
  currentUserId,
  categoriesPromise,
}: {
  groupId: string;
  currentUserId: string;
  categoriesPromise: Promise<
    Awaited<ReturnType<typeof BudgetService.listCategoriesWithBalances>>
  >;
}) {
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.categories(groupId),
    queryFn: () => categoriesPromise,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-6">
        <BudgetCategories groupId={groupId} currentUserId={currentUserId} />
      </div>
    </HydrationBoundary>
  );
}

/**
 * Decision 3 — an invisible, non-blocking cross-route cache warm-up: no
 * dashboard widget consumes `savingsGoals` (only `/savings`'s
 * `SavingsClient` does), so this region dehydrates the key for that later
 * navigation without ever rendering anything or blocking first paint.
 */
export async function SavingsWarmRegion({
  groupId,
  savingsPromise,
}: {
  groupId: string;
  savingsPromise: Promise<
    Awaited<ReturnType<typeof SavingsService.getGoalsForGroup>>
  >;
}) {
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.savingsGoals(groupId),
    queryFn: () => savingsPromise,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>{null}</HydrationBoundary>
  );
}
