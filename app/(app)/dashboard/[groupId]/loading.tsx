import { DashboardSkeleton } from "./_skeletons";

/**
 * Segment fallback (route-loading-states: "Every `(app)` Route Segment
 * Renders a Page-Shaped Skeleton Fallback"). Renders the exact same
 * `DashboardSkeleton` Slice B's nested `<Suspense>` boundary falls back to
 * (design.md Data Flow), so the hand-off between this file and `page.tsx`'s
 * own Suspense fallback is a no-op — no repaint.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
