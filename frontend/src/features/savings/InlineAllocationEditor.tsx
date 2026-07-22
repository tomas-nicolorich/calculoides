import { Badge, Button, Input, UserDisplay } from "../../shared/ui";
import { SavingsGoal } from "../../entities/savings-goal";
import { useContributionSession } from "../../entities/savings-goal/useContributionSession";

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
          {loading ? "Syncing..." : "Save Allocation"}
        </Button>
      </div>
    </div>
  );
}
