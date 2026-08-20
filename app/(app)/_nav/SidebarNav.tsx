"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { NavItemLink } from "./NavItemLink";
import { GroupSwitcher } from "./GroupSwitcher";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "../../_ui/Logo";
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
      <div className="flex h-16 items-center gap-2 px-4">
        <Link
          href="/groups"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            Calculoides
          </span>
        </Link>
      </div>

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
