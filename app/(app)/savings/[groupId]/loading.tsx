import { SavingsSkeleton } from "./_skeletons";

/**
 * `savings/[groupId]` segment fallback (route-loading-states: "Every
 * `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback"). Renders
 * the exact same `SavingsSkeleton` `SavingsClient`'s own `isLoading` branch
 * falls back to, so the hand-off between this file and the client mount is
 * a no-op — no repaint.
 */
export default function SavingsLoading() {
  return <SavingsSkeleton />;
}
