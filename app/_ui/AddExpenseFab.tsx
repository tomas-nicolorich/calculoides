import { Plus } from "lucide-react";
import { cn } from "../../lib/cn";

export interface AddExpenseFabProps {
  /** Called when the FAB is tapped. The caller owns what happens next
   * (opening its own existing add-expense dialog). */
  onClick: () => void;
  disabled?: boolean;
  /** Accessible name and visible tooltip target. */
  label?: string;
}

/**
 * Mobile-only floating "Add Expense" quick-add button. Ported from `main`'s
 * `shared/ui/AddExpenseFab.tsx` — purely presentational: it never reads
 * viewport state itself, never owns dialog/data logic, and never fetches
 * anything. The caller decides whether to render it (typically wrapped in a
 * `md:hidden` container, ADR-3's CSS-only breakpoint convention) and
 * supplies its own `onClick`.
 */
export function AddExpenseFab({
  onClick,
  disabled = false,
  label = "Add Expense",
}: AddExpenseFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40",
        "inline-grid h-14 w-14 place-items-center rounded-full",
        "bg-brand-balance text-white shadow-[var(--glow-balance)]",
        "transition-all hover:bg-brand-balance/90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <Plus size={24} />
    </button>
  );
}
