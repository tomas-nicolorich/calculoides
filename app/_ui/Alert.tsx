import { cn } from "../../lib/cn";

export interface AlertAction {
  label: string;
  onClick: () => void;
}

export type AlertTone = "error" | "success";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional action rendered below the message (e.g. a "Try again" retry). */
  action?: AlertAction;
  /** Semantic tone: "error" (default, assertive) or "success" (polite). */
  tone?: AlertTone;
}

const toneStyles: Record<AlertTone, { surface: string; text: string }> = {
  error: {
    surface:
      "bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50",
    text: "text-red-600 dark:text-red-400",
  },
  success: {
    surface:
      "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

// Shared tinted surface for inline alerts (session errors, form validation
// errors, success confirmations, etc.) — ported verbatim from `main`'s
// `shared/ui/Alert.tsx`.
export function Alert({
  action,
  tone = "error",
  className,
  children,
  ...props
}: AlertProps) {
  const styles = toneStyles[tone];
  return (
    <div
      role="alert"
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "p-3 rounded-xl text-center transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1",
        styles.surface,
        className,
      )}
      {...props}
    >
      <div className={cn("text-sm font-medium", styles.text)}>{children}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 text-sm font-semibold text-brand-balance hover:underline cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
