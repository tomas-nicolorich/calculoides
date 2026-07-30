import { Link, useLocation } from "react-router-dom";
import { useActiveGroup } from "../../../app/providers/ActiveGroupContext";
import {
  NAV_ACTIVE_TONE_TEXT,
  NAV_ITEMS,
  matchNavItem,
} from "../model/navItems";
import { cn } from "../../../shared/lib/utils";

export function MobileTabBar() {
  const location = useLocation();
  const groupId = useActiveGroup();
  const activeItem = matchNavItem(location.pathname);

  const items = NAV_ITEMS.filter(
    (item) =>
      item.surfaces.includes("tabBar") && (!item.requiresGroup || groupId),
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item;
        return (
          <Link
            key={item.label}
            to={item.to(groupId)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance",
              active
                ? NAV_ACTIVE_TONE_TEXT[item.tone]
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
