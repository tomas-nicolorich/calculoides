import { Skeleton } from "../../_ui";

/**
 * `members` segment fallback (route-loading-states: "Every `(app)` Route
 * Segment Renders a Page-Shaped Skeleton Fallback"). Shaped like
 * `MembersClient`'s populated layout: `max-w-4xl` container, header +
 * member rows.
 */
export default function MembersLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-3" data-testid="members-loading-rows">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
