import { Skeleton } from "../../../_ui";
import { TransfersListSkeleton } from "./_skeletons";

/**
 * `transfers/[groupId]` segment fallback (route-loading-states: "Every
 * `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback"). Shaped
 * like `TransfersClient`'s populated layout: `max-w-4xl` container, header +
 * transfer rows. The row skeletons are the same `_skeletons.tsx` exports
 * `TransfersClient` renders in its `isLoading` branch, so mounting causes no
 * visible swap.
 */
export default function TransfersLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Skeleton className="h-8 w-40" />
      </div>
      <div data-testid="transfers-loading-rows">
        <TransfersListSkeleton />
      </div>
    </div>
  );
}
