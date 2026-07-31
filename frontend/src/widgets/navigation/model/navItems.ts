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
import type { BadgeTone } from "../../../shared/ui/Badge";

export type NavSurface = "sidebar" | "tabBar";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** `matchPath` pattern, e.g. "/dashboard/:groupId". */
  pattern: string;
  /** Resolves the concrete href; falls back to `/groups` when no group is active. */
  to: (groupId: string | null) => string;
  /** Whether this item is hidden while no group is active. */
  requiresGroup: boolean;
  /** Which chrome surfaces render this item. */
  surfaces: readonly NavSurface[];
  /** Semantic-ledger tone applied to this item's active state. */
  tone: BadgeTone;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    pattern: "/dashboard/:groupId",
    to: (groupId) => (groupId ? `/dashboard/${groupId}` : "/groups"),
    requiresGroup: true,
    surfaces: ["sidebar", "tabBar"],
    tone: "balance",
  },
  {
    label: "Expenses",
    icon: Receipt,
    pattern: "/expenses/:groupId",
    to: (groupId) => (groupId ? `/expenses/${groupId}` : "/groups"),
    requiresGroup: true,
    surfaces: ["sidebar", "tabBar"],
    tone: "expense",
  },
  {
    label: "Transfers",
    icon: ArrowLeftRight,
    pattern: "/transfers/:groupId",
    to: (groupId) => (groupId ? `/transfers/${groupId}` : "/groups"),
    requiresGroup: true,
    surfaces: ["sidebar", "tabBar"],
    tone: "transfer",
  },
  {
    label: "Savings",
    icon: PiggyBank,
    pattern: "/savings/:groupId",
    to: (groupId) => (groupId ? `/savings/${groupId}` : "/groups"),
    requiresGroup: true,
    surfaces: ["sidebar", "tabBar"],
    tone: "income",
  },
  {
    label: "Groups",
    icon: Users,
    pattern: "/groups",
    to: () => "/groups",
    requiresGroup: false,
    surfaces: ["sidebar", "tabBar"],
    tone: "category",
  },
  {
    label: "Profile",
    icon: User,
    pattern: "/profile",
    to: () => "/profile",
    requiresGroup: false,
    surfaces: ["sidebar"],
    tone: "balance",
  },
];

/**
 * Active-state text color per tone, chosen for 4.5:1 contrast in both
 * themes against the nav surface (not the raw `brand-*` 500/600 tokens,
 * several of which fail AA at nav text size — see nav critique
 * 2026-07-30). Literal classes only, so Tailwind's scanner can find them
 * (a `text-brand-${tone}` template string would silently produce no CSS).
 */
export const NAV_ACTIVE_TONE_TEXT: Record<BadgeTone, string> = {
  balance: "text-blue-700 dark:text-blue-400",
  income: "text-emerald-700 dark:text-emerald-400",
  expense: "text-red-700 dark:text-red-400",
  transfer: "text-amber-700 dark:text-amber-400",
  category: "text-violet-600 dark:text-violet-400",
  neutral: "text-slate-600 dark:text-slate-300",
};

/** Active-state background well per tone, for surfaces that pair the well with `NAV_ACTIVE_TONE_TEXT`. */
export const NAV_ACTIVE_TONE_WELL: Record<BadgeTone, string> = {
  balance: "bg-brand-balance/10",
  income: "bg-brand-income/10",
  expense: "bg-brand-expense/10",
  transfer: "bg-brand-transfer/10",
  category: "bg-brand-category/10",
  neutral: "bg-slate-100 dark:bg-slate-800",
};

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
