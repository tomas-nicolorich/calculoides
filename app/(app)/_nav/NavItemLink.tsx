"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@base-ui/react/tooltip";
import { NAV_ACTIVE_TONE_TEXT, NAV_ACTIVE_TONE_WELL, type NavItem } from "./navItems";
import { cn } from "../../../lib/cn";

/**
 * app-navigation-shell: "Persistent Shell Renders via CSS-First Responsive
 * Branching" + "Active Group Is Derived From the URL, Not a Context" — a
 * single nav row, active-highlighted against `usePathname()`, hidden
 * entirely while `requiresGroup` is true and no group is active (rather
 * than rendering a dead link to `/groups`). `collapsed` renders icon-only
 * with a hover tooltip, matching the sidebar's collapsed rail width.
 */
export function NavItemLink({
  item,
  groupId,
  collapsed = false,
}: {
  item: NavItem;
  groupId: string | null;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  if (item.requiresGroup && !groupId) {
    return null;
  }

  const href = item.href(groupId);
  // `usePathname()` never carries a query string, so compare against the
  // href's path portion only — matters for Members' `?groupId=` href.
  const active = pathname === href.split("?")[0];
  const Icon = item.icon;

  const className = cn(
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    active
      ? cn(NAV_ACTIVE_TONE_WELL[item.tone], NAV_ACTIVE_TONE_TEXT[item.tone])
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  );

  if (!collapsed) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        <Icon size={20} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className={className}
          />
        }
      >
        <Icon size={20} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={8}>
          <Tooltip.Popup className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-slate-700">
            {item.label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
