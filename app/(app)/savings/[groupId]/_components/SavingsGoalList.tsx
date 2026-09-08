"use client";

import { useState } from "react";
import {
  Badge,
  Card,
  Button,
  RowMenu,
  DialogFooter,
  ResponsiveDialog,
  CategoryIconTile,
} from "../../../../_ui";
import { ProgressMeter } from "../../../../_ui/money";
import { formatCurrency } from "../../../../../lib/format-currency";
import { cn } from "../../../../../lib/cn";
import {
  useDeleteGoal,
  toFriendlySavingsError,
  type SavingsGoal,
} from "../../../../_data/savings";
import { SavingsGoalForm } from "./SavingsGoalForm";
import { InlineAllocationEditor } from "./InlineAllocationEditor";

interface SavingsGoalListProps {
  groupId: string;
  goals: SavingsGoal[];
}

type GoalStatus = "never" | "late" | "onTrack";

function getGoalStatus(goal: SavingsGoal): GoalStatus {
  if (goal.isNever) return "never";
  if (goal.varianceMonths > 0) return "late";
  return "onTrack";
}

const STATUS_ICON_CLASS: Record<GoalStatus, string> = {
  never: "h-9 w-9 bg-brand-expense/10 text-brand-expense",
  late: "h-9 w-9 bg-brand-transfer/10 text-brand-transfer",
  onTrack: "h-9 w-9 bg-brand-income/10 text-brand-income",
};

const STATUS_BADGE_TONE: Record<
  GoalStatus,
  "expense" | "transfer" | "income"
> = {
  never: "expense",
  late: "transfer",
  onTrack: "income",
};

const STATUS_METER_STATE: Record<
  GoalStatus,
  "blocked" | "behind" | "on-track"
> = {
  never: "blocked",
  late: "behind",
  onTrack: "on-track",
};

const STATUS_PROJECTED_COLOR_CLASS: Record<GoalStatus, string> = {
  never: "text-red-500",
  late: "text-amber-500",
  onTrack: "text-emerald-700 dark:text-emerald-400",
};

function statusBadgeLabel(status: GoalStatus, varianceMonths: number): string {
  if (status === "never") return "Never";
  if (status === "late") return `Delayed ${varianceMonths.toString()}mo`;
  return "On Track";
}

function goalProjectedLabel(goal: SavingsGoal): string {
  if (goal.isNever) return "Never";
  return new Date(goal.projectedDate).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

interface GoalCardProps {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
  onDeleteRequest: (goalId: string) => void;
}

function GoalCard({ goal, onEdit, onDeleteRequest }: GoalCardProps) {
  const status = getGoalStatus(goal);
  const targetDate = new Date(goal.targetDate);

  return (
    <Card key={goal.id} hover className="transition-all duration-300">
      <div className="flex justify-between items-start pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIconTile
              icon={goal.icon ?? undefined}
              size="sm"
              className={STATUS_ICON_CLASS[status]}
            />
            <span
              className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
              title={goal.name}
            >
              {goal.name}
            </span>
          </div>
          <p className="mt-1.5 font-mono tabular-nums text-sm font-semibold text-slate-600 dark:text-slate-300">
            Target {formatCurrency(goal.targetAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_BADGE_TONE[status]} size="sm" uppercase>
            {statusBadgeLabel(status, goal.varianceMonths)}
          </Badge>
          <RowMenu
            onEdit={() => {
              onEdit(goal);
            }}
            onDelete={() => {
              onDeleteRequest(goal.id);
            }}
          />
        </div>
      </div>
      <div className="mt-1">
        <ProgressMeter
          value={goal.currentAmount}
          max={goal.targetAmount}
          valueLabel={`${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`}
          state={STATUS_METER_STATE[status]}
        />
      </div>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
              Target Date
            </p>
            <p className="font-mono tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-300">
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
              className={`font-mono tabular-nums text-sm font-semibold ${STATUS_PROJECTED_COLOR_CLASS[status]}`}
            >
              {goalProjectedLabel(goal)}
            </p>
          </div>
        </div>

        <InlineAllocationEditor goal={goal} />
      </div>
    </Card>
  );
}

/**
 * Full port of prod's `frontend/src/features/savings/SavingsGoalList.tsx`.
 * DEVIATION (documented, same class as `ExpensesClient`/`SavingsGoalForm`):
 * `SavingsService.delete...` -> `deleteGoal` Server Action returns
 * `ActionResult` and never throws, so the delete flow checks `result.ok`
 * and tracks its own error string via `toFriendlySavingsError`.
 */
export function SavingsGoalList({ groupId, goals }: SavingsGoalListProps) {
  const deleteGoalMutation = useDeleteGoal(groupId);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteLoading = deleteGoalMutation.isPending;
  const goalToDelete = goals.find((g) => g.id === goalToDeleteId) ?? null;

  const handleDelete = async (goal: SavingsGoal) => {
    const result = await deleteGoalMutation.mutateAsync({ goalId: goal.id });
    if (!result.ok) {
      setDeleteError(toFriendlySavingsError(result.error));
      return;
    }
    setGoalToDeleteId(null);
    setDeleteError(null);
  };

  const handleDeleteRequest = (goalId: string) => {
    setDeleteError(null);
    setGoalToDeleteId(goalId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200">
        Current Goals
      </h2>
      <div className={cn("grid gap-6", goals.length > 1 && "md:grid-cols-2")}>
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={setGoalToEdit}
            onDeleteRequest={handleDeleteRequest}
          />
        ))}
        {goals.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No savings goals found.
          </p>
        )}
      </div>

      <ResponsiveDialog
        open={goalToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setGoalToEdit(null);
        }}
        title="Edit Goal"
        description="Update this goal's name, icon, target, or date."
      >
        {goalToEdit && (
          <SavingsGoalForm
            groupId={groupId}
            goal={goalToEdit}
            onSuccess={() => {
              setGoalToEdit(null);
            }}
            onCancel={() => {
              setGoalToEdit(null);
            }}
          />
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
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
          <div className="text-[11px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1">
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
              if (goalToDelete) void handleDelete(goalToDelete);
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete Goal"}
          </Button>
        </DialogFooter>
      </ResponsiveDialog>
    </div>
  );
}
