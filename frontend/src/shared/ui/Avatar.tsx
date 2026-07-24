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

// CDS member palette (see --color-member-* in index.css). `hex` mirrors the
// same file's literal values so initials contrast can be computed at render
// time without resolving the CSS custom property; keep both in sync.
const MEMBER_PALETTE = [
  { var: "var(--color-member-1)", hex: "#10b981" },
  { var: "var(--color-member-2)", hex: "#3b82f6" },
  { var: "var(--color-member-3)", hex: "#8b5cf6" },
  { var: "var(--color-member-4)", hex: "#f59e0b" },
  { var: "var(--color-member-5)", hex: "#f43f5e" },
  { var: "var(--color-member-6)", hex: "#06b6d4" },
  { var: "var(--color-member-7)", hex: "#f97316" },
  { var: "var(--color-member-8)", hex: "#ec4899" },
  { var: "var(--color-member-9)", hex: "#6366f1" },
  { var: "var(--color-member-10)", hex: "#14b8a6" },
];

const WHITE_TEXT = "#ffffff";
const DARK_TEXT = "#0f172a"; // slate-900

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number | null {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  if (lumA === null || lumB === null) return null;
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks whichever of white/dark text clears WCAG AA's 4.5:1 against this
 * background; if neither does (no member colour in the palette currently
 * falls short of both), picks whichever ratio is higher.
 */
function textColorFor(backgroundHex: string): string {
  const whiteRatio = contrastRatio(backgroundHex, WHITE_TEXT) ?? 0;
  const darkRatio = contrastRatio(backgroundHex, DARK_TEXT) ?? 0;
  if (whiteRatio >= 4.5) return WHITE_TEXT;
  if (darkRatio >= 4.5) return DARK_TEXT;
  return whiteRatio >= darkRatio ? WHITE_TEXT : DARK_TEXT;
}

const sizes: Record<AvatarSize, string> = {
  xs: "h-[24px] w-[24px] text-[11px]",
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
  const palette = MEMBER_PALETTE[(colorIndex ?? 0) % MEMBER_PALETTE.length];
  const bg = color ?? palette.var;
  const textColor = textColorFor(color ?? palette.hex);
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-full font-semibold leading-none select-none",
        sizes[size],
        className,
      )}
      style={{ background: bg, color: textColor, ...style }}
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
