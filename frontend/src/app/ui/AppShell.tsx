import type { ReactNode } from "react";
import { useIsMobile } from "../../shared/lib/hooks/useIsMobile";
import { SidebarNav } from "../../widgets/navigation/ui/SidebarNav";
import { MobileTopBar } from "../../widgets/navigation/ui/MobileTopBar";
import { MobileTabBar } from "../../widgets/navigation/ui/MobileTabBar";
import { useActiveGroup } from "../providers/ActiveGroupContext";
import { cn } from "../../shared/lib/utils";

/**
 * Single persistent shell for every authenticated route (D3): branches
 * once on `useIsMobile()` into desktop sidebar chrome or mobile top
 * bar + tab bar chrome. `<main>` reserves bottom padding only while the tab
 * bar renders (it hides entirely with no active group) so content never
 * sits under the fixed bar, and never leaves a dead gap when it's gone.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const groupId = useActiveGroup();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <MobileTopBar />
        <main
          className={cn("animate-in fade-in duration-500", groupId && "pb-20")}
        >
          {children}
        </main>
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors">
      <SidebarNav />
      <main className="flex-1 min-w-0 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
