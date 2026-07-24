import { cn } from "../lib/utils";

/** Pulsing placeholder bar — compose these into row/card shapes for in-content loading. Reach for `Spinner` on full-page loads instead. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}
