"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { NavItemLink } from "./NavItemLink";
import { GroupSwitcher } from "./GroupSwitcher";
import { useSidebarCollapsed } from "./useSidebarCollapsed";
import { Logo } from "../../_ui/Logo";
import { ThemeToggle } from "../../_theme/ThemeToggle";
import { signOut } from "../../../lib/actions/session";
import { cn } from "../../../lib/cn";
import type { ShellGroup } from "../AppShell";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" (ADR-3) — `hidden md:flex` gates this tree with Tailwind
 * classes only, never a JS `useIsMobile()` check, so there is no
 * first-frame mismatch before hydration. Composes `GroupSwitcher` per
 * design.md's Data Flow diagram, threading the `groups` prop `AppShell`
 * previously discarded. Collapse state (68px/232px, persisted) and the
 * theme toggle / sign-out rows are a direct port of `main`'s
 * `widgets/navigation/ui/SidebarNav.tsx` — no identity chip in the
 * persistent chrome, that now lives on `/profile`.
 */
export function SidebarNav({ groups }: { groups: ShellGroup[] }) {
  const params = useParams<{ groupId?: string }>();
  const groupId = params.groupId ?? null;
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col overflow-x-hidden border-r border-slate-200 bg-white transition-all md:flex dark:border-slate-800 dark:bg-slate-900",
        collapsed ? "md:w-[68px]" : "md:w-[232px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/groups"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Logo className="h-8 w-8" />
          {!collapsed && (
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Calculoides
            </span>
          )}
        </Link>
      </div>

      <div className="px-2 pt-4">
        <GroupSwitcher groups={groups} collapsed={collapsed} />
      </div>

      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4"
      >
        {NAV_ITEMS.map((item) => (
          <NavItemLink
            key={item.key}
            item={item}
            groupId={groupId}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-slate-100 px-2 py-3 dark:border-slate-800">
        <ThemeToggle collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign Out"
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/20",
            collapsed && "justify-center",
          )}
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
