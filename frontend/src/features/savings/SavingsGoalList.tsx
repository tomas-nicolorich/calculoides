import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, UserDisplay } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface ContributionBreakdown {
  memberId: string;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: {
    name: string | null;
    email: string;
  };
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  onRefresh?: () => void;
}

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [overrideAmounts, setOverrideAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleOverrideChange = (memberId: string, amount: string) => {
    setOverrideAmounts((prev) => ({ ...prev, [memberId]: amount }));
  };

  const saveOverrides = async (goalId: string) => {
    setLoading(true);
    try {
      // Save all changed amounts
      const promises = Object.entries(overrideAmounts).map(([memberId, amount]) => 
        apiClient.savings.upsertContribution(goalId, memberId, Number(amount))
      );
      await Promise.all(promises);
      setEditingGoalId(null);
      setOverrideAmounts({});
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save overrides', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Savings Goals</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => {
          const targetDate = new Date(goal.targetDate);
          const projectedDate = new Date(goal.projectedDate);
          const isLate = goal.varianceMonths > 0;
          const isOnTime = goal.varianceMonths <= 0;

          return (
            <Card key={goal.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{goal.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Target: €{Number(goal.targetAmount).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold px-2 py-1 rounded ${isLate ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                      {isLate ? `Delayed by ${goal.varianceMonths}mo` : 'On Track'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs border-b pb-2">
                    <div>
                      <p className="text-muted-foreground">Target Date</p>
                      <p className="font-medium">{targetDate.toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Projected Date</p>
                      <p className={`font-medium ${isLate ? 'text-destructive' : 'text-green-600'}`}>
                        {projectedDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Contributions</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px]"
                        onClick={() => {
                          if (editingGoalId === goal.id) {
                            setEditingGoalId(null);
                          } else {
                            setEditingGoalId(goal.id);
                            // Pre-fill current amounts
                            const initial: Record<string, string> = {};
                            goal.breakdown.forEach(b => {
                              initial[b.memberId] = b.actualAmount.toString();
                            });
                            setOverrideAmounts(initial);
                          }
                        }}
                      >
                        {editingGoalId === goal.id ? 'Cancel' : 'Adjust'}
                      </Button>
                    </div>

                    {goal.breakdown.map((item) => (
                      <div key={item.memberId} className="flex justify-between items-center text-sm">
                        <UserDisplay user={item.user} className="font-normal" />
                        <div className="flex items-center gap-2">
                          {editingGoalId === goal.id ? (
                            <Input
                              type="number"
                              className="h-7 w-20 text-right text-xs"
                              value={overrideAmounts[item.memberId] || ''}
                              onChange={(e) => handleOverrideChange(item.memberId, e.target.value)}
                            />
                          ) : (
                            <div className="text-right">
                              <p className="font-medium">€{item.actualAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                              {item.isOverridden && (
                                <p className="text-[10px] text-primary">Custom</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {editingGoalId === goal.id && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2 h-8 text-xs" 
                        onClick={() => saveOverrides(goal.id)}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Adjustments'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {goals.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">No savings goals found.</p>
        )}
      </div>
    </div>
  );
}
