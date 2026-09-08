"use client";

import { useState } from "react";
import { Button, DatePicker, IconPicker, Input } from "../../../../_ui";
import {
  useCreateGoal,
  useUpdateGoal,
  toFriendlySavingsError,
  type SavingsGoal,
} from "../../../../_data/savings";
import { cn } from "../../../../../lib/cn";

interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface SavingsGoalFormState {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  icon: string;
}

function initialFormState(goal: SavingsGoal | undefined): SavingsGoalFormState {
  return {
    name: goal?.name ?? "",
    targetAmount: goal?.targetAmount.toString() ?? "",
    currentAmount: goal?.currentAmount.toString() ?? "0",
    targetDate: goal?.targetDate
      ? new Date(goal.targetDate).toISOString().slice(0, 7)
      : "",
    icon: goal?.icon ?? "other",
  };
}

/**
 * Owns all five editable fields as one object so `handleSubmit`'s
 * create-success reset is a single `resetForm()` call instead of five
 * separate setters.
 */
function useSavingsGoalFormState(goal: SavingsGoal | undefined) {
  const [form, setForm] = useState<SavingsGoalFormState>(() =>
    initialFormState(goal),
  );

  const setField = <K extends keyof SavingsGoalFormState>(
    key: K,
    value: SavingsGoalFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialFormState(undefined));
  };

  return { form, setField, resetForm };
}

/**
 * Full port of prod's `frontend/src/features/savings/SavingsGoalForm.tsx`.
 * DEVIATION (documented, same class as `ExpenseForm`/`SavingsClient`'s prior
 * lean stub): `create`/`update` return `ActionResult` and never throw, so
 * this form checks `result.ok` after `mutateAsync` and tracks its own error
 * string via `toFriendlySavingsError` instead of relying on a thrown
 * rejection surfacing through `mutation.error`.
 */
export function SavingsGoalForm({
  groupId,
  goal,
  onSuccess,
  onCancel,
}: SavingsGoalFormProps) {
  const isEditing = !!goal;
  const { form, setField, resetForm } = useSavingsGoalFormState(goal);
  const { name, targetAmount, currentAmount, targetDate, icon } = form;
  const [error, setError] = useState<string | null>(null);

  const createGoal = useCreateGoal(groupId);
  const updateGoal = useUpdateGoal(groupId);

  const loading = createGoal.isPending || updateGoal.isPending;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const input = {
      name,
      icon,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetDate: new Date(`${targetDate}-01`).toISOString(),
    };

    const result = isEditing
      ? await updateGoal.mutateAsync({ goalId: goal.id, ...input })
      : await createGoal.mutateAsync({ groupId, ...input });

    if (!result.ok) {
      setError(toFriendlySavingsError(result.error));
      return;
    }

    if (!isEditing) {
      resetForm();
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
            setField("name", e.target.value);
          }}
          required
        />
      </div>

      <IconPicker
        icon={icon}
        onChange={(value) => {
          setField("icon", value);
        }}
        tone="balance"
      />

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
              setField("targetAmount", e.target.value);
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
              setField("currentAmount", e.target.value);
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
          onChange={(value) => {
            setField("targetDate", value);
          }}
          granularity="month"
        />
        {!targetDate && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Required to save this goal
          </p>
        )}
      </div>

      {error && (
        <div className="text-[11px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1">
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
