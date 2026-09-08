import { cn } from "../../lib/cn";

export type CardAccent =
  | "income"
  | "balance"
  | "expense"
  | "transfer"
  | "category";

export type CardAccentSide = "left" | "top";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional heading rendered above the card body. */
  title?: string;
  /** Coloured accent edge in a CDS money colour. */
  accent?: CardAccent;
  /** Which edge the accent sits on. Defaults to the left. */
  accentSide?: CardAccentSide;
  /** Lift the card to shadow-md on hover (use for clickable cards). */
  hover?: boolean;
}

// Accent colour is applied via inline style (matches the CDS reference) so it
// overrides a single border edge without fighting the base 1px slate border.
const ACCENT_VAR: Record<CardAccent, string> = {
  income: "var(--color-brand-income)",
  balance: "var(--color-brand-balance)",
  expense: "var(--color-brand-expense)",
  transfer: "var(--color-brand-transfer)",
  category: "var(--color-brand-category)",
};

export function Card({
  title,
  accent,
  accentSide = "left",
  hover = false,
  className,
  style,
  children,
  ...props
}: CardProps) {
  const accentStyle = accent
    ? accentSide === "top"
      ? { borderTopWidth: "3px", borderTopColor: ACCENT_VAR[accent] }
      : { borderLeftWidth: "3px", borderLeftColor: ACCENT_VAR[accent] }
    : undefined;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground p-6 shadow-sm transition-all duration-200",
        hover && "hover:shadow-md",
        className,
      )}
      style={{ ...accentStyle, ...style }}
      {...props}
    >
      {title && (
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
