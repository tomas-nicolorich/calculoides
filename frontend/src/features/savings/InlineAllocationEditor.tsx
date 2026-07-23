import { useState } from "react";
import { Avatar, Badge, Button, Input, UserDisplay } from "../../shared/ui";
import { SavingsGoal } from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";

const fmt = (n: number) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

interface InlineAllocationEditorProps {
  goal: SavingsGoal;
  onRefresh?: () => void | Promise<void>;
}

/**
 * Owns its own `useContributionSession` and saves via `session.saveSession()`
 * — the single canonical persistence path for contribution overrides (see
 * `useContributionSession.ts`). Always renders the member list; a single
 * Adjust toggle swaps every row's amount for an input at once instead of a
 * per-member toggle, so entering edit mode barely changes the list's shape.
 */
export function InlineAllocationEditor({
  goal,
  onRefresh,
}: InlineAllocationEditorProps) {
  const session = useContributionSession(goal);
  const loading = session.phase === "saving";
  const [isEditing, setIsEditing] = useState(false);

  const monthlyTotal = goal.breakdown.reduce(
    (sum, item) => sum + item.actualAmount,
    0,
  );

  const handleSave = async () => {
    if (await session.saveSession()) {
      setIsEditing(false);
      await onRefresh?.();
    }
  };

  const handleCancel = () => {
    session.cancelSession();
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Monthly Allocation · {fmt(monthlyTotal)}/mo
        </p>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] font-semibold text-brand-balance bg-transparent hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Adjust
          </Button>
        )}
      </div>

      {goal.breakdown.map((item, index) => {
        const amount =
          session.overrideAmounts[item.memberId] ?? item.proportionalAmount;

        return (
          <div
            key={item.memberId}
            className="flex justify-between items-center py-2 bg-slate-100 dark:bg-slate-800 px-3 rounded-md gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                name={item.user?.name ?? item.user?.email ?? ""}
                colorIndex={index}
                size="sm"
              />
              <UserDisplay
                user={item.user}
                className="hidden sm:inline font-medium text-slate-700 dark:text-slate-300"
              />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1 shrink-0">
                {item.percentage.toFixed(1)}%
              </span>
              {isEditing && session.ceilingWarnings[item.memberId] && (
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

            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                aria-label={`Override amount for ${item.user?.name ?? item.memberId}`}
                className={`h-8 w-24 text-right text-xs bg-white dark:bg-slate-950 border-brand-balance/30 focus:border-brand-balance shrink-0 ${NO_SPINNER_CLASS}`}
                disabled={loading}
                value={amount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    session.overrideMember(item.memberId, val);
                  }
                }}
              />
            ) : (
              <div className="text-right flex items-center gap-2 shrink-0">
                {item.isOverridden && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-blue-500"
                    title="Custom allocation"
                    aria-label="Custom allocation"
                  />
                )}
                <p className="font-semibold text-slate-900 dark:text-white font-mono tnum">
                  {fmt(item.actualAmount)}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {isEditing && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs w-full text-brand-balance hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
            onClick={() => {
              session.resetToIncomeSplit();
            }}
            disabled={loading}
          >
            Reset to Income Split
          </Button>

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

          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Editing a member&apos;s monthly amount recalculates the projected
            completion date.
          </p>

          {session.saveError && (
            <div className="text-[10px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
              {session.saveError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-bold text-xs tracking-widest uppercase border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="balance"
              className="flex-1 font-bold text-xs tracking-widest uppercase"
              onClick={() => {
                void handleSave();
              }}
              disabled={loading}
            >
              {loading ? "Syncing..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
