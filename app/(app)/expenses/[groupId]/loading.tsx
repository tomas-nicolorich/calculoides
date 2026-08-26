import { Skeleton } from "../../../_ui";

/**
 * `expenses/[groupId]` segment fallback (route-loading-states: "Every
 * `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback"). Shaped
 * like `ExpensesClient`'s populated layout: `max-w-7xl` container, header +
 * filter bar + expense rows.
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
      <div className="space-y-2" data-testid="expenses-loading-rows">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
