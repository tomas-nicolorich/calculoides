import { Skeleton } from "../../../_ui";

/**
 * `transfers/[groupId]` segment fallback (route-loading-states: "Every
 * `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback"). Shaped
 * like `TransfersClient`'s populated layout: `max-w-4xl` container, header +
 * transfer rows.
 */
export default function TransfersLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="space-y-2" data-testid="transfers-loading-rows">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
