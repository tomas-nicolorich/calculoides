import { useState } from "react";
import { Button, Input, UserDisplay } from "../../shared/ui";
import { savingsGoalApi, SavingsGoal } from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";
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
  const [currentAmount, setCurrentAmount] = useState(
    goal?.currentAmount.toString() ?? "0",
  );
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate
      ? new Date(goal.targetDate).toISOString().split("T")[0]
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drives the per-member allocation-override controls below. When `goal` is
  // undefined (create mode) this is effectively inert.
  const session = useContributionSession(goal ?? null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await savingsGoalApi.update(goal.id, {
          name,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
        await Promise.all(
          goal.breakdown.map((item) =>
            savingsGoalApi.upsertContribution(
              goal.id,
              item.memberId,
              session.overrideAmounts[item.memberId] ?? item.proportionalAmount,
            ),
          ),
        );
      } else {
        await savingsGoalApi.create(groupId, {
          name,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
      }

      if (!isEditing) {
        setName("");
        setTargetAmount("");
        setCurrentAmount("0");
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
            Saved So Far
          </label>
          <Input
            type="number"
            step="0.01"
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

      {isEditing && goal.breakdown.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex justify-between items-center pb-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Monthly Allocation
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[9px] font-semibold text-brand-balance bg-transparent hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
              onClick={() => {
                session.resetToIncomeSplit();
              }}
              disabled={loading}
            >
              Reset to Income Split
            </Button>
          </div>

          {goal.breakdown.map((item) => (
            <div
              key={item.memberId}
              className="flex justify-between items-center py-1 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 px-2 rounded-sm"
            >
              <UserDisplay
                user={item.user}
                className="font-medium text-slate-700 dark:text-slate-300 text-sm"
              />
              <Input
                type="number"
                step="0.01"
                aria-label={`Override amount for ${item.user?.name ?? item.memberId}`}
                className="h-8 w-24 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance"
                disabled={loading}
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
            </div>
          ))}

          {session.preResetSnapshot !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs w-full"
              onClick={() => {
                session.undoReset();
              }}
              disabled={loading}
            >
              Undo Reset
            </Button>
          )}
        </div>
      )}

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
          variant="balance"
          className={cn(
            "font-bold text-xs tracking-widest uppercase",
            isEditing ? "flex-1" : "w-full",
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
  );
}
