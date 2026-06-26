import { cn } from "../lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 px-3 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-balance focus:ring-1 focus:ring-brand-balance disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Button } from "./Button";
export type { ButtonVariant } from "./Button";
export { Card } from "./Card";
export { Badge } from "./Badge";
export { Avatar, AvatarGroup } from "./Avatar";
export { IconButton } from "./IconButton";
export { UserDisplay } from "./UserDisplay";
export { Select } from "./Select";
export { ProgressMeter } from "./money/ProgressMeter";
export { FilterPanel } from "./FilterPanel";
