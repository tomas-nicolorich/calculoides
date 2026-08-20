"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { useParams, usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import type { ShellGroup } from "../AppShell";
import { cn } from "../../../lib/cn";

// Matches the group-scoped route prefixes from NAV_ITEMS. `/members` is
// deliberately excluded — it is `?groupId=` scoped, not a path segment.
const GROUP_SCOPED_PATH =
  /^\/(?:dashboard|expenses|transfers|savings)\/([^/?]+)/;

/**
 * app-navigation-shell: "Active Group Is Derived From the URL, Not a
 * Context" (ADR-5) — `useParams<{ groupId?: string }>()` is the primary
 * source; `usePathname()` is a fallback for routes where the param isn't
 * resolvable. This is the half PR 9's `SidebarNav` deferred to this PR.
 */
function resolveGroupId(
  paramGroupId: string | undefined,
  pathname: string,
): string | null {
  if (paramGroupId) return paramGroupId;
  const match = GROUP_SCOPED_PATH.exec(pathname);
  return match ? match[1] : null;
}

/**
 * app-navigation-shell: "Group Switcher Lists the User's Real Groups" —
 * lists every group from the `groups` prop (sourced from
 * `GroupService.getGroupsForUser` upstream), with an empty state pointing
 * to `/groups` when the user belongs to none.
 */
export function GroupSwitcher({
  groups,
  collapsed = false,
}: {
  groups: ShellGroup[];
  collapsed?: boolean;
}) {
  const params = useParams<{ groupId?: string }>();
  const pathname = usePathname();
  const groupId = resolveGroupId(params.groupId, pathname);
  const activeGroup = groups.find((group) => group.id === groupId) ?? null;

  const triggerLabel = activeGroup
    ? activeGroup.name
    : groups.length === 0
      ? "No groups yet"
      : "Select a group";

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            aria-label="Switch group"
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
              collapsed && "justify-center px-0",
            )}
          />
        }
      >
        <ChevronsUpDown
          size={18}
          aria-hidden="true"
          className="shrink-0 text-brand-balance"
        />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={8}>
          <Menu.Popup className="w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {groups.length === 0 ? (
              <div className="space-y-2 p-3 text-sm text-slate-500 dark:text-slate-400">
                <p>You are not part of any groups yet.</p>
                <Link
                  href="/groups"
                  className="font-medium text-brand-balance hover:underline"
                >
                  Browse groups
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {groups.map((group) => (
                  <Menu.Item
                    key={group.id}
                    render={
                      <Link
                        href={`/dashboard/${group.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      />
                    }
                  >
                    <span className="truncate">{group.name}</span>
                  </Menu.Item>
                ))}
              </div>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
