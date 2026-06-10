import { Card } from "../../../shared/ui/Card";
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
  }[];
}

export function RemainingBalance({
  totalRemaining,
  members,
}: RemainingBalanceProps) {
  return (
    <Card title="Remaining Balance">
      <div className="space-y-6">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Group Remaining
          </div>
          <div className="text-3xl font-semibold tracking-tight text-brand-balance font-mono tnum">
            {formatCurrency(totalRemaining)}
          </div>
        </div>

        <div className="space-y-4">
          {members.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-sm">
              No members yet
            </p>
          )}
          {members.map((member) => (
            <div
              key={member.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">
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
