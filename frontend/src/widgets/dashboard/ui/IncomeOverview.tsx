import { Card } from "../../../shared/ui/Card";
import { StatFigure, MemberBar } from "../../../shared/ui/money";
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

export function IncomeOverview({ totalIncome, members }: IncomeOverviewProps) {
  const barMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    share: m.share,
    amount: formatCurrency(m.income),
  }));

  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(totalIncome)}
          tone="income"
        />
        <MemberBar members={barMembers} emptyMessage="No members yet" />
      </div>
    </Card>
  );
}
