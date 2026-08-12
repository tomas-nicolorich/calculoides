"use client";

import { useParams } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { NavItemLink } from "./NavItemLink";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" (ADR-3) — `hidden md:flex` gates this tree with Tailwind
 * classes only, never a JS `useIsMobile()` check, so there is no
 * first-frame mismatch before hydration.
 */
export function SidebarNav() {
  const params = useParams<{ groupId?: string }>();
  const groupId = params.groupId ?? null;

  return (
    <aside className="hidden border-r border-slate-200 bg-white md:flex md:w-[232px] md:flex-col dark:border-slate-800 dark:bg-slate-900">
      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-1 px-2 py-4"
      >
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.key} item={item} groupId={groupId} />
        ))}
      </nav>
    </aside>
  );
}
