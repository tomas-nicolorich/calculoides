import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  UserDisplay,
} from "../../shared/ui";
import { cn } from "../../shared/lib/utils";
import { savingsGoalApi } from "../../entities/savings-goal";
import { SavingsGoalForm } from "./SavingsGoalForm";

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
  const [overrideAmounts, setOverrideAmounts] = useState<
    Record<string, string>
  >({});
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
      const promises = Object.entries(overrideAmounts).map(
        ([memberId, amount]) => {
          if (amount === "" || isNaN(Number(amount))) {
            throw new Error(
              "Please enter valid numeric amounts for all members",
            );
          }
          return savingsGoalApi.upsertContribution(
            goalId,
            memberId,
            Number(amount),
          );
        },
      );
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
      console.error("Failed to save overrides", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save changes. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
        Current Goals
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
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
                onCancel={() => {
                  setEditingGoalId(null);
                }}
              />
            );
          }

          return (
            <Card
              key={goal.id}
              className={cn(
                "transition-all duration-300 border-l-4 hover:shadow-md",
                isSuccess
                  ? "ring-2 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 border-l-emerald-500"
                  : isLate
                    ? "border-l-brand-expense"
                    : "border-l-brand-balance",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setEditingGoalId(goal.id);
                        }}
                        title="Edit Goal Settings"
                      >
                        <span className="text-slate-400 hover:text-brand-balance transition-colors">
                          ✎
                        </span>
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Target: €{goal.targetAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Starting: €{goal.startingAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
                        isLate
                          ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
                      )}
                    >
                      {isLate
                        ? `Delayed ${goal.varianceMonths.toString()}mo`
                        : "On Track"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                        Target Date
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        {targetDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                        Projected
                      </p>
                      <p
                        className={`font-bold ${isLate ? "text-brand-expense" : "text-emerald-600 dark:text-emerald-400"}`}
                      >
                        {projectedDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Monthly Allocation
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[9px] font-bold text-brand-balance hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
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
                            goal.breakdown.forEach((b) => {
                              initial[b.memberId] = b.actualAmount.toString();
                            });
                            setOverrideAmounts(initial);
                          }
                        }}
                      >
                        {adjustingGoalId === goal.id ? "CANCEL" : "ADJUST"}
                      </Button>
                    </div>

                    {goal.breakdown.map((item) => (
                      <div
                        key={item.memberId}
                        className="flex justify-between items-center py-1"
                      >
                        <UserDisplay
                          user={item.user}
                          className="font-medium text-slate-700 dark:text-slate-300"
                        />
                        <div className="flex items-center gap-2">
                          {adjustingGoalId === goal.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 w-24 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance"
                              disabled={loading}
                              value={overrideAmounts[item.memberId] || ""}
                              onChange={(e) => {
                                handleOverrideChange(
                                  item.memberId,
                                  e.target.value,
                                );
                              }}
                            />
                          ) : (
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">
                                €
                                {item.actualAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                              {item.isOverridden && (
                                <p className="text-[9px] font-bold text-brand-balance bg-brand-balance/5 dark:bg-brand-balance/10 dark:text-blue-400 border border-brand-balance/10 dark:border-blue-900/30 px-1.5 rounded-full inline-block">
                                  CUSTOM
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {adjustingGoalId === goal.id && (
                      <div className="space-y-2 pt-2">
                        {error && (
                          <p className="text-[10px] text-destructive font-medium bg-destructive/5 dark:bg-destructive/10 dark:text-red-400 p-2 rounded border border-destructive/20 dark:border-red-900/30">
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
                            onClick={() => {
                              void saveOverrides(goal.id);
                            }}
                            disabled={loading}
                          >
                            {loading ? "Saving Changes..." : "Save Adjustments"}
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
          <p className="text-muted-foreground col-span-full text-center py-8">
            No savings goals found.
          </p>
        )}
      </div>
    </div>
  );
}
