import { cn } from "../lib/utils";

export function Input({
  className,
  prefix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string }) {
  const input = (
    <input
      className={cn(
        "flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 px-3 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-balance focus:ring-1 focus:ring-brand-balance disabled:cursor-not-allowed disabled:opacity-60",
        prefix && "pl-6",
        className,
      )}
      {...props}
    />
  );

  if (!prefix) return input;

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
        {prefix}
      </span>
      {input}
    </div>
  );
}

export { Logo } from "./Logo";
export { Button } from "./Button";
export type { ButtonVariant } from "./Button";
export { Card } from "./Card";
export { Badge } from "./Badge";
export { Alert } from "./Alert";
export { ResponsiveDialog } from "./ResponsiveDialog";
export { Avatar, AvatarGroup } from "./Avatar";
export { IconButton } from "./IconButton";
export { IconPicker } from "./IconPicker";
export { DatePicker } from "./DatePicker";
export { UserDisplay } from "./UserDisplay";
export { Select } from "./Select";
export { ProgressMeter } from "./money/ProgressMeter";
export { FilterPanel } from "./FilterPanel";
export { RowMenu } from "./RowMenu";
export { Spinner } from "./Spinner";
export { Skeleton } from "./Skeleton";
