"use client";

import Link from "next/link";
import { Logo } from "../../_ui/Logo";
import { GroupSwitcher } from "./GroupSwitcher";
import type { ShellGroup } from "../AppShell";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" (ADR-3, mobile half) — `md:hidden` gates this tree with
 * Tailwind classes only, rendered on every server render alongside the
 * desktop sidebar tree so there is no first-frame mismatch before
 * hydration.
 */
export function MobileTopBar({ groups }: { groups: ShellGroup[] }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/80">
      <Link
        href="/groups"
        className="flex shrink-0 items-center gap-2 outline-none"
      >
        <Logo className="h-8 w-8" />
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          Calculoides
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <GroupSwitcher groups={groups} />
      </div>
    </header>
  );
}
