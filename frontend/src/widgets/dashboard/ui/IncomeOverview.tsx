import { Card } from '../../../shared/ui/Card';
import { formatCurrency } from '../../../shared/api/dashboardUtils';

interface IncomeOverviewProps {
  totalIncome: number;
  members: {
    id: string;
    name: string;
    income: number;
    share: number;
  }[];
}

export function IncomeOverview({ totalIncome, members }: IncomeOverviewProps) {
  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Group Income</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {members.map((member, index) => (
            <div
              key={member.id}
              style={{ width: `${member.share.toString()}%` }}
              className={index === 0 ? "bg-brand-income" : index === 1 ? "bg-brand-balance" : "bg-brand-category"}
              title={`${member.name}: ${member.share.toString()}%`}
            />
          ))}
        </div>

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-300">{member.name}</span>
              <div className="text-right">
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(member.income)}
                </span>
                <span className="ml-2 text-slate-400">({member.share.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
