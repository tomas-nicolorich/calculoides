import { useState } from "react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/ui";
import { savingsGoalApi, SavingsGoal } from "../../entities/savings-goal";
import { cn } from "../../shared/lib/utils";

interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

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
  const [startingAmount, setStartingAmount] = useState(
    goal?.startingAmount.toString() ?? "0",
  );
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate
      ? new Date(goal.targetDate).toISOString().split("T")[0]
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await savingsGoalApi.update(goal.id, {
          name,
          targetAmount: Number(targetAmount),
          startingAmount: Number(startingAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
      } else {
        await savingsGoalApi.create(groupId, {
          name,
          targetAmount: Number(targetAmount),
          startingAmount: Number(startingAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
      }

      if (!isEditing) {
        setName("");
        setTargetAmount("");
        setStartingAmount("0");
        setTargetDate("");
      }
      await onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message || `Failed to ${isEditing ? "update" : "create"} savings goal`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-t-4 border-t-brand-balance shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200">
          {isEditing ? "Update" : "New"} Savings Goal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Goal Name
            </label>
            <Input
              placeholder="e.g. New Sofa, Vacation"
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance transition-all"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Target (€)
              </label>
              <Input
                type="number"
                step="0.01"
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
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Initial (€)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance"
                value={startingAmount}
                onChange={(e) => {
                  setStartingAmount(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Target Date
            </label>
            <Input
              type="date"
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
              }}
              required
            />
          </div>

          {error && (
            <div className="text-[10px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
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
              className={cn(
                "font-bold text-xs tracking-widest uppercase transition-all shadow-md shadow-brand-balance/20 hover:shadow-lg hover:shadow-brand-balance/30",
                isEditing
                  ? "flex-1 bg-brand-balance"
                  : "w-full bg-brand-balance",
              )}
              disabled={loading}
            >
              {loading
                ? isEditing
                  ? "Syncing..."
                  : "Working..."
                : isEditing
                  ? "Update Goal"
                  : "Save Goal"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
