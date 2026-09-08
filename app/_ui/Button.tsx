import { cn } from "../../lib/cn";

export type ButtonVariant =
  | "balance"
  | "income"
  | "expense"
  | "transfer"
  | "cta"
  | "outline"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Semantic money variant. `balance` is the primary (blue) action. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the button label (e.g. a Lucide icon). */
  leadingIcon?: React.ReactNode;
  /** Rendered after the button label. */
  trailingIcon?: React.ReactNode;
}

// Solid accent variants darken ~6-8% on hover; hex values are the CDS spec
// (see .knowledge/design-system .cds-btn--* rules), not derivable from tokens.
const variants: Record<ButtonVariant, string> = {
  balance: "bg-brand-balance text-white hover:bg-[#2f73e0]",
  income: "bg-brand-income text-white hover:bg-[#0ea271]",
  // Darker than brand-expense so white button text clears WCAG AA (4.5:1);
  // the plain brand-expense hex stays reserved for tints/icons/text-on-white.
  expense: "bg-[#dc2626] text-white hover:bg-[#c11f1f]",
  transfer: "bg-brand-transfer text-white hover:bg-[#e0900a]",
  // Hero action: brand glow + lift. One per screen.
  cta: "bg-brand-balance text-white rounded-2xl shadow-[var(--glow-balance)] hover:scale-[1.02]",
  outline:
    "bg-card text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700",
  ghost:
    "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-7 text-base rounded-xl",
};

export function Button({
  className,
  variant = "balance",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
