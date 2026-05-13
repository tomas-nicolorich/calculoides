import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  contributions: { memberId: string; customAmount: number }[];
}

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  memberShares: { id: string; name: string; share: number }[];
}

export function SavingsGoalList({ goals, memberShares }: SavingsGoalListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Savings Goals</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => {
          const targetDate = new Date(goal.targetDate);
          const now = new Date();
          const monthsRemaining = Math.max(
            (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()),
            1
          );
          const totalMonthlyNeeded = goal.targetAmount / monthsRemaining;

          return (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle>{goal.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Target: €{goal.targetAmount.toLocaleString()} by {targetDate.toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Monthly Contributions</p>
                    {memberShares.map((member) => {
                      const override = goal.contributions.find((c) => c.memberId === member.id);
                      const amount = override ? override.customAmount : totalMonthlyNeeded * member.share;

                      return (
                        <div key={member.id} className="flex justify-between text-sm">
                          <span>{member.name} {override && <span className="text-xs text-primary">(Override)</span>}</span>
                          <span>€{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {goals.length === 0 && (
          <p className="text-muted-foreground col-span-full">No savings goals found.</p>
        )}
      </div>
    </div>
  );
}
