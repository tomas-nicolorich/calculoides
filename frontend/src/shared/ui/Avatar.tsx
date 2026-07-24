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

// CDS member palette (see --color-member-* in index.css), pre-darkened so
// white initials clear WCAG AA against every swatch. `hex` mirrors the same
// file's literal values so an explicit `color` override can still be
// contrast-checked at render time without resolving the CSS custom
// property; keep both in sync.
const MEMBER_PALETTE = [
  { var: "var(--color-member-1)", hex: "#047857" },
  { var: "var(--color-member-2)", hex: "#2563eb" },
  { var: "var(--color-member-3)", hex: "#7c3aed" },
  { var: "var(--color-member-4)", hex: "#b45309" },
  { var: "var(--color-member-5)", hex: "#e11d48" },
  { var: "var(--color-member-6)", hex: "#0e7490" },
  { var: "var(--color-member-7)", hex: "#c2410c" },
  { var: "var(--color-member-8)", hex: "#db2777" },
  { var: "var(--color-member-9)", hex: "#4f46e5" },
  { var: "var(--color-member-10)", hex: "#0f766e" },
];

const WHITE_TEXT = "#ffffff";

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

function hexToHsl(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r0, g0, b0] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r0)}${toHex(g0)}${toHex(b0)}`;
}

/**
 * Darkens a background until white text clears WCAG AA's 4.5:1, for
 * arbitrary `color` overrides that aren't pre-checked like the palette.
 */
function ensureContrastForWhite(backgroundHex: string): string {
  const [h, s, startL] = hexToHsl(backgroundHex);
  let l = startL;
  let candidate = backgroundHex;
  while (l > 0 && (contrastRatio(candidate, WHITE_TEXT) ?? 5) < 4.5) {
    l = Math.max(0, l - 0.02);
    candidate = hslToHex(h, s, l);
  }
  return candidate;
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
  const bg = color ? ensureContrastForWhite(color) : palette.var;
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-full font-semibold leading-none select-none",
        sizes[size],
        className,
      )}
      style={{ background: bg, color: WHITE_TEXT, ...style }}
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
