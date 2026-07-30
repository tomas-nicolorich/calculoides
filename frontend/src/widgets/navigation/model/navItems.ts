import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  PiggyBank,
  Users,
  User,
} from "lucide-react";
import { matchPath } from "react-router-dom";

export type NavSurface = "sidebar" | "tabBar";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** `matchPath` pattern, e.g. "/dashboard/:groupId". */
  pattern: string;
  /** Resolves the concrete href; falls back to `/groups` when no group is active. */
  to: (groupId: string | null) => string;
  /** Whether this item is hidden while no group is active (Savings only for now). */
  requiresGroup: boolean;
  /** Which chrome surfaces render this item. */
  surfaces: readonly NavSurface[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    pattern: "/dashboard/:groupId",
    to: (groupId) => (groupId ? `/dashboard/${groupId}` : "/groups"),
    requiresGroup: false,
    surfaces: ["sidebar", "tabBar"],
  },
  {
    label: "Expenses",
    icon: Receipt,
    pattern: "/expenses/:groupId",
    to: (groupId) => (groupId ? `/expenses/${groupId}` : "/groups"),
    requiresGroup: false,
    surfaces: ["sidebar", "tabBar"],
  },
  {
    label: "Transfers",
    icon: ArrowLeftRight,
    pattern: "/transfers/:groupId",
    to: (groupId) => (groupId ? `/transfers/${groupId}` : "/groups"),
    requiresGroup: false,
    surfaces: ["sidebar", "tabBar"],
  },
  {
    label: "Savings",
    icon: PiggyBank,
    pattern: "/savings/:groupId",
    to: (groupId) => (groupId ? `/savings/${groupId}` : "/groups"),
    requiresGroup: true,
    surfaces: ["sidebar", "tabBar"],
  },
  {
    label: "Groups",
    icon: Users,
    pattern: "/groups",
    to: () => "/groups",
    requiresGroup: false,
    surfaces: ["sidebar", "tabBar"],
  },
  {
    label: "Profile",
    icon: User,
    pattern: "/profile",
    to: () => "/profile",
    requiresGroup: false,
    surfaces: ["sidebar"],
  },
];

/**
 * Matches `pathname` against each item's `pattern` (exact match, not
 * substring/prefix), returning the first match or `null`.
 */
export function matchNavItem(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem | null {
  for (const item of items) {
    if (matchPath({ path: item.pattern, end: true }, pathname)) {
      return item;
    }
  }
  return null;
}

/**
 * Resolves the destination when the user switches active group while on
 * `pathname`: re-binds the currently matched nav pattern to `groupId`, or
 * falls back to the dashboard when `pathname` matches no nav item.
 *
 * Prepared now (design contract) so Slice 2's group switcher doesn't need
 * to touch this file; not yet wired to any UI in Slice 1.
 */
export function groupSwitchTarget(pathname: string, groupId: string): string {
  const matched = matchNavItem(pathname);
  return matched ? matched.to(groupId) : `/dashboard/${groupId}`;
}
