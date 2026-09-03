import { Card, Skeleton } from "../../../_ui";

/**
 * Shared skeleton module (design.md: "one skeleton module is the single
 * source of truth for a segment"). No `"use client"` — consumed by both
 * the server `loading.tsx` fallback and `ExpensesClient`'s `isLoading`
 * branch, so the hand-off between them renders pixel-identical markup.
 */

function ExpenseRowSkeletonMobile({ index }: { index: number }) {
  return (
    <div
      key={index}
      className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9.5 w-9.5 rounded-lg" />
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

function ExpenseRowSkeletonDesktop({ index }: { index: number }) {
  return (
    <div
      key={index}
      className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] items-center px-5 py-3 gap-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-[38px] w-[38px] rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16 justify-self-end" />
      <div />
    </div>
  );
}

/** `md:hidden` row list — 6 rows, matching `ExpensesClient`'s mobile card list. */
export function ExpensesRowsSkeletonMobile() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <ExpenseRowSkeletonMobile key={i} index={i} />
      ))}
    </div>
  );
}

/** `hidden md:block` row list — 6 rows, matching `ExpensesClient`'s desktop table. */
export function ExpensesRowsSkeletonDesktop() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <ExpenseRowSkeletonDesktop key={i} index={i} />
      ))}
    </div>
  );
}

/**
 * Full list-card fallback for `loading.tsx` — before `ExpensesClient` has
 * mounted, nothing else establishes the Card + column-header shape, so this
 * reproduces `ExpensesClient`'s `Card` -> mobile/desktop row-list chain in
 * full (`-mx-6` cancels `Card`'s `p-6`; the desktop header labels are static
 * text, not data, so they render immediately here too).
 */
export function ExpensesListSkeleton() {
  return (
    <Card>
      <div className="md:hidden -mx-6 border-t border-slate-100 dark:border-slate-800">
        <ExpensesRowsSkeletonMobile />
      </div>
      <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="hidden md:grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] gap-4 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Expense
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Category
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Payer
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
            Amount
          </span>
          <span />
        </div>
        <ExpensesRowsSkeletonDesktop />
      </div>
    </Card>
  );
}
