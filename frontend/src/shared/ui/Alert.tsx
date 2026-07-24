import { cn } from "../lib/utils";

export interface AlertAction {
  label: string;
  onClick: () => void;
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional action rendered below the message (e.g. a "Try again" retry). */
  action?: AlertAction;
}

// Shared tinted error surface for inline alerts (session errors, form
// validation errors, etc.) — centralizes the red-50/red-950 markup that was
// previously hand-duplicated across LoginPage and LoginForm.
export function Alert({ action, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-center",
        className,
      )}
      {...props}
    >
      <div className="text-red-600 dark:text-red-400 text-sm font-medium">
        {children}
      </div>
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
