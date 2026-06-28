import {
  Home,
  ShoppingCart,
  Plug,
  Car,
  UtensilsCrossed,
  HeartPulse,
  Clapperboard,
  ShoppingBag,
  PiggyBank,
  Plane,
  Receipt,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";
import { cn } from "./utils";

/**
 * Constrained, ordered set of category icons (ADR 0007).
 * Keys are stable lowercase strings stored in `Category.icon`.
 * The set is intentionally small — no freeform emoji, no per-category palette.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  rent: Home,
  groceries: ShoppingCart,
  utilities: Plug,
  transport: Car,
  food: UtensilsCrossed,
  health: HeartPulse,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  savings: PiggyBank,
  travel: Plane,
  bills: Receipt,
  other: Folder,
};

/** Ordered list of icon keys, for rendering the picker grid. */
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

/**
 * Resolve a stored icon key to a lucide component. Unknown, legacy (emoji),
 * or undefined values fall back to `Folder` so nothing renders broken.
 */
function resolveCategoryIcon(key?: string): LucideIcon {
  if (key && Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, key)) {
    return CATEGORY_ICONS[key];
  }
  return Folder;
}

export type CategoryIconTileSize = "2xs" | "xs" | "sm" | "md" | "lg";

const tileSizes: Record<CategoryIconTileSize, string> = {
  "2xs": "h-4 w-4 rounded-[4px]",
  xs: "h-5 w-5 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
};

const glyphSizes: Record<CategoryIconTileSize, number> = {
  "2xs": 11,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

export interface CategoryIconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Stored icon key; unknown/legacy values fall back to Folder. */
  icon?: string;
  size?: CategoryIconTileSize;
}

/**
 * Renders the resolved category glyph in `text-brand-category` inside a violet
 * `bg-brand-category/10` tile (single violet tile per ADR 0007 — no palette).
 * Self-contained and reused by other widgets.
 */
export function CategoryIconTile({
  icon,
  size = "md",
  className,
  ...props
}: CategoryIconTileProps) {
  const known =
    icon && Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, icon);
  const label = known ? icon : "other";
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-grid place-items-center shrink-0 bg-brand-category/10 text-brand-category",
        tileSizes[size],
        className,
      )}
      {...props}
    >
      {createElement(resolveCategoryIcon(icon), {
        size: glyphSizes[size],
        "aria-hidden": true,
      })}
    </span>
  );
}
