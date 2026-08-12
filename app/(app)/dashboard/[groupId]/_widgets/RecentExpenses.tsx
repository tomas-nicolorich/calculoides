"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { Avatar, Card } from "../../../../_ui";
import { formatCurrency } from "../../../../../lib/format-currency";
import { useDashboardSummary } from "../../../../_data/summary";

/**
 * Ported verbatim from `main`'s
 * `frontend/src/widgets/dashboard/ui/RecentExpenses.tsx` markup. The data
 * seam changes the same way `RemainingBalance` does: `main` received
 * `expenses`/`members` as external props, this port self-subscribes to the
 * hydrated `queryKeys.summary` cache (`SummaryService.getGroupSummary`
 * already returns `recentExpenses`, per the target-seam inventory) and
 * reads only the top 5 read-only — the `ExpenseForm` quick-add half of the
 * "Recent Expenses and Quick-Add Share the Same Invalidation Contract"
 * requirement is PR 16's scope. The unused `categories` prop `main`'s
 * component declared but never rendered is dropped, not ported — a `main`
 * dead field, not a data-seam deviation.
 */
export function RecentExpenses({ groupId }: { groupId: string }) {
  const { data: summary, isLoading, isError } = useDashboardSummary(groupId);

  if (isLoading) {
    return (
      <Card title="Recent Expenses" data-testid="recent-expenses-loading">
        <p className="text-sm text-slate-400">Loading…</p>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card title="Recent Expenses">
        <p className="text-sm text-brand-expense">
          Failed to load recent expenses.
        </p>
      </Card>
    );
  }

  const { recentExpenses: expenses, members } = summary;

  return (
    <Card title="Recent Expenses">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">Latest 5 spends</div>
          <Link
            href={`/expenses/${groupId}`}
            className="text-sm font-medium text-brand-balance hover:underline"
          >
            View All
          </Link>
        </div>

        <div>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No recent expenses
            </div>
          ) : (
            expenses.map((expense, index) => {
              const payerIndex = members.findIndex(
                (m) => m.id === expense.payerId,
              );
              const payer = payerIndex === -1 ? undefined : members[payerIndex];
              const payerFirstName = (payer?.name ?? expense.payerName).split(
                " ",
              )[0];
              return (
                <div
                  key={expense.id}
                  className={`flex items-center gap-4 rounded-lg px-3 py-2 ${
                    index % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/40" : ""
                  }`}
                >
                  <span
                    className="grid place-items-center size-9 shrink-0 rounded-lg bg-brand-expense/10 text-brand-expense"
                    data-testid="expense-marker"
                  >
                    <Receipt size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {expense.description}
                    </p>
                    <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 min-w-0">
                      <Avatar
                        size="xs"
                        name={payer?.name ?? expense.payerName}
                        colorIndex={payerIndex === -1 ? 0 : payerIndex}
                      />
                      <span>{payerFirstName}</span>
                      <span>·</span>
                      <span className="truncate">{expense.categoryName}</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-expense font-mono tnum shrink-0">
                    -{formatCurrency(expense.amount)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
