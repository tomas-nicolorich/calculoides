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

// TODO: remove after Auth + Groups surface migration (#62) — these compound
// wrappers are thin pass-throughs over the consolidated Card. The Card now owns
// padding (p-6); CardHeader keeps only the header→body gap (pb-6, overridable by
// a call-site pb-* via tailwind-merge) and CardContent is a bare container.
export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-6", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
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
