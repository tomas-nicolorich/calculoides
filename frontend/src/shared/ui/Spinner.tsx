import { cn } from "../lib/utils";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
}

const sizes: Record<SpinnerSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/** Rotating conic-gradient ring — the full-page loading indicator. Reach for `Skeleton` for in-content loading instead. */
export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full",
        sizes[size],
        className,
      )}
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0%, var(--color-brand-balance) 100%)",
        WebkitMask:
          "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
      }}
      {...props}
    />
  );
}
