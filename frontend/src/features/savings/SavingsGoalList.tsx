import { useState } from "react";
import {
  Avatar,
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

const fmt = (n: number) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);

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

    if (adjustingGoalId === goal.id) {
      return (
        <SavingsGoalForm
          key={goal.id}
          groupId={goal.groupId}
          goal={goal}
          mode="allocation"
          onSuccess={() => {
            setAdjustingGoalId(null);
            void onRefresh?.();
          }}
          onCancel={() => {
            setAdjustingGoalId(null);
          }}
        />
      );
    }

    const projectedLabel = isNever
      ? "Never"
      : new Date(goal.projectedDate).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });

    const projectedColorClass = isNever
      ? "text-red-500"
      : isLate
        ? "text-amber-500"
        : "text-emerald-600 dark:text-emerald-400";

    const monthlyTotal = goal.breakdown.reduce(
      (sum, item) => sum + item.actualAmount,
      0,
    );

    return (
      <Card key={goal.id} hover className="transition-all duration-300">
        <div className="flex justify-between items-start pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CategoryIconTile
                icon={goal.icon ?? undefined}
                size="sm"
                className={
                  isNever
                    ? "h-9 w-9 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    : isLate
                      ? "h-9 w-9 bg-brand-expense/10 text-brand-transfer"
                      : "h-9 w-9 bg-brand-balance/10 text-brand-balance"
                }
              />
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
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 ${FOCUS_RING}`}
                onClick={() => {
                  setAdjustingGoalId(goal.id);
                }}
                title="Adjust Allocation"
                aria-label="Adjust Allocation"
              >
                <span className="text-[10px] font-semibold text-slate-400 hover:text-brand-balance transition-colors tracking-wide">
                  ADJUST
                </span>
              </Button>
            </div>
            <p className="mt-1.5 font-mono tnum text-sm font-semibold text-slate-600 dark:text-slate-300">
              Target {fmt(goal.targetAmount)}
            </p>
          </div>
          <div className="text-right">
            <Badge
              tone={isNever ? "expense" : isLate ? "transfer" : "income"}
              size="sm"
              uppercase
            >
              {isNever
                ? "Never"
                : isLate
                  ? `Delayed ${goal.varianceMonths.toString()}mo`
                  : "On Track"}
            </Badge>
          </div>
        </div>
        <div className="mt-1">
          <ProgressMeter
            value={goal.currentAmount}
            max={goal.targetAmount}
            valueLabel={`${fmt(goal.currentAmount)} / ${fmt(goal.targetAmount)}`}
            tone={isNever ? "expense" : isLate ? "transfer" : "balance"}
          />
        </div>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                Target Date
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {targetDate.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                Projected Completion
              </p>
              <p
                data-testid="forecast-projected-date"
                className={`text-sm font-semibold ${projectedColorClass}`}
              >
                {projectedLabel}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Monthly Allocation · {fmt(monthlyTotal)}/mo
              </p>
            </div>

            {goal.breakdown.map((item, index) => (
              <div
                key={item.memberId}
                className="flex justify-between items-center py-2 bg-slate-100 dark:bg-slate-800 px-3 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    name={item.user?.name ?? item.user?.email ?? ""}
                    colorIndex={index}
                    size="xs"
                  />
                  <UserDisplay
                    user={item.user}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white font-mono tnum">
                    {fmt(item.actualAmount)}
                  </p>
                  {item.isOverridden && (
                    <Badge tone="balance" size="sm" uppercase>
                      Custom
                    </Badge>
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
