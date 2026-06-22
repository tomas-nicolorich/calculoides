import { Card } from "../../../shared/ui/Card";
import { StatFigure, MemberBar } from "../../../shared/ui/money";
import { Avatar } from "../../../shared/ui/Avatar";
import { formatCurrency } from "../../../shared/api/dashboardUtils";

interface IncomeOverviewProps {
  totalIncome: number;
  members: {
    id: string;
    name: string;
    income: number;
    share: number;
    /**
     * Stable palette index (join order); same colour everywhere. Defaults to
     * array position when omitted, for back-compat with bare callers.
     */
    colorIndex?: number;
  }[];
}

export function IncomeOverview({ totalIncome, members }: IncomeOverviewProps) {
  const withIndex = members.map((m, i) => ({
    ...m,
    colorIndex: m.colorIndex ?? i,
  }));
  const barMembers = withIndex.map((m) => ({
    id: m.id,
    name: m.name,
    share: m.share,
    colorIndex: m.colorIndex,
  }));

  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(totalIncome)}
          tone="income"
        />
        <MemberBar
          members={barMembers}
          legend={false}
          emptyMessage="No members yet"
        />
        {withIndex.length > 0 && (
          <div className="flex flex-col gap-3">
            {withIndex.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                  <Avatar size="xs" name={m.name} colorIndex={m.colorIndex} />
                  {m.name}
                </span>
                <span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(m.income)}
                  </span>
                  <span className="ml-2 font-mono text-slate-400 dark:text-slate-500">
                    ({m.share}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
