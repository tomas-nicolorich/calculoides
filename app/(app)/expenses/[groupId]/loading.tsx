import { Skeleton } from "../../../_ui";
import { ExpensesListSkeleton } from "./_skeletons";

/**
 * `expenses/[groupId]` segment fallback (route-loading-states: "Every
 * `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback"). Shaped
 * like `ExpensesClient`'s populated layout: `max-w-7xl` container, header +
 * filter bar + expense rows. The row skeletons are the same `_skeletons.tsx`
 * exports `ExpensesClient` renders in its `isLoading` branch, so mounting
 * causes no visible swap.
 */
export default function ExpensesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div
        className="flex flex-wrap gap-3"
        data-testid="expenses-loading-filters"
      >
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>
      <div data-testid="expenses-loading-rows">
        <ExpensesListSkeleton />
      </div>
    </div>
  );
}
