import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  PiggyBank,
  Contact,
  Users,
} from "lucide-react";

/**
 * app-navigation-shell: "Active Group Is Derived From the URL, Not a
 * Context" (ADR-5) — `href` is a function of `groupId`, never a plain
 * string, because `/members` has no `[groupId]` route segment (the
 * route-shape trap): it is scoped by a `?groupId=` query string instead.
 */
export interface NavItem {
  key:
    | "dashboard"
    | "expenses"
    | "transfers"
    | "savings"
    | "members"
    | "groups";
  label: string;
  icon: LucideIcon;
  href: (groupId: string | null) => string;
  requiresGroup: boolean;
  showInTabBar: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: (groupId) => (groupId ? `/dashboard/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: Receipt,
    href: (groupId) => (groupId ? `/expenses/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
  },
  {
    key: "transfers",
    label: "Transfers",
    icon: ArrowLeftRight,
    href: (groupId) => (groupId ? `/transfers/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
  },
  {
    key: "savings",
    label: "Savings",
    icon: PiggyBank,
    href: (groupId) => (groupId ? `/savings/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
  },
  {
    key: "members",
    label: "Members",
    icon: Contact,
    // `/members` has no `[groupId]` segment — scoped by `?groupId=` instead.
    href: (groupId) => (groupId ? `/members?groupId=${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: false,
  },
  {
    key: "groups",
    label: "Groups",
    icon: Users,
    href: () => "/groups",
    requiresGroup: false,
    showInTabBar: true,
  },
];
