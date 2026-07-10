import { useState } from "react";
import {
  Badge,
  Card,
  Button,
  UserDisplay,
  ProgressMeter,
} from "../../shared/ui";
import { SavingsGoal } from "../../entities/savings-goal";
import { SavingsGoalForm } from "./SavingsGoalForm";
import { CategoryIconTile } from "../../shared/lib/categoryIcons";

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  onRefresh?: () => void | Promise<void>;
}

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded";

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // fallow-ignore-next-line complexity
  const renderGoalCard = (goal: SavingsGoal) => {
    const targetDate = new Date(goal.targetDate);
    const isLate = goal.varianceMonths > 0;
    const isNever = goal.isNever;

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

    const projectedLabel = isNever
      ? "Never"
      : new Date(goal.projectedDate).toLocaleDateString("en-GB");

    const projectedColorClass = isNever
      ? "text-red-500"
      : isLate
        ? "text-amber-500"
        : "text-emerald-600 dark:text-emerald-400";

    const monthlyTotal = goal.breakdown
      .reduce((sum, item) => sum + item.actualAmount, 0)
      .toLocaleString(undefined, { minimumFractionDigits: 2 });

    return (
      <Card
        key={goal.id}
        accent={isNever ? "expense" : isLate ? "transfer" : "balance"}
        hover
        className="transition-all duration-300"
      >
        <div className="flex justify-between items-start pb-2">
          <div>
            <div className="flex items-center gap-2">
              <CategoryIconTile icon={goal.icon ?? undefined} size="sm" />
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {goal.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 ${FOCUS_RING}`}
                onClick={() => {
                  setEditingGoalId(goal.id);
                }}
                title="Edit Goal Settings"
                aria-label="Edit Goal Settings"
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
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Saved so far{" "}
              <span className="font-mono tnum">
                €{goal.currentAmount.toLocaleString()}
              </span>
            </p>
            <div className="mt-1">
              <ProgressMeter
                value={goal.currentAmount}
                max={goal.targetAmount}
                state={isNever ? "blocked" : isLate ? "behind" : "on-track"}
              />
            </div>
          </div>
          <div className="text-right">
            <Badge tone={isNever ? "expense" : isLate ? "transfer" : "income"}>
              {isNever
                ? "Never"
                : isLate
                  ? `Delayed ${goal.varianceMonths.toString()}mo`
                  : "On Track"}
            </Badge>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                Target Date
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {targetDate.toLocaleDateString("en-GB")}
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
                Monthly Allocation · €{monthlyTotal}/mo
              </p>
            </div>

            {goal.breakdown.map((item) => (
              <div
                key={item.memberId}
                className="flex justify-between items-center py-1 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 px-2 rounded-sm"
              >
                <div className="flex items-center">
                  <UserDisplay
                    user={item.user}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                    {Math.round(item.share * 100)}%
                  </span>
                </div>
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
              </div>
            ))}
          </div>
        </div>
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
