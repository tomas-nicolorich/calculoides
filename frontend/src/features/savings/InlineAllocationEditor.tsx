import { useState, type ChangeEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { Avatar, Badge, Button, Input, UserDisplay } from "../../shared/ui";
import {
  SavingsGoal,
  ContributionBreakdown,
} from "../../entities/savings-goal";
import {
  useContributionSession,
  ContributionSession,
} from "../../entities/savings-goal/useContributionSession";

const fmt = (n: number) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FORECAST_COLOR_CLASS: Record<
  ContributionSession["forecastColor"],
  string
> = {
  green: "text-brand-income",
  amber: "text-brand-transfer",
  red: "text-brand-expense",
  neutral: "text-slate-500 dark:text-slate-400",
};

function formatLiveProjectedDate(
  goal: SavingsGoal,
  session: ContributionSession,
): string {
  if (session.localProjectedMonths === null) {
    if (goal.isNever) return "Never";
    return new Date(goal.projectedDate).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }
  if (
    session.localProjectedMonths === Infinity ||
    session.localProjectedDate === null
  ) {
    return "Never";
  }
  return session.localProjectedDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

interface InlineAllocationEditorProps {
  goal: SavingsGoal;
  onRefresh?: () => void | Promise<void>;
}

interface AllocationRowProps {
  item: ContributionBreakdown;
  index: number;
  isEditing: boolean;
  loading: boolean;
  session: ContributionSession;
}

function AllocationCeilingWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Exceeds available balance"
        className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-transfer focus-visible:ring-offset-1"
      >
        <Badge tone="transfer" size="sm" uppercase>
          Over Balance
        </Badge>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          positionMethod="fixed"
          className="z-50"
          sideOffset={4}
          collisionPadding={16}
        >
          <Popover.Popup className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in-50 zoom-in-95 duration-100">
            This member&apos;s share exceeds what&apos;s currently available in
            the shared balance. You can still save, but the group balance will
            need to cover the difference.
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function handleAmountInputChange(
  e: ChangeEvent<HTMLInputElement>,
  onChange: (value: number) => void,
) {
  const val = parseFloat(e.target.value);
  if (!isNaN(val) && val >= 0) onChange(val);
}

function AllocationAmountInput({
  item,
  loading,
  amount,
  onChange,
}: {
  item: ContributionBreakdown;
  loading: boolean;
  amount: number;
  onChange: (value: number) => void;
}) {
  const [prevAmount, setPrevAmount] = useState(amount);
  const [text, setText] = useState(String(amount));

  if (prevAmount !== amount && parseFloat(text) !== amount) {
    setPrevAmount(amount);
    setText(String(amount));
  }

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      aria-label={`Override amount for ${item.user?.name ?? item.memberId}`}
      className={`h-8 w-24 text-right text-xs border-brand-balance/30 focus:border-brand-balance shrink-0 ${NO_SPINNER_CLASS}`}
      disabled={loading}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        handleAmountInputChange(e, onChange);
      }}
      onBlur={() => {
        const val = parseFloat(text);
        if (isNaN(val) || val < 0) setText(String(amount));
      }}
    />
  );
}

function AllocationAmountDisplay({ item }: { item: ContributionBreakdown }) {
  return (
    <div className="text-right flex items-center gap-2 shrink-0">
      {item.isOverridden && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-brand-balance"
          title="Custom allocation"
          aria-label="Custom allocation"
        />
      )}
      <p className="font-semibold text-slate-900 dark:text-white font-mono tnum">
        {fmt(item.actualAmount)}
      </p>
    </div>
  );
}

function AllocationRow({
  item,
  index,
  isEditing,
  loading,
  session,
}: AllocationRowProps) {
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
        <AllocationCeilingWarning
          show={isEditing && session.ceilingWarnings[item.memberId]}
        />
      </div>

      {isEditing ? (
        <AllocationAmountInput
          item={item}
          loading={loading}
          amount={amount}
          onChange={(value) => {
            session.overrideMember(item.memberId, value);
          }}
        />
      ) : (
        <AllocationAmountDisplay item={item} />
      )}
    </div>
  );
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
  const [isEditing, setIsEditing] = useState(false);
  const session = useContributionSession(isEditing ? goal : null);
  const loading = session.phase === "saving";

  const monthlyTotal = goal.breakdown.reduce(
    (sum, item) =>
      sum +
      (isEditing
        ? (session.overrideAmounts[item.memberId] ?? item.proportionalAmount)
        : item.actualAmount),
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
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Monthly Allocation ·{" "}
          <span className="font-mono tnum normal-case tracking-normal">
            {fmt(monthlyTotal)}
          </span>
          /mo
        </p>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] font-semibold text-brand-balance bg-transparent hover:bg-brand-balance/10 dark:hover:bg-brand-balance/20"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Adjust
          </Button>
        )}
      </div>

      {goal.breakdown.map((item, index) => (
        <AllocationRow
          key={item.memberId}
          item={item}
          index={index}
          isEditing={isEditing}
          loading={loading}
          session={session}
        />
      ))}

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

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Editing a member&apos;s monthly amount recalculates the projected
            completion date.
          </p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Projected completion:{" "}
            <span
              className={`font-mono tnum font-semibold ${FORECAST_COLOR_CLASS[session.forecastColor]}`}
            >
              {formatLiveProjectedDate(goal, session)}
            </span>
          </p>

          {session.saveError && (
            <div className="text-[11px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
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
