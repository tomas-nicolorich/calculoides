"use client";

import { useDashboardSummary } from "../../../_data/summary";
import { IncomeOverview } from "./_widgets/IncomeOverview";
import { RemainingBalance } from "./_widgets/RemainingBalance";
import { RecentExpenses } from "./_widgets/RecentExpenses";
import { BudgetTransfers } from "./_widgets/BudgetTransfers";
import { BudgetCategories } from "./_widgets/BudgetCategories";
import { SavingsGoalList } from "./_widgets/SavingsGoalList";
import { QuickAddExpense } from "./_components/QuickAddExpense";

/**
 * ADR-0003 two-column dashboard shell (PR 12). Six named widget slots — all
 * wired to real data as of PR 16 (`SavingsGoalList` replaces the
 * `WidgetStub` placeholder that held its place through PR 12-15). Each slot
 * owns its own loading boundary by self-subscribing to the query it needs —
 * there is no page-level `summaryLoading || …` early return blocking the
 * whole grid (spec: "Loading state precedes hydration"). The heading only
 * reads `summary?.groupName`, so it degrades gracefully (blank) while its
 * own query is still loading, without gating the grid below it.
 */
export function DashboardClient({ groupId }: { groupId: string }) {
  const { data: summary } = useDashboardSummary(groupId);

  return (
    <div
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
      data-testid="dashboard-client"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            {summary?.groupName}
          </h1>
          <p className="text-slate-500">
            Shared budget · {summary?.members.length ?? 0} members
          </p>
        </div>
        <QuickAddExpense groupId={groupId} />
      </header>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-6 items-start"
        data-testid="dashboard-grid"
      >
        <div className="flex flex-col gap-6 3xl:col-span-2 3xl:grid 3xl:grid-cols-2">
          <IncomeOverview groupId={groupId} />
          <RemainingBalance groupId={groupId} />
          <RecentExpenses groupId={groupId} />
          <BudgetTransfers groupId={groupId} />
        </div>

        <div className="flex flex-col gap-6">
          <BudgetCategories groupId={groupId} />
          <SavingsGoalList groupId={groupId} />
        </div>
      </div>
    </div>
  );
}
