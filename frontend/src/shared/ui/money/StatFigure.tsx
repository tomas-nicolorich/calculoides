import { cn } from "../../lib/utils";

export type StatFigureTone =
  | "primary"
  | "balance"
  | "income"
  | "expense"
  | "transfer";

export type StatFigureSize = "sm" | "md" | "lg";

export interface StatFigureProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pre-formatted currency headline (e.g. the output of formatCurrency). */
  value: React.ReactNode;
  /** Optional caption above the figure. */
  label?: React.ReactNode;
  /** Optional smaller note beneath the figure. */
  sub?: React.ReactNode;
  tone?: StatFigureTone;
  size?: StatFigureSize;
}

const toneColor: Record<StatFigureTone, string> = {
  primary: "text-slate-900 dark:text-white",
  balance: "text-brand-balance",
  income: "text-brand-income",
  expense: "text-brand-expense",
  transfer: "text-brand-transfer",
};

const sizeClass: Record<StatFigureSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function StatFigure({
  value,
  label,
  sub,
  tone = "primary",
  size = "lg",
  className,
  ...props
}: StatFigureProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {label && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <span
        className={cn(
          "font-mono tabular-nums font-semibold tracking-tight leading-[1.1]",
          sizeClass[size],
          toneColor[tone],
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {sub}
        </span>
      )}
    </div>
  );
}
