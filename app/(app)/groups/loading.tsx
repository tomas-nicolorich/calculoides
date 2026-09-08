import { Skeleton } from "../../_ui";

/**
 * `groups` segment fallback (route-loading-states: "Every `(app)` Route
 * Segment Renders a Page-Shaped Skeleton Fallback"). Shaped like
 * `GroupsClient`'s populated layout: `max-w-4xl` container, header block +
 * group-card grid.
 */
export default function GroupsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        data-testid="groups-loading-grid"
      >
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
