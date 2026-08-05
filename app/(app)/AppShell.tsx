import type { ReactNode } from "react";

/**
 * Phase 1a placeholder for `frontend/src/app/ui/AppShell.tsx`. The real
 * shell branches on `useIsMobile()` into `SidebarNav`/`MobileTopBar`/
 * `MobileTabBar` (widgets/navigation/**), none of which are ported yet —
 * their link targets (`dashboard/[groupId]`, `expenses/[groupId]`, etc.)
 * don't exist as routes until Phases 2-6b. Full navigation-chrome porting
 * is deferred to when those destination pages land, to avoid building
 * dead links and to keep this phase within its review budget.
 */
export function AppShell({
  children,
  groupNames,
}: {
  children: ReactNode;
  groupNames: string[];
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          Calculoides
        </span>
        {groupNames.length > 0 && (
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            {groupNames.join(", ")}
          </span>
        )}
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
