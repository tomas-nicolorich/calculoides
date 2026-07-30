import { Menu } from "@base-ui/react";
import { ChevronsUpDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  useActiveGroup,
  useActiveGroupSetter,
} from "../../../app/providers/ActiveGroupContext";
import { useGroupList } from "../../../app/providers/GroupListContext";
import { groupSwitchTarget } from "../model/navItems";
import { cn } from "../../../shared/lib/utils";

const VISIBLE_GROUPS = 3;

function memberCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? "member" : "members"}`;
}

interface GroupSwitcherProps {
  /** `sidebar`: full-width row inside the desktop rail. `pill`: compact,
   * bordered chip for the mobile top bar. */
  variant: "sidebar" | "pill";
  /** Icon-only, matching `NavItemLink`'s collapsed treatment. */
  collapsed?: boolean;
}

/**
 * Current group + member count, first 3 groups in `groupApi.list()` order,
 * "Show More" → `/groups` past that, and an empty state with a path to
 * `/groups` when the user belongs to none (spec: Group Switcher).
 */
export function GroupSwitcher({
  variant,
  collapsed = false,
}: GroupSwitcherProps) {
  const { groups } = useGroupList();
  const groupId = useActiveGroup();
  const setGroupId = useActiveGroupSetter();
  const location = useLocation();
  const navigate = useNavigate();

  const activeGroup = groups.find((group) => group.id === groupId) ?? null;
  const visibleGroups = groups.slice(0, VISIBLE_GROUPS);
  const hasMore = groups.length > VISIBLE_GROUPS;

  const triggerLabel = activeGroup
    ? `${activeGroup.name} · ${memberCountLabel(activeGroup.members.length)}`
    : groups.length === 0
      ? "No groups yet"
      : "Select a group";

  function handleSelect(id: string) {
    setGroupId(id);
    void navigate(groupSwitchTarget(location.pathname, id));
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            aria-label="Switch group"
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance",
              collapsed && "justify-center px-0",
              variant === "pill" &&
                "w-auto rounded-full border border-slate-200 dark:border-slate-800",
            )}
          />
        }
      >
        <ChevronsUpDown size={18} className="shrink-0 text-brand-balance" />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-left">
            {triggerLabel}
          </span>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={8}>
          <Menu.Popup className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in slide-in-from-top-2 duration-200 focus:outline-none">
            {groups.length === 0 ? (
              <div className="space-y-2 p-3 text-sm text-slate-500 dark:text-slate-400">
                <p>You are not part of any groups yet.</p>
                <Link
                  to="/groups"
                  className="font-medium text-brand-balance hover:underline"
                >
                  Browse groups
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleGroups.map((group) => (
                  <Menu.Item
                    key={group.id}
                    onClick={() => {
                      handleSelect(group.id);
                    }}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance"
                  >
                    <span className="truncate font-medium">{group.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {memberCountLabel(group.members.length)}
                    </span>
                  </Menu.Item>
                ))}

                {hasMore && (
                  <Menu.Item
                    render={
                      <Link
                        to="/groups"
                        className="flex items-center justify-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance text-sm font-medium text-brand-balance"
                      />
                    }
                  >
                    Show More
                  </Menu.Item>
                )}
              </div>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
