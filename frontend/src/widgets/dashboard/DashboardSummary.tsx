import { calculateRoundedShares } from '../../../../shared/logic/rounding';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { cn } from '../../shared/lib/utils';

interface MemberSummary {
  id: string;
  name: string;
  income: number;
  share: number;
  spent: number;
  remainingQuota: number;
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  payerName: string;
}

interface DashboardSummaryProps {
  groupName: string;
  totalIncome: number;
  totalBudget: number;
  totalSpent: number;
  members: MemberSummary[];
  recentExpenses?: RecentExpense[];
}

export function DashboardSummary({
  groupName,
  totalIncome,
  totalBudget,
  totalSpent,
  members: rawMembers,
  recentExpenses = [],
}: DashboardSummaryProps) {
  const remainingBudget = totalBudget - totalSpent;

  // Use shared rounding logic for consistent share display (BUG-027)
  const roundedShares = calculateRoundedShares(rawMembers.map(m => ({ 
    id: m.id, 
    income: m.income 
  })));

  const members = rawMembers.map(m => {
    const rounded = roundedShares.find(s => s.id === m.id);
    return {
      ...m,
      share: rounded ? rounded.percentage : m.share
    };
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* ... previous cards ... */}
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

      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Member Quota Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Income: €{member.income.toLocaleString()} ({member.share}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Spent: €{member.spent.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-medium", member.remainingQuota < 0 ? "text-destructive" : "text-primary")}>
                    Quota: €{member.remainingQuota.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.categoryName} • {expense.payerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">
                      -€{expense.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent expenses.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
