"use client";

import { useState } from "react";
import { Button, DatePicker, IconPicker, Input } from "../../../../_ui";
import { cn } from "../../../../../lib/cn";
import { useCreateGoal, useUpdateGoal } from "../../../../_data/savings";
import type { SavingsGoal } from "../../../../_data/savings";

interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Ported from `main`'s `frontend/src/features/savings/SavingsGoalForm.tsx`
 * (PR 16). `SavingsGoalList`'s row-menu Edit is this port's only consumer
 * (`goal` always set) — dashboard-level goal creation stays on the
 * standalone `/savings/[groupId]` route's own lean form (6b.4), same
 * "lean, not a full port" precedent as `ExpensesClient`/`TransfersClient`.
 *
 * DEVIATION (documented): `create`/`update` return `ActionResult` and never
 * throw (unlike `main`'s `apiClient.fetch`-backed `savingsGoalApi`), so this
 * form checks `result.ok` after `mutateAsync` instead of relying on a
 * thrown rejection — same adaptation `BudgetCategories`' create/edit dialogs
 * (PR 15b) already established for this repo's Server Action contract.
 */
export function SavingsGoalForm({
  groupId,
  goal,
  onSuccess,
  onCancel,
}: SavingsGoalFormProps) {
  const isEditing = !!goal;
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    goal?.targetAmount.toString() ?? "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    goal?.currentAmount.toString() ?? "0",
  );
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 7) : "",
  );
  const [icon, setIcon] = useState(goal?.icon ?? "other");

  const createGoal = useCreateGoal(groupId);
  const updateGoal = useUpdateGoal(groupId);

  const loading = createGoal.isPending || updateGoal.isPending;
  const mutationError = createGoal.error ?? updateGoal.error;
  const error =
    mutationError instanceof Error ? mutationError.message : null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const targetDateIso = new Date(`${targetDate}-01`).toISOString();

    const result = isEditing
      ? await updateGoal.mutateAsync({
          goalId: goal.id,
          name,
          icon,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: targetDateIso,
        })
      : await createGoal.mutateAsync({
          groupId,
          name,
          icon,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: targetDateIso,
        });

    if (!result.ok) return;

    if (!isEditing) {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
      setIcon("other");
    }
    await onSuccess?.();
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label
          htmlFor="savings-goal-name"
          className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest"
        >
          Goal Name
        </label>
        <Input
          id="savings-goal-name"
          placeholder="e.g. New Sofa, Vacation"
          className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance transition-all"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          required
        />
      </div>

      <IconPicker icon={icon} onChange={setIcon} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="savings-goal-target-amount"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest"
          >
            Target (€)
          </label>
          <Input
            id="savings-goal-target-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance"
            value={targetAmount}
            onChange={(e) => {
              setTargetAmount(e.target.value);
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="savings-goal-current-amount"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest"
          >
            Saved So Far
          </label>
          <Input
            id="savings-goal-current-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance"
            value={currentAmount}
            onChange={(e) => {
              setCurrentAmount(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="savings-goal-target-date"
          className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest"
        >
          Target Date
        </label>
        <DatePicker
          id="savings-goal-target-date"
          value={targetDate}
          onChange={setTargetDate}
          granularity="month"
        />
        {!targetDate && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Required to save this goal
          </p>
        )}
      </div>

      {error && (
        <div className="text-[11px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {isEditing && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 font-bold text-xs tracking-widest uppercase border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="balance"
          className={cn(
            "font-bold text-xs tracking-widest uppercase",
            isEditing ? "flex-1" : "w-full",
          )}
          disabled={loading || !targetDate}
        >
          {loading ? "Syncing..." : isEditing ? "Update Goal" : "Save Goal"}
        </Button>
      </div>
    </form>
  );
}
