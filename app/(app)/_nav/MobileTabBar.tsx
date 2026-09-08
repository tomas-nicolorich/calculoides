"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" (ADR-3, mobile half) — bottom-fixed, `md:hidden` tab bar
 * rendered from the same `NAV_ITEMS` table `SidebarNav` uses, filtered to
 * `showInTabBar` entries (Members is sidebar/menu-only).
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const params = useParams<{ groupId?: string }>();
  const groupId = params.groupId ?? null;

  const items = NAV_ITEMS.filter((item) => item.showInTabBar);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95"
    >
      {items.map((item) => {
        if (item.requiresGroup && !groupId) return null;

        const href = item.href(groupId);
        const active = pathname === href.split("?")[0];
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              active
                ? "text-brand-balance"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
