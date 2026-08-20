import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  PiggyBank,
  Contact,
  Users,
  User,
} from "lucide-react";
import type { BadgeTone } from "../../_ui/Badge";

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
    | "groups"
    | "profile";
  label: string;
  icon: LucideIcon;
  href: (groupId: string | null) => string;
  requiresGroup: boolean;
  showInTabBar: boolean;
  /** Semantic-ledger tone applied to this item's active state. */
  tone: BadgeTone;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: (groupId) => (groupId ? `/dashboard/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
    tone: "balance",
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: Receipt,
    href: (groupId) => (groupId ? `/expenses/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
    tone: "expense",
  },
  {
    key: "transfers",
    label: "Transfers",
    icon: ArrowLeftRight,
    href: (groupId) => (groupId ? `/transfers/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
    tone: "transfer",
  },
  {
    key: "savings",
    label: "Savings",
    icon: PiggyBank,
    href: (groupId) => (groupId ? `/savings/${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: true,
    tone: "income",
  },
  {
    key: "members",
    label: "Members",
    icon: Contact,
    // `/members` has no `[groupId]` segment — scoped by `?groupId=` instead.
    href: (groupId) => (groupId ? `/members?groupId=${groupId}` : "/groups"),
    requiresGroup: true,
    showInTabBar: false,
    tone: "neutral",
  },
  {
    key: "groups",
    label: "Groups",
    icon: Users,
    href: () => "/groups",
    requiresGroup: false,
    showInTabBar: true,
    tone: "category",
  },
  {
    key: "profile",
    label: "Profile",
    icon: User,
    href: () => "/profile",
    requiresGroup: false,
    showInTabBar: false,
    tone: "balance",
  },
];

/**
 * Active-state text color per tone, chosen for 4.5:1 contrast in both
 * themes against the nav surface (not the raw `brand-*` 500/600 tokens,
 * several of which fail AA at nav text size). Literal classes only, so
 * Tailwind's scanner can find them (a `text-brand-${tone}` template string
 * would silently produce no CSS).
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
