"use client";

import { useParams } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { NavItemLink } from "./NavItemLink";
import { GroupSwitcher } from "./GroupSwitcher";
import { AccountMenu } from "./AccountMenu";
import type { ShellGroup, ShellUser } from "../AppShell";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" (ADR-3) — `hidden md:flex` gates this tree with Tailwind
 * classes only, never a JS `useIsMobile()` check, so there is no
 * first-frame mismatch before hydration. Composes `GroupSwitcher` and
 * `AccountMenu` per design.md's Data Flow diagram, threading the
 * `groups`/`user` props `AppShell` previously discarded.
 */
export function SidebarNav({
  groups,
  user,
}: {
  groups: ShellGroup[];
  user: ShellUser;
}) {
  const params = useParams<{ groupId?: string }>();
  const groupId = params.groupId ?? null;

  return (
    <aside className="hidden border-r border-slate-200 bg-white md:flex md:w-[232px] md:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="px-2 pt-4">
        <GroupSwitcher groups={groups} />
      </div>

      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-1 px-2 py-4"
      >
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.key} item={item} groupId={groupId} />
        ))}
      </nav>

      <div className="border-t border-slate-100 px-2 py-3 dark:border-slate-800">
        <AccountMenu user={user} />
      </div>
    </aside>
  );
}
