---
version: 1.0
name: Calculoides Modern
description: Design system for a household budget management app — financial clarity through semantic color, geometric type, and controlled depth.
colors:
  # Brand palette — each maps to a financial transaction type
  brand-balance: "#3B82F6"      # primary blue — balance, trust, primary actions
  brand-income:  "#10B981"      # emerald — income, positive states, success
  brand-expense: "#EF4444"      # red — expenses, deletion, danger
  brand-transfer: "#F59E0B"     # amber — transfers, pending, warnings
  brand-category: "#8B5CF6"     # violet — category tags, neutral accent
  # Neutral foundation (Slate scale)
  neutral-50:  "#F8FAFC"
  neutral-100: "#F1F5F9"
  neutral-200: "#E2E8F0"
  neutral-300: "#CBD5E1"
  neutral-400: "#94A3B8"
  neutral-500: "#64748B"
  neutral-600: "#475569"
  neutral-700: "#334155"
  neutral-800: "#1E293B"
  neutral-900: "#0F172A"
  # Semantic surfaces
  background: "#F8FAFC"         # light mode page background
  surface-card: "#FFFFFF"       # card / dialog surface
  surface-dark: "#0F172A"       # dark mode page background
  surface-card-dark: "#1E293B"  # dark mode card surface
  # Semantic tinted wells (10% opacity fills)
  well-balance:  "rgba(59,130,246,0.10)"
  well-income:   "rgba(16,185,129,0.10)"
  well-expense:  "rgba(239,68,68,0.10)"
  well-transfer: "rgba(245,158,11,0.10)"
  well-category: "rgba(139,92,246,0.10)"
typography:
  display:
    fontFamily: Geist
    fontSize: 30px         # text-3xl
    fontWeight: 600
    lineHeight: 1.1
  heading:
    fontFamily: Geist
    fontSize: 18px         # text-lg
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: Geist
    fontSize: 14px         # text-sm
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: Geist Mono
    fontVariantNumeric: tabular-nums
    fontFeatureSettings: '"tnum" 1, "zero" 1'
rounded:
  sm:   4px    # nested row corners
  md:   6px    # buttons
  lg:   8px    # chips, icon tiles
  xl:   12px   # inputs, soft tiles
  2xl:  16px   # cards, dialogs
  full: 9999px # pills, avatars, progress bars
spacing:
  base: 4px    # 4px grid
  xs:   4px
  sm:   8px
  md:   16px
  lg:   24px   # card padding, grid gap
  xl:   32px   # section gap
  2xl:  48px
  3xl:  64px
layout:
  container-app:    1280px   # dashboards (max-w-7xl)
  container-narrow: 896px    # list pages (max-w-4xl)
  container-form:   448px    # auth / dialogs (max-w-md)
  header-height:    64px
elevation:
  xs:  "0 1px 2px 0 rgba(15,23,42,0.05)"
  sm:  "0 1px 3px 0 rgba(15,23,42,0.08), 0 1px 2px -1px rgba(15,23,42,0.06)"
  md:  "0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.06)"
  lg:  "0 10px 15px -3px rgba(15,23,42,0.10), 0 4px 6px -4px rgba(15,23,42,0.06)"
  # Chromatic glows — used on CTA buttons and stat figures
  glow-balance:  "0 10px 20px -6px rgba(59,130,246,0.35)"
  glow-income:   "0 10px 20px -6px rgba(16,185,129,0.35)"
  glow-expense:  "0 10px 20px -6px rgba(239,68,68,0.35)"
  glow-transfer: "0 10px 20px -6px rgba(245,158,11,0.35)"
components:
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
    shadow: "{elevation.sm}"
    border: "1px solid {colors.neutral-200}"
  button-balance:
    backgroundColor: "{colors.brand-balance}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-cta:
    backgroundColor: "{colors.brand-balance}"
    textColor: "#FFFFFF"
    rounded: "{rounded.2xl}"
    shadow: "{elevation.glow-balance}"
    transform: "scale(1.02) on hover"
  button-outline:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-700}"
    border: "1px solid {colors.neutral-200}"
    rounded: "{rounded.md}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-700}"
    rounded: "{rounded.md}"
---

# Calculoides Modern Design System

## Design Philosophy

Financial data needs **clarity first, personality second**. Every decision in this system asks whether it helps users understand their money faster. The aesthetic risk taken here is **semantic color as the primary personality layer** — blue for balance, green for income, red for expense, amber for transfer — carried consistently from button variants through stat figures, category icons, and glow effects. Nothing is colored arbitrarily.

## Colors

### Brand / Semantic Palette

The palette maps directly to financial transaction types. This is the system's defining characteristic: a reader can scan any card and know the financial meaning of a colored element before reading the label.

