import { cn } from "../../lib/cn";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonHover =
  | "balance"
  | "income"
  | "expense"
  | "transfer"
  | "neutral";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  /** Money colour the icon tints to on hover. */
  hover?: IconButtonHover;
  /** Give the button a card surface, border, and shadow. */
  bordered?: boolean;
}

const sizes: Record<IconButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const hoverColor: Record<IconButtonHover, string> = {
  balance: "hover:text-brand-balance",
  income: "hover:text-brand-income",
  expense: "hover:text-brand-expense",
  transfer: "hover:text-brand-transfer",
  neutral: "hover:text-slate-900 dark:hover:text-slate-100",
};

export function IconButton({
  size = "md",
  hover = "balance",
  bordered = false,
  className,
  type,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-grid place-items-center rounded-lg border border-transparent bg-transparent text-slate-400 dark:text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        sizes[size],
        hoverColor[hover],
        bordered &&
          "bg-card border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300",
        className,
      )}
      {...props}
    />
  );
}
