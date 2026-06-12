import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  UserDisplay,
  ProgressMeter,
} from "../../shared/ui";
import { cn } from "../../shared/lib/utils";
import { SavingsGoal } from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";
import { SavingsGoalForm } from "./SavingsGoalForm";

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  onRefresh?: () => void | Promise<void>;
}

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded";

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null;
  const session = useContributionSession(activeGoal);

  const handleSave = async () => {
    const ok = await session.saveSession();
    if (ok) {
      setActiveGoalId(null);
      await onRefresh?.();
    }
  };

  // fallow-ignore-next-line complexity
  const renderGoalCard = (goal: SavingsGoal) => {
    const targetDate = new Date(goal.targetDate);
    const isLate = goal.varianceMonths > 0;
    const isActive = activeGoalId === goal.id;

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

    const localMonths = isActive ? session.localProjectedMonths : null;
    const localDate = isActive ? session.localProjectedDate : null;
    const forecastColor = isActive ? session.forecastColor : "neutral";

    const projectedLabel = (() => {
      if (!isActive || localMonths === null) {
        return new Date(goal.projectedDate).toLocaleDateString();
      }
      if (localMonths === Infinity) return "Never";
      if (localMonths === 0) return "Already reached";
      return localDate
        ? localDate.toLocaleDateString()
        : new Date(goal.projectedDate).toLocaleDateString();
    })();

    const projectedColorClass =
      !isActive || forecastColor === "neutral"
        ? isLate
          ? "text-brand-expense"
          : "text-emerald-600 dark:text-emerald-400"
        : forecastColor === "green"
          ? "text-green-600"
          : forecastColor === "amber"
            ? "text-amber-500"
            : "text-red-500";

    return (
      <Card
        key={goal.id}
        className={cn(
          "transition-all duration-300 border-l-2 hover:shadow-md",
          isLate ? "border-l-brand-expense" : "border-l-brand-balance",
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
                  className={`h-6 w-6 p-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 ${FOCUS_RING}`}
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
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Target:{" "}
                <span className="font-mono tnum">
                  €{goal.targetAmount.toLocaleString()}
                </span>
              </p>
              <div className="mt-1">
                <ProgressMeter
                  value={goal.currentAmount}
                  max={goal.targetAmount}
                />
              </div>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
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
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {targetDate.toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                  Projected
                </p>
                <p
                  data-testid="forecast-projected-date"
                  className={`font-semibold ${projectedColorClass}`}
                >
                  {projectedLabel}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Monthly Allocation
                </p>
                {!isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-5 px-2 text-[9px] font-semibold text-brand-balance bg-transparent hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20 ${FOCUS_RING}`}
                    onClick={() => {
                      setActiveGoalId(goal.id);
                    }}
                  >
                    ADJUST
                  </Button>
                ) : null}
              </div>

              {goal.breakdown.map((item) => (
                <div
                  key={item.memberId}
                  className="flex justify-between items-center py-1 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 px-2 rounded-sm"
                >
                  <UserDisplay
                    user={item.user}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  />
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Input
                        type="number"
                        step="0.01"
                        aria-label={`Override amount for ${item.user?.name ?? item.memberId}`}
                        className={`h-8 w-24 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance ${FOCUS_RING}`}
                        disabled={session.phase === "saving"}
                        value={
                          session.overrideAmounts[item.memberId] ??
                          item.proportionalAmount
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            session.overrideMember(item.memberId, val);
                          }
                        }}
                      />
                    ) : (
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white font-mono tnum">
                          €
                          {item.actualAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {item.isOverridden && (
                          <p className="text-[9px] font-medium text-brand-balance bg-brand-balance/5 dark:bg-brand-balance/10 dark:text-blue-400 border border-brand-balance/10 dark:border-blue-900/30 px-1.5 rounded-full inline-block">
                            CUSTOM
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isActive && (
                <div className="space-y-2 pt-2">
                  {session.saveError && (
                    <p
                      data-testid="session-save-error"
                      className="text-[10px] text-destructive font-medium bg-destructive/5 dark:bg-destructive/10 dark:text-red-400 p-2 rounded border border-destructive/20 dark:border-red-900/30"
                    >
                      {session.saveError}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className={`h-8 text-xs ${FOCUS_RING}`}
                      onClick={() => void handleSave()}
                      disabled={
                        session.phase === "saving" ||
                        session.forecastColor === "red"
                      }
                    >
                      {session.phase === "saving" ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 text-xs ${FOCUS_RING}`}
                      onClick={() => {
                        session.cancelSession();
                        setActiveGoalId(null);
                      }}
                      disabled={session.phase === "saving"}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 text-xs col-span-2 ${FOCUS_RING}`}
                      onClick={() => {
                        session.resetToIncomeSplit();
                      }}
                      disabled={session.phase === "saving"}
                    >
                      Reset to Income Split
                    </Button>
                    {session.preResetSnapshot !== null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 text-xs col-span-2 ${FOCUS_RING}`}
                        onClick={() => {
                          session.undoReset();
                        }}
                        disabled={session.phase === "saving"}
                      >
                        Undo Reset
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200">
        Current Goals
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {goals.map(renderGoalCard)}
        {goals.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No savings goals found.
          </p>
        )}
      </div>
    </div>
  );
}
