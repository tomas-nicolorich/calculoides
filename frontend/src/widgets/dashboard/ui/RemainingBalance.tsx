import { Card } from "../../../shared/ui/Card";
import { StatFigure } from "../../../shared/ui/money";
import { Avatar } from "../../../shared/ui/Avatar";
import { formatCurrency } from "../../../shared/api/dashboardUtils";

interface RemainingBalanceProps {
  totalRemaining: number;
  members: {
    id: string;
    name: string;
    income: number;
    spent: number;
    remainingQuota: number;
    budgeted: number;
    /**
     * Stable palette index (join order); same colour everywhere. Defaults to
     * array position when omitted, for back-compat with bare callers.
     */
    colorIndex?: number;
  }[];
}

export function RemainingBalance({
  totalRemaining,
  members,
}: RemainingBalanceProps) {
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
                  <Avatar
                    size="xs"
                    name={member.name}
                    colorIndex={member.colorIndex ?? i}
                  />
                  {member.name}
                </span>
                <span className="font-semibold text-brand-balance font-mono tnum">
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
