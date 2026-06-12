import { cn } from "../lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50",
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
export { UserDisplay } from "./UserDisplay";
export { Select } from "./Select";
export { ProgressMeter } from "./money/ProgressMeter";
