import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';

interface MemberSummary {
  id: string;
  name: string;
  income: number;
  share: number;
  remainingQuota: number;
}

interface DashboardSummaryProps {
  groupName: string;
  totalIncome: number;
  totalBudget: number;
  totalSpent: number;
  members: MemberSummary[];
}

export function DashboardSummary({
  groupName,
  totalIncome,
  totalBudget,
  totalSpent,
  members,
}: DashboardSummaryProps) {
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Group Total Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{totalIncome.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Combined monthly income for {groupName}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{totalBudget.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total of all category budgets</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{totalSpent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {((totalSpent / totalBudget) * 100 || 0).toFixed(1)}% of total budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", remainingBudget < 0 ? "text-destructive" : "text-primary")}>
            €{remainingBudget.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Overall remaining quota</p>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Member Quota Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Income: €{member.income.toLocaleString()} ({member.share}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-medium", member.remainingQuota < 0 ? "text-destructive" : "")}>
                    Remaining: €{member.remainingQuota.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
