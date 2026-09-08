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

function BudgetCategoryRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 p-4"
      data-testid="budget-categories-skeleton-row"
    >
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
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
        <div className="flex flex-col gap-2">
          <BudgetCategoryRowSkeleton />
          <BudgetCategoryRowSkeleton />
          <BudgetCategoryRowSkeleton />
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
 * max-w-7xl mx-auto space-y-8` -> header -> `grid grid-cols-1 lg:grid-cols-2
 * 3xl:grid-cols-3 gap-6 items-start` -> left/right columns — so the
 * `loading.tsx` -> shell -> region hand-offs cause no layout shift
 * (ADR-0003, ADR-0007). The header row mirrors `DashboardClient`'s title +
 * subtitle + avatar-group + "Add Expense" button shape (`Avatar` `sm` is
 * `h-[34px] w-[34px]`, `Button` `md` is `h-9`) instead of leaving that space
 * blank while `summary` is loading.
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header
        className="flex flex-wrap items-start justify-between gap-4"
        data-testid="dashboard-skeleton-header"
      >
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-[34px] w-[34px] rounded-full" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </header>
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
