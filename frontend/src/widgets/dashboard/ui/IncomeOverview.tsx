import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";

interface IncomeOverviewProps {
  totalIncome: number;
  members: {
    id: string;
    name: string;
    income: number;
    share: number;
  }[];
}

const MEMBER_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export function IncomeOverview({ totalIncome, members }: IncomeOverviewProps) {
  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Group Income
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-mono tnum">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        {/* Stacked Bar Chart with clean border separators to prevent visual merging */}
        <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
          {members.map((member, index) => {
            const colorClass = MEMBER_COLORS[index % MEMBER_COLORS.length];
            return (
              <div
                key={member.id}
                style={{ width: `${member.share.toString()}%` }}
                className={`${colorClass} h-full border-r border-white dark:border-slate-900`}
                title={`${member.name}: ${member.share.toString()}%`}
                data-testid={`bar-segment-${index.toString()}`}
              />
            );
          })}
        </div>

        {/* Members Breakdown with circular color indicators acting as a legend key */}
        <div className="space-y-3">
          {members.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-sm">
              No members yet
            </p>
          )}
          {members.map((member, index) => {
            const colorClass = MEMBER_COLORS[index % MEMBER_COLORS.length];
            return (
              <div
                key={member.id}
                className="flex justify-between items-center text-sm"
                data-testid={`member-row-${index.toString()}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`}
                    aria-hidden="true"
                    data-testid={`color-indicator-${index.toString()}`}
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {member.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 dark:text-white font-mono tnum">
                    {formatCurrency(member.income)}
                  </span>
                  <span className="ml-2 text-slate-400 font-mono tnum">
                    ({member.share.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
