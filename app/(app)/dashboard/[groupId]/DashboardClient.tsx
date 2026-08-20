"use client";

import { Avatar, AvatarGroup, ReloadButton } from "../../../_ui";
import { queryKeys } from "../../../../lib/query-keys";
import { useDashboardSummary } from "../../../_data/summary";
import { IncomeOverview } from "./_widgets/IncomeOverview";
import { RemainingBalance } from "./_widgets/RemainingBalance";
import { RecentExpenses } from "./_widgets/RecentExpenses";
import { BudgetTransfers } from "./_widgets/BudgetTransfers";
import { BudgetCategories } from "./_widgets/BudgetCategories";
import { QuickAddExpense } from "./_components/QuickAddExpense";

/**
 * ADR-0003 two-column dashboard shell (PR 12). Widget slots are all wired to
 * real data. Each slot owns its own loading boundary by self-subscribing to
 * the query it needs — there is no page-level `summaryLoading || …` early
 * return blocking the whole grid (spec: "Loading state precedes hydration").
 * The heading only reads `summary?.groupName`, so it degrades gracefully
 * (blank) while its own query is still loading, without gating the grid
 * below it. Savings goals live only on the dedicated `/savings` page, not
 * here.
 */
export function DashboardClient({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
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
            Shared budget
            {summary ? ` · ${String(summary.members.length)} members` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ReloadButton queryKey={queryKeys.group(groupId)} />
          {summary && summary.members.length > 0 && (
            <AvatarGroup max={3} size="sm">
              {summary.members.map((m, index) => (
                <Avatar key={m.id} size="sm" name={m.name} colorIndex={index} />
              ))}
            </AvatarGroup>
          )}
          <QuickAddExpense groupId={groupId} currentUserId={currentUserId} />
        </div>
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
          <BudgetCategories groupId={groupId} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
