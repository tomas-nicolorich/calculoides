import { useState } from "react";
import { Badge, Button, Input, UserDisplay } from "../../shared/ui";
import {
  savingsGoalApi,
  SavingsGoal,
  ContributionBreakdown,
  diffContributionPersistence,
} from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";

/**
 * Persists only the intentionally-changed contribution overrides for a goal:
 * upserts members present in `overrideAmounts`, deletes DB rows for members
 * whose override was reset (issue #161 — untouched members are left alone).
 */
async function persistContributionOverrides(
  goalId: string,
  breakdown: ContributionBreakdown[],
  overrideAmounts: Record<string, number>,
) {
  const { toUpsert, toDelete } = diffContributionPersistence(
    breakdown,
    overrideAmounts,
  );
  await Promise.all([
    ...toUpsert.map((entry) =>
      savingsGoalApi.upsertContribution(goalId, entry.memberId, entry.amount),
    ),
    ...toDelete.map((memberId) =>
      savingsGoalApi.deleteContribution(goalId, memberId),
    ),
  ]);
}
import { cn } from "../../shared/lib/utils";
import {
  CATEGORY_ICON_KEYS,
  CategoryIconTile,
} from "../../shared/lib/categoryIcons";

interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;
  mode?: "full" | "allocation";
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

function AllocationOverridesEditor({
  goal,
  session,
  loading,
}: {
  goal: SavingsGoal;
  session: ReturnType<typeof useContributionSession>;
  loading: boolean;
}) {
  return (
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

      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Editing a member&apos;s monthly amount recalculates the projected
        completion date.
      </p>

      {goal.breakdown.map((item) => (
        <div
          key={item.memberId}
          className="flex justify-between items-center py-1 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-slate-200 dark:border-slate-700 px-2 rounded-sm"
        >
          <div className="flex items-center gap-2">
            <UserDisplay
              user={item.user}
              className="font-medium text-slate-700 dark:text-slate-300 text-sm"
            />
            {session.ceilingWarnings[item.memberId] && (
              <Badge
                tone="transfer"
                size="sm"
                uppercase
                title="Exceeds available balance"
                aria-label="Exceeds available balance"
              >
                Over Balance
              </Badge>
            )}
          </div>
          <Input
            type="number"
            step="0.01"
            aria-label={`Override amount for ${item.user?.name ?? item.memberId}`}
            className="h-8 w-24 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance"
            disabled={loading}
            value={
              session.overrideAmounts[item.memberId] ?? item.proportionalAmount
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
  );
}

function IconPicker({
  icon,
  setIcon,
}: {
  icon: string;
  setIcon: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        Icon
      </label>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ICON_KEYS.map((key) => {
          const selected = icon === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setIcon(key);
              }}
              aria-pressed={selected}
              aria-label={`Icon: ${key}`}
              title={key}
              className={cn(
                "rounded-xl p-0.5 transition-all",
                selected
                  ? "ring-2 ring-brand-balance ring-offset-1 ring-offset-card"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <CategoryIconTile icon={key} size="md" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// fallow-ignore-next-line complexity
export function SavingsGoalForm({
  groupId,
  goal,
  mode = "full",
  onSuccess,
  onCancel,
}: SavingsGoalFormProps) {
  const isEditing = !!goal;
  const isAllocationOnly = mode === "allocation" && isEditing;
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
      if (isAllocationOnly) {
        await persistContributionOverrides(
          goal.id,
          goal.breakdown,
          session.overrideAmounts,
        );
      } else if (isEditing) {
        await savingsGoalApi.update(goal.id, {
          name,
          icon,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: new Date(`${targetDate}-01`).toISOString(),
        });
        await persistContributionOverrides(
          goal.id,
          goal.breakdown,
          session.overrideAmounts,
        );
      } else {
        await savingsGoalApi.create(groupId, {
          name,
          icon,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount),
          targetDate: new Date(`${targetDate}-01`).toISOString(),
        });
      }

      if (!isEditing) {
        setName("");
        setTargetAmount("");
        setCurrentAmount("0");
        setTargetDate("");
        setIcon("other");
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
      {!isAllocationOnly && (
        <>
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

          <IconPicker icon={icon} setIcon={setIcon} />

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
              type="month"
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-brand-balance"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
              }}
              required
            />
          </div>
        </>
      )}

      {isEditing && goal.breakdown.length > 0 && (
        <AllocationOverridesEditor
          goal={goal}
          session={session}
          loading={loading}
        />
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
            ? "Syncing..."
            : isAllocationOnly
              ? "Save Allocation"
              : isEditing
                ? "Update Goal"
                : "Save Goal"}
        </Button>
      </div>
    </form>
  );
}
