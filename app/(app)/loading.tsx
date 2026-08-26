import { Skeleton } from "../_ui";

/**
 * Generic `(app)` segment fallback (route-loading-states: "Every `(app)`
 * Route Segment Renders a Page-Shaped Skeleton Fallback"). Safety net for
 * any `(app)` segment without its own `loading.tsx` — design.md Decision 2
 * confirms `loading.tsx` renders inside `AppShell`'s `<main>` slot, never
 * remounting the shell.
 */
export default function AppLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
