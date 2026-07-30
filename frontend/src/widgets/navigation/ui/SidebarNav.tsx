import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthContext";
import { useActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { useSidebarCollapsed } from "../model/useSidebarCollapsed";
import { NAV_ITEMS, matchNavItem } from "../model/navItems";
import { NavItemLink } from "./NavItemLink";
import { Logo } from "../../../shared/ui";
import { ThemeToggle } from "../../../features/theme-toggle/ui/ThemeToggle";
import { cn } from "../../../shared/lib/utils";

export function SidebarNav() {
  const { signOut } = useAuth();
  const groupId = useActiveGroup();
  const location = useLocation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const activeItem = matchNavItem(location.pathname);

  const items = NAV_ITEMS.filter(
    (item) =>
      item.surfaces.includes("sidebar") && (!item.requiresGroup || groupId),
  );

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all",
        collapsed ? "w-[68px]" : "w-[232px]",
      )}
    >
      <div
        className={cn(
          "flex items-center h-16 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link to="/groups" className="flex items-center gap-2 outline-none">
          <Logo className="w-8 h-8" />
          {!collapsed && (
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Calculoides
            </span>
          )}
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 flex flex-col gap-1 px-2 py-2 overflow-y-auto"
      >
        {items.map((item) => (
          <NavItemLink
            key={item.label}
            item={item}
            groupId={groupId}
            active={activeItem === item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 px-2 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className={cn(collapsed && "overflow-hidden")}>
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign Out"
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
