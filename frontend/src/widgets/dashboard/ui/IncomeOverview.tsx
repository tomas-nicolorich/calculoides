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
    amount: formatCurrency(m.income),
  }));

  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(totalIncome)}
          tone="primary"
        />
        <MemberBar members={barMembers} legend emptyMessage="No members yet" />
      </div>
    </Card>
  );
}
