"use client";

import { Card } from "../../../_ui";
import { useDashboardSummary } from "../../../_data/summary";
import { IncomeOverview } from "./_widgets/IncomeOverview";
import { RemainingBalance } from "./_widgets/RemainingBalance";
import { RecentExpenses } from "./_widgets/RecentExpenses";
import { BudgetTransfers } from "./_widgets/BudgetTransfers";
import { BudgetCategories } from "./_widgets/BudgetCategories";

/**
 * ADR-0003 two-column dashboard shell (PR 12). Six named widget slots;
 * `IncomeOverview`, `RemainingBalance`, `RecentExpenses`, `BudgetTransfers`,
 * and `BudgetCategories` (PR 14, read-only accordion — mutations land in
 * PR 15) are wired to real data — `SavingsGoalList` still renders as a
 * `WidgetStub` placeholder until PR 16 lands. Each slot owns its own loading
 * boundary by self-subscribing to the query it needs — there is no
 * page-level `summaryLoading || …` early return blocking the whole grid
 * (spec: "Loading state precedes hydration"). The heading only reads
 * `summary?.groupName`, so it degrades gracefully (blank) while its own
 * query is still loading, without gating the grid below it.
 */
export function DashboardClient({ groupId }: { groupId: string }) {
  const { data: summary } = useDashboardSummary(groupId);

  return (
    <div
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
      data-testid="dashboard-client"
    >
      <header>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {summary?.groupName}
        </h1>
        <p className="text-slate-500">
          Shared budget · {summary?.members.length ?? 0} members
        </p>
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
          <WidgetStub title="Savings Goals" />
        </div>
      </div>
    </div>
  );
}

/** Placeholder for a widget slot not yet wired (PR 16). Renders as a
 * clean, static `Card` — never a broken layout or an error. */
function WidgetStub({ title }: { title: string }) {
  return (
    <Card title={title}>
      <p className="text-sm text-slate-400">Coming soon.</p>
    </Card>
  );
}
