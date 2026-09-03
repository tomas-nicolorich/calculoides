import { Card, Skeleton } from "../../../_ui";

/**
 * Shared skeleton module (design.md: "one skeleton module is the single
 * source of truth for a segment"). No `"use client"` — consumed by both
 * the server `loading.tsx` fallback and `SavingsClient`'s `isLoading`
 * branch, so the hand-off between them renders pixel-identical markup.
 */

export function GoalCardSkeleton() {
  return (
    <Card>
      <div className="flex justify-between items-start pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-28 mt-2.5" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mt-3" />
      <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1.5 flex flex-col items-end">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-2 mt-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 px-3 rounded-md bg-slate-100 dark:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Full page fallback — consumed by both `loading.tsx` (before `SavingsClient`
 * mounts) and `SavingsClient`'s own `isLoading` branch (while `goals`
 * refetches), so the hand-off between them is a no-op swap.
 */
export function SavingsSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8" aria-hidden="true">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </header>

      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-6 md:grid-cols-2" data-testid="savings-loading-cards">
          <GoalCardSkeleton />
          <GoalCardSkeleton />
        </div>
      </div>
    </div>
  );
}
