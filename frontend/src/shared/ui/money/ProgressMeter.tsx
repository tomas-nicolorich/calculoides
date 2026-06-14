import { cn } from "../../lib/utils";

export type ProgressTone =
  | "income"
  | "balance"
  | "expense"
  | "transfer"
  | "category";

/** Goal urgency: green on track, amber behind, red when unreachable. */
export type ProgressState = "on-track" | "behind" | "blocked";

export interface ProgressMeterProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "color"
> {
  value?: number;
  max?: number;
  /** Static colour when no urgency state is supplied. */
  tone?: ProgressTone;
  /** Urgency override; takes precedence over `tone` for the fill colour. */
  state?: ProgressState;
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
}

const toneVar: Record<ProgressTone, string> = {
  income: "var(--color-brand-income)",
  balance: "var(--color-brand-balance)",
  expense: "var(--color-brand-expense)",
  transfer: "var(--color-brand-transfer)",
  category: "var(--color-brand-category)",
};

const stateVar: Record<ProgressState, string> = {
  "on-track": "var(--color-brand-income)",
  behind: "var(--color-brand-transfer)",
  blocked: "var(--color-brand-expense)",
};

export function ProgressMeter({
  value = 0,
  max = 100,
  tone = "balance",
  state,
  label,
  valueLabel,
  className,
  ...props
}: ProgressMeterProps) {
  const safeMax = max <= 0 ? 1 : max;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const fill = state
    ? stateVar[state]
    : value > max
      ? "var(--color-brand-expense)"
      : toneVar[tone];
  const hasHead = label != null || valueLabel != null;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {hasHead && (
        <div className="flex items-baseline justify-between">
          {label && (
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {label}
            </span>
          )}
          {valueLabel && (
            <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        data-state={state}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct.toString()}%`, background: fill }}
        />
      </div>
    </div>
  );
}
