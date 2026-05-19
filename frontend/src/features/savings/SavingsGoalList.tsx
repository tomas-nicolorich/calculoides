import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, UserDisplay } from '../../shared/ui';
import { cn } from '../../shared/lib/utils';
import { apiClient } from '../../shared/api/client';
import { SavingsGoalForm } from './SavingsGoalForm';

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
  groupId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  onRefresh?: () => void | Promise<void>;
}

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);
  const [overrideAmounts, setOverrideAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successGoalId, setSuccessGoalId] = useState<string | null>(null);

  const handleOverrideChange = (memberId: string, amount: string) => {
    setOverrideAmounts((prev) => ({ ...prev, [memberId]: amount }));
  };

  const saveOverrides = async (goalId: string) => {
    setLoading(true);
    setError(null);
    setSuccessGoalId(null);
    try {
      // Save all changed amounts
      const promises = Object.entries(overrideAmounts).map(([memberId, amount]) => {
        if (amount === '' || isNaN(Number(amount))) {
          throw new Error('Please enter valid numeric amounts for all members');
        }
        return apiClient.savings.upsertContribution(goalId, memberId, Number(amount));
      });
      await Promise.all(promises);
      setSuccessGoalId(goalId);
      
      // Trigger refresh immediately and wait for it
      await onRefresh?.();
      
      // Clear success state and editing mode after a short delay for feedback
      setTimeout(() => {
        setAdjustingGoalId(null);
        setOverrideAmounts({});
        setSuccessGoalId(null);
      }, 800);
    } catch (err) {
      console.error('Failed to save overrides', err);
      const message = err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setError(message);
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
          const isSuccess = successGoalId === goal.id;

          if (editingGoalId === goal.id) {
            return (
              <SavingsGoalForm 
                key={goal.id}
                groupId={goal.groupId}
                goal={goal}
                onSuccess={() => {
                  setEditingGoalId(null);
                  void onRefresh?.();
                }}
                onCancel={() => { setEditingGoalId(null); }}
              />
            );
          }

          return (
            <Card key={goal.id} className={cn("transition-all duration-300", isSuccess ? "ring-2 ring-green-500 bg-green-50" : "")}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{goal.name}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => { setEditingGoalId(goal.id); }}
                        title="Edit Goal Settings"
                      >
                        ✎
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Target: €{goal.targetAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Starting: €{goal.startingAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      isLate ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'
                    )}>
                      {isLate ? `Delayed by ${goal.varianceMonths.toString()}mo` : 'On Track'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* ... target/projected dates ... */}
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
                        disabled={loading && adjustingGoalId === goal.id}
                        onClick={() => {
                          if (adjustingGoalId === goal.id) {
                            setAdjustingGoalId(null);
                            setError(null);
                          } else {
                            setAdjustingGoalId(goal.id);
                            setError(null);
                            // Pre-fill current amounts
                            const initial: Record<string, string> = {};
                            goal.breakdown.forEach(b => {
                              initial[b.memberId] = b.actualAmount.toString();
                            });
                            setOverrideAmounts(initial);
                          }
                        }}
                      >
                        {adjustingGoalId === goal.id ? 'Cancel' : 'Adjust'}
                      </Button>
                    </div>

                    {goal.breakdown.map((item) => (
                      <div key={item.memberId} className="flex justify-between items-center text-sm">
                        <UserDisplay user={item.user} className="font-normal" />
                        <div className="flex items-center gap-2">
                          {adjustingGoalId === goal.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-20 text-right text-xs"
                              disabled={loading}
                              value={overrideAmounts[item.memberId] || ''}
                              onChange={(e) => { handleOverrideChange(item.memberId, e.target.value); }}
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

                    {adjustingGoalId === goal.id && (
                      <div className="space-y-2 pt-2">
                        {error && (
                          <p className="text-[10px] text-destructive font-medium bg-destructive/5 p-2 rounded border border-destructive/20">
                            {error}
                          </p>
                        )}
                        {isSuccess ? (
                          <div className="flex items-center justify-center py-2 text-green-600 text-xs font-bold gap-2">
                            <span className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
                            Changes saved successfully!
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full h-8 text-xs" 
                            onClick={() => { void saveOverrides(goal.id); }}
                            disabled={loading}
                          >
                            {loading ? 'Saving Changes...' : 'Save Adjustments'}
                          </Button>
                        )}
                      </div>
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
