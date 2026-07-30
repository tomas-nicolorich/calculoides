import { Tooltip } from "@base-ui/react";
import { Link } from "react-router-dom";
import type { NavItem } from "../model/navItems";
import { cn } from "../../../shared/lib/utils";

interface NavItemLinkProps {
  item: NavItem;
  groupId: string | null;
  active: boolean;
  collapsed?: boolean;
}

export function NavItemLink({
  item,
  groupId,
  active,
  collapsed = false,
}: NavItemLinkProps) {
  const Icon = item.icon;
  const className = cn(
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors outline-none",
    collapsed && "justify-center px-0",
    active
      ? "bg-brand-balance/10 text-brand-balance"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
  );

  if (!collapsed) {
    return (
      <Link
        to={item.to(groupId)}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Link
            to={item.to(groupId)}
            aria-current={active ? "page" : undefined}
            className={className}
          />
        }
      >
        <Icon size={20} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={8}>
          <Tooltip.Popup className="rounded-lg bg-slate-900 dark:bg-slate-700 px-2 py-1 text-xs text-white shadow-lg">
            {item.label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