| Token | Hex | Meaning |
|---|---|---|
| `brand-balance` | `#3B82F6` | Balance, primary actions, trust |
| `brand-income` | `#10B981` | Income, positive states, success |
| `brand-expense` | `#EF4444` | Expenses, deletion, danger |
| `brand-transfer` | `#F59E0B` | Transfers, pending, warnings |
| `brand-category` | `#8B5CF6` | Category tags, neutral accent |

Each brand color has a matching **chromatic glow** (`--glow-*`) used on CTA buttons and highlighted stat figures, and a **tinted well** (`--well-*`, 10% opacity) for icon backgrounds and chip fills.

### Neutral Foundation

Slate-based scale (`neutral-50` → `neutral-900`). Light mode: `#F8FAFC` background, `#FFFFFF` card surface. Dark mode: `#0F172A` background, `#1E293B` card surface.

### Do's and Don'ts

- **Do** use brand colors to convey financial meaning — always the same color for the same type.
- **Don't** use more than one brand accent per card element; tinted wells handle background fills to avoid saturation clash.
- **Do** ensure numerical data meets WCAG AA contrast against its surface.
- **Don't** use brand colors for pure decoration; every colored element must have semantic meaning.

## Typography

Single-family system: **Geist** for all text, **Geist Mono** for numerical data.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display | 30px / 1.1 lh | 600 | Section totals, stat figures |
| Heading | 18px / 1.25 lh | 600 | Card titles, page headers |
| Body | 14px / 1.5 lh | 400 | Descriptions, labels |
| Mono | 14px / 1.5 lh | 400–600 | All currency figures, dates |

**Monetary amounts always use Geist Mono** with `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1, "zero" 1`. This keeps currency columns aligned and disambiguates `0` from `O`.

## Layout

4px base grid. Card-based layout.

- **Dashboard:** `max-w-7xl` (1280px), 24px gaps between cards.
- **List pages:** `max-w-4xl` (896px).
- **Auth / dialogs:** `max-w-md` (448px).
- **Sticky header:** 64px height.
- **Mobile margins:** 16px. **Desktop margins:** 32px.

Cards are the primary unit of organization with `24px` internal padding (`--space-6`). Section gaps are `32px` (`--space-8`).

## Elevation & Depth

Five shadow levels (`xs` → `xl`) built on `rgba(15,23,42, ...)` — slate-900 tinted, not pure black. Cards sit at `sm`. Modals and dialogs lift to `lg` or `xl`.

**Chromatic glows** are reserved for interactive emphasis: CTA buttons and active stat figures emit a soft colored bloom (35% opacity, `-6px` spread) matching their brand color. This is the system's most distinctive elevation move — depth and semantics in one rule.

## Shapes

Soft radii throughout. No sharp corners on any interactive element.

| Token | Value | Used on |
|---|---|---|
| `sm` | 4px | Nested row highlights |
| `md` | 6px | Buttons, small inputs |
| `lg` | 8px | Chips, icon tiles |
| `xl` | 12px | Inputs, soft tiles |
| `2xl` | 16px | Cards, dialogs |
| `full` | 9999px | Pills, avatars, progress bars |

## Components

### Buttons

Seven semantic variants. Accent variants (`balance`, `income`, `expense`, `transfer`) carry the brand color as background with white text. `cta` is `balance`-colored with `border-radius: 2xl`, the chromatic glow, and a subtle scale-up on hover — reserved for primary page actions. `outline` and `ghost` are neutral secondary actions.

Three sizes: `sm` (32px), `md` (36px, default), `lg` (40px).

### Cards

White surface (`#FFFFFF`), `border-radius: 2xl` (16px), `padding: 24px`, 1px `neutral-200` border, `shadow-sm`. Hover-lift variant scales to `shadow-md` — used for clickable card rows.

### Stat Figures

Monetary values displayed in Geist Mono at display scale. Tone prop (`balance` / `income` / `expense` / `transfer`) applies the matching brand color and optional glow. Negative values auto-apply `expense` tone when no explicit tone is set.

### Badges / Chips

Pill-shaped (`border-radius: full`). Background uses the matching `--well-*` tinted fill; text uses the full-opacity brand color. Never use solid brand-color backgrounds on chips — the well keeps visual weight balanced in dense list views.

### Progress Bars / Meters

Full border-radius. Fill color matches the relevant brand tone. Track is `neutral-100`.

### Dialogs / Modals

`max-w-md` container, `border-radius: 2xl`, `shadow-xl`. Backdrop: `rgba(15,23,42,0.4)` — not glass blur (reduces paint cost on mobile). On mobile, dialogs become bottom sheets.

## Accessibility

- All interactive elements: visible focus ring — `0 0 0 1px var(--ring)` where `--ring` is `brand-balance`.
- `prefers-reduced-motion`: disable scale transforms and glow transitions, keep color and opacity changes.
- Disabled state: `opacity: 0.5`, `pointer-events: none` — no brand color changes needed.
- Dark mode: toggled via `.dark` class on `<html>`. Surface and background tokens invert; brand colors unchanged (already pass contrast on dark surfaces).
