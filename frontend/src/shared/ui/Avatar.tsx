import * as React from "react";
import { cn } from "../lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Member display name; two-letter initials are derived from it. */
  name?: string;
  /** Index into the CDS member palette; gives a member a stable colour. */
  colorIndex?: number;
  /** Explicit background colour, overriding the palette. */
  color?: string;
  size?: AvatarSize;
}

// CDS member palette (see --color-member-* in index.css).
const MEMBER_PALETTE = [
  "var(--color-member-1)",
  "var(--color-member-2)",
  "var(--color-member-3)",
  "var(--color-member-4)",
  "var(--color-member-5)",
  "var(--color-member-6)",
  "var(--color-member-7)",
  "var(--color-member-8)",
  "var(--color-member-9)",
  "var(--color-member-10)",
];

const sizes: Record<AvatarSize, string> = {
  xs: "h-[24px] w-[24px] text-[10px]",
  sm: "h-[34px] w-[34px] text-xs",
  md: "h-[42px] w-[42px] text-sm",
  lg: "h-[50px] w-[50px] text-base",
};

/** Two-letter initials: first 2 chars of single word, or first char of first 2 words. */
function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function Avatar({
  name = "",
  colorIndex,
  color,
  size = "md",
  className,
  style,
  ...props
}: AvatarProps) {
  const bg = color ?? MEMBER_PALETTE[(colorIndex ?? 0) % MEMBER_PALETTE.length];
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-full font-semibold leading-none text-white select-none",
        sizes[size],
        className,
      )}
      style={{ background: bg, ...style }}
      title={name}
      {...props}
    >
      {avatarInitials(name)}
    </span>
  );
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Maximum avatars to show before collapsing the rest into a +N chip. */
  max?: number;
  /** Size of the overflow chip; match the avatars it sits beside. */
  size?: AvatarSize;
}

export function AvatarGroup({
  max,
  size = "md",
  className,
  children,
  ...props
}: AvatarGroupProps) {
  const items = React.Children.toArray(children);
  const limit = max ?? items.length;
  const visible = items.slice(0, limit);
  const overflow = items.length - visible.length;

  return (
    <span
      className={cn(
        "flex [&>*:not(:first-child)]:-ml-2 [&>*]:ring-2 [&>*]:ring-card",
        className,
      )}
      {...props}
    >
      {visible}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-grid place-items-center rounded-full font-semibold leading-none bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200",
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
