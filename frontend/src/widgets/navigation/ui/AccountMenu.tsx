import { Menu } from "@base-ui/react";
import { Menu as MenuIcon, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { useActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { IconButton } from "../../../shared/ui";
import { ThemeToggle } from "../../../features/theme-toggle/ui/ThemeToggle";
import { NAV_ITEMS } from "../model/navItems";

/**
 * Mobile top-bar account menu: only items that don't already live in
 * `MobileTabBar` (i.e. sidebar-only nav items, currently just Profile) plus
 * theme toggle and sign out. Sourced from `NAV_ITEMS` so no label/icon/route
 * is hand-duplicated here.
 */
export function AccountMenu() {
  const { signOut } = useAuth();
  const groupId = useActiveGroup();
  const accountItems = NAV_ITEMS.filter(
    (item) => !item.surfaces.includes("tabBar"),
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton
            hover="neutral"
            bordered
            size="lg"
            aria-label="Open menu"
          />
        }
      >
        <MenuIcon size={24} />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Menu.Popup className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in slide-in-from-top-2 duration-200 focus:outline-none">
            <div className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Menu.Item
                    key={item.label}
                    render={
                      <Link
                        to={item.to(groupId)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance group"
                      />
                    }
                  >
                    <Icon
                      size={18}
                      className="text-slate-400 group-hover:text-brand-balance"
                    />
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {item.label}
                    </span>
                  </Menu.Item>
                );
              })}

              <div className="px-1">
                <ThemeToggle />
              </div>

              <Menu.Separator className="h-px bg-slate-100 dark:border-slate-800 my-2" />

              <Menu.Item
                onClick={() => void signOut()}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance group"
              >
                <LogOut
                  size={18}
                  className="text-slate-400 group-hover:text-red-500"
                />
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-red-600">
                  Sign Out
                </span>
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
