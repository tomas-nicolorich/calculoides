"use client";

import { Avatar, Card } from "../../../../_ui";
import { StatFigure } from "../../../../_ui/money";
import { formatCurrency } from "../../../../../lib/format-currency";
import { useDashboardSummary } from "../../../../_data/summary";

/**
 * Ported verbatim from `main`'s
 * `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx` markup. The only
 * seam change is the data source: `main` received `totalRemaining`/`members`
 * as props computed once in `DashboardPage`; this port self-subscribes to
 * the hydrated `queryKeys.summary` cache instead (spec: "One Server
 * Prefetch Feeds the Summary-Dependent Widgets" — no per-widget waterfall
 * as long as the Server Component already prefetched `summary`).
 */
export function RemainingBalance({ groupId }: { groupId: string }) {
  const { data: summary, isLoading, isError } = useDashboardSummary(groupId);

  if (isLoading) {
    return (
      <Card title="Remaining Balance" data-testid="remaining-balance-loading">
        <p className="text-sm text-slate-400">Loading…</p>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card title="Remaining Balance">
        <p className="text-sm text-brand-expense">
          Failed to load remaining balance.
        </p>
      </Card>
    );
  }

  const totalRemaining = summary.totalIncome - summary.totalBudget;
  const members = summary.members;

  return (
    <Card title="Remaining Balance">
      <div className="space-y-6">
        <StatFigure
          label="Total Group Remaining"
          value={formatCurrency(totalRemaining)}
          tone="primary"
        />

        <div className="space-y-4">
          {members.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-sm">
              No members yet
            </p>
          )}
          {members.map((member, i) => (
            <div
              key={member.id}
              className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Avatar size="xs" name={member.name} colorIndex={i} />
                  {member.name}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono tnum">
                  {formatCurrency(member.income - member.budgeted)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Income:{" "}
                  <span className="font-mono tnum">
                    {formatCurrency(member.income)}
                  </span>
                </div>
                <div className="text-right">
                  Budgeted:{" "}
                  <span className="font-mono tnum">
                    {formatCurrency(member.budgeted)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
