import { Plus } from "lucide-react";
import { cn } from "../lib/utils";

export interface AddExpenseFabProps {
  /** Called when the FAB is tapped. The page owns what happens next
   * (opening its own existing add-expense dialog). */
  onClick: () => void;
  disabled?: boolean;
  /** Accessible name and visible tooltip target. */
  label?: string;
}

/**
 * Mobile-only floating "Add Expense" quick-add button for Dashboard and
 * Expenses. Purely presentational (design A6): it never reads viewport
 * state, never owns dialog/data logic, and never fetches anything — each
 * page decides whether to render it and supplies its own `onClick`.
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
        "bg-[#dc2626] text-white shadow-lg shadow-black/20",
        "transition-all hover:bg-[#c11f1f] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <Plus size={24} />
    </button>
  );
}
