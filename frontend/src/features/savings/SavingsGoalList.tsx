import { useState } from "react";
import { Badge, Card, Button, RowMenu, ProgressMeter } from "../../shared/ui";
import { Dialog, DialogFooter } from "../../shared/ui/Dialog";
import { savingsGoalApi, SavingsGoal } from "../../entities/savings-goal";
import { SavingsGoalForm } from "./SavingsGoalForm";
import { InlineAllocationEditor } from "./InlineAllocationEditor";
import { CategoryIconTile } from "../../shared/lib/categoryIcons";

interface SavingsGoalListProps {
  goals: SavingsGoal[];
  onRefresh?: () => void | Promise<void>;
}

const fmt = (n: number) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SavingsGoalList({ goals, onRefresh }: SavingsGoalListProps) {
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (goalId: string) => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await savingsGoalApi.delete(goalId);
      await onRefresh?.();
      setGoalToDeleteId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDeleteError(message || "Failed to delete savings goal");
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderGoalCard = (goal: SavingsGoal) => {
    const targetDate = new Date(goal.targetDate);
    const isLate = goal.varianceMonths > 0;
    const isNever = goal.isNever;

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
            </div>
            <p className="mt-1.5 font-mono tnum text-sm font-semibold text-slate-600 dark:text-slate-300">
              Target {fmt(goal.targetAmount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <RowMenu
              onEdit={() => {
                setGoalToEdit(goal);
              }}
              onDelete={() => {
                setDeleteError(null);
                setGoalToDeleteId(goal.id);
              }}
            />
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

          <InlineAllocationEditor goal={goal} onRefresh={onRefresh} />
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

      <Dialog
        open={goalToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setGoalToEdit(null);
        }}
        title="Edit Goal"
        description="Update this goal's name, icon, target, or date."
      >
        {goalToEdit && (
          <SavingsGoalForm
            groupId={goalToEdit.groupId}
            goal={goalToEdit}
            onSuccess={() => {
              setGoalToEdit(null);
              void onRefresh?.();
            }}
            onCancel={() => {
              setGoalToEdit(null);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={goalToDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGoalToDeleteId(null);
            setDeleteError(null);
          }
        }}
        title="Delete Goal"
        description="This removes the goal and its earmarking only — your shared balance stays intact."
      >
        {deleteError && (
          <div className="text-[10px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
            {deleteError}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setGoalToDeleteId(null);
              setDeleteError(null);
            }}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="expense"
            onClick={() => {
              if (goalToDeleteId) void handleDelete(goalToDeleteId);
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete Goal"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
