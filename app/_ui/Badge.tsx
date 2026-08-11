import { cn } from "../../lib/cn";

export type BadgeTone =
  | "income"
  | "balance"
  | "expense"
  | "transfer"
  | "category"
  | "neutral";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Money-colour vocabulary tone for the status pill. */
  tone?: BadgeTone;
  size?: BadgeSize;
  uppercase?: boolean;
  /** Leading dot in the current text colour. */
  dot?: boolean;
}

// Soft tint background + brand-coloured text/border, derived from the CDS
// brand tokens via opacity modifiers (no separate -soft tokens needed).
const tones: Record<BadgeTone, string> = {
  income: "bg-brand-income/10 text-brand-income border-brand-income/20",
  balance: "bg-brand-balance/10 text-brand-balance border-brand-balance/20",
  expense: "bg-brand-expense/10 text-brand-expense border-brand-expense/20",
  transfer: "bg-brand-transfer/10 text-brand-transfer border-brand-transfer/20",
  category: "bg-brand-category/10 text-brand-category border-brand-category/20",
  neutral:
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

const sizes: Record<BadgeSize, string> = {
  sm: "text-[11px] px-2 py-[3px] tracking-wide",
  md: "text-xs px-2.5 py-1",
};

export function Badge({
  tone = "neutral",
  size = "md",
  uppercase = false,
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap leading-none",
        tones[tone],
        sizes[size],
        uppercase && "uppercase tracking-wide",
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
