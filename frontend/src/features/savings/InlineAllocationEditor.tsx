import { useState } from "react";
import { Badge, Button, Input, UserDisplay } from "../../shared/ui";
import { SavingsGoal } from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";

const fmt = (n: number) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

interface InlineAllocationEditorProps {
  goal: SavingsGoal;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Inline in-card allocation editor. Owns its own `useContributionSession` and
 * saves via `session.saveSession()` — the single canonical persistence path
 * for contribution overrides (see `useContributionSession.ts`).
 */
export function InlineAllocationEditor({
  goal,
  onSaved,
  onCancel,
}: InlineAllocationEditorProps) {
  const session = useContributionSession(goal);
  const loading = session.phase === "saving";
  const [adjustingIds, setAdjustingIds] = useState<Set<string>>(new Set());

  const startAdjusting = (memberId: string) => {
    setAdjustingIds((prev) => new Set(prev).add(memberId));
  };

  const handleSave = async () => {
    if (await session.saveSession()) {
      await onSaved();
    }
  };

  const handleCancel = () => {
    session.cancelSession();
    onCancel();
  };

  return (
    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        Monthly Allocation
      </label>

      {goal.breakdown.map((item) => {
        const isAdjusting = adjustingIds.has(item.memberId);
        const amount =
          session.overrideAmounts[item.memberId] ?? item.proportionalAmount;

        return (
          <div
            key={item.memberId}
            className="flex justify-between items-center py-1 bg-slate-100 dark:bg-slate-800 px-2 rounded-sm gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <UserDisplay
                user={item.user}
                className="font-medium text-slate-700 dark:text-slate-300 text-sm"
              />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                {item.percentage.toFixed(1)}%
              </span>
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

            {isAdjusting ? (
              <Input
                type="number"
                step="0.01"
                autoFocus
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
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono tnum">
                  {fmt(amount)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-brand-balance bg-transparent hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
                  onClick={() => {
                    startAdjusting(item.memberId);
                  }}
                  disabled={loading}
                >
                  Adjust
                </Button>
              </div>
            )}
          </div>
        );
      })}

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
    </div>
  );
}
