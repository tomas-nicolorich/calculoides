"use client";

import { useDashboardSummary, useCategoriesList } from "./queries";

/**
 * Lean placeholder rendering just enough of the Dashboard's first-paint data
 * to prove the hydration wiring (2.2, 2.4-2.6). Full widget porting
 * (`IncomeOverview`, `BudgetCategories`, etc. from
 * `frontend/src/pages/dashboard/ui/DashboardPage.tsx`) is out of this
 * phase's scope — Phase 2's Suggested Work Unit is "Dashboard Server
 * Component + hydration + GET refetch endpoints" only, matching the same
 * "lean new implementation" precedent as `AppShell` (1a.7).
 */
export function DashboardClient({ groupId }: { groupId: string }) {
  const { data: summary, isLoading: summaryLoading } =
    useDashboardSummary(groupId);
  const { data: categories, isLoading: categoriesLoading } =
    useCategoriesList(groupId);

  if (summaryLoading || categoriesLoading) {
    return <p data-testid="dashboard-loading">Loading…</p>;
  }

  return (
    <div data-testid="dashboard-client">
      <h1>{summary?.groupName}</h1>
      <ul>
        {categories?.map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </div>
  );
}
