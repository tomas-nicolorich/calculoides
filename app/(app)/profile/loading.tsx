import { Card, Skeleton } from "../../_ui";

/**
 * `profile` segment fallback (route-loading-states: "Every `(app)` Route
 * Segment Renders a Page-Shaped Skeleton Fallback"). Shaped like
 * `ProfileClient`'s populated layout: `max-w-2xl` container, header + the
 * two Card blocks (Personal Information, Security).
 */
export default function ProfileLoading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <Skeleton className="h-8 w-40" />
      <Card data-testid="profile-loading-card">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
      <Card data-testid="profile-loading-card">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    </div>
  );
}
