import { Card, Skeleton } from "../../../_ui";

/**
 * Shared skeleton module (design.md: "one skeleton module is the single
 * source of truth for a segment"). No `"use client"` — consumed by both
 * server `loading.tsx` files (Slice A) and client widget `isLoading`
 * branches (Slice A widget conversion + Slice B `<Suspense>` fallbacks), so
 * the hand-off between all three renders pixel-identical markup.
 */

/**
 * `IncomeOverview`'s populated state renders its own custom header (title +
 * edit button) rather than `Card`'s `title` prop, so this skeleton mirrors
 * that same header shape instead of `Card`'s built-in heading, keeping
 * "Income Overview" visible immediately — same widget-independent-loading
 * contract `RemainingBalance`/`RecentExpenses`/`BudgetTransfers`/
 * `BudgetCategories` establish via `Card`'s `title` prop below.
 */
export function IncomeOverviewSkeleton() {
  return (
    <Card data-testid="income-overview-skeleton">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Income Overview
          </h3>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-full" />
      </div>
    </Card>
  );
}

export function RemainingBalanceSkeleton() {
  return (
    <Card title="Remaining Balance" data-testid="remaining-balance-skeleton">
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

export function RecentExpensesSkeleton() {
  return (
    <Card title="Recent Expenses" data-testid="recent-expenses-skeleton">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

export function BudgetTransfersSkeleton() {
  return (
    <Card title="Budget Transfers" data-testid="budget-transfers-skeleton">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

export function BudgetCategoriesSkeleton() {
  return (
    <Card title="Budget Categories" data-testid="budget-categories-skeleton">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </Card>
  );
}

/** The four left-column widget skeletons, in `DashboardClient`'s order. */
export function SummaryColumnSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 3xl:col-span-2 3xl:grid 3xl:grid-cols-2"
      data-testid="dashboard-skeleton-left"
    >
      <IncomeOverviewSkeleton />
      <RemainingBalanceSkeleton />
      <RecentExpensesSkeleton />
      <BudgetTransfersSkeleton />
    </div>
  );
}

/** The right-column wrapper around `BudgetCategoriesSkeleton`. */
export function CategoriesColumnSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-skeleton-right">
      <BudgetCategoriesSkeleton />
    </div>
  );
}

/**
 * MUST reproduce `DashboardClient`'s exact container chain — `p-4 md:p-8
 * max-w-7xl mx-auto space-y-8` -> `grid grid-cols-1 lg:grid-cols-2
 * 3xl:grid-cols-3 gap-6 items-start` -> left/right columns — so the
 * `loading.tsx` -> shell -> region hand-offs cause no layout shift
 * (ADR-0003, ADR-0007). The header row (title + reload/avatar affordances)
 * is intentionally omitted: `DashboardClient`'s heading degrades to blank
 * while `summary` is loading rather than reserving skeleton space for it.
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div
        className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-6 items-start"
        data-testid="dashboard-skeleton-grid"
      >
        <SummaryColumnSkeleton />
        <CategoriesColumnSkeleton />
      </div>
    </div>
  );
}
