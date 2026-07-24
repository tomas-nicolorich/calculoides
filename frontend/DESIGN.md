---
name: Calculoides Modern
description: Design system for a household budget management app — financial clarity through semantic color, geometric type, and controlled depth.
colors:
  # Brand palette — each maps to a financial transaction type
  brand-balance: "#2563EB"      # blue-600 — balance, trust, primary actions
  brand-income:  "#10B981"      # emerald-500 — income, positive states, success
  brand-expense: "#EF4444"      # red-500 — expenses, deletion, danger
  brand-transfer: "#F59E0B"     # amber-500 — transfers, pending, warnings
  brand-category: "#8B5CF6"     # violet-500 — category tags, neutral accent
  # Member identity palette — stable per-member colour by join order (Avatar, AvatarGroup, MemberBar)
  # Darkened from the base Tailwind 500 shades so white avatar initials always clear WCAG AA (4.5:1)
  member-1: "#047857"
  member-2: "#2563EB"
  member-3: "#7C3AED"
  member-4: "#B45309"
  member-5: "#E11D48"
  member-6: "#0E7490"
  member-7: "#C2410C"
  member-8: "#DB2777"
  member-9: "#4F46E5"
  member-10: "#0F766E"
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
  neutral-950: "#020617"
  # Semantic surfaces
  background: "#F8FAFC"         # light mode page background
  surface-card: "#FFFFFF"       # card / dialog surface
  surface-dark: "#020617"       # dark mode page background (slate-950)
  surface-card-dark: "#0F172A"  # dark mode card surface (slate-900)
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
  caption:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: 500
rounded:
  sm:   4px    # nested row corners
  md:   6px    # buttons (sm/md sizes)
  lg:   8px    # chips, icon tiles
  xl:   12px   # inputs, soft tiles, large buttons
  2xl:  16px   # cards, dialogs, dropdown menus
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
  xl:  "0 20px 25px -5px rgba(15,23,42,0.12), 0 8px 10px -6px rgba(15,23,42,0.08)"
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
  button-balance:
    backgroundColor: "{colors.brand-balance}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-income:
    backgroundColor: "{colors.brand-income}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-expense:
    backgroundColor: "{colors.brand-expense}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-transfer:
    backgroundColor: "{colors.brand-transfer}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-cta:
    backgroundColor: "{colors.brand-balance}"
    textColor: "#FFFFFF"
    rounded: "{rounded.2xl}"
    height: 36px
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-700}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-700}"
    rounded: "{rounded.md}"
    height: 36px
    padding: "0 16px"
  icon-button:
    backgroundColor: "transparent"
    rounded: "{rounded.lg}"
    height: 36px
    width: 36px
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-900}"
    rounded: "{rounded.xl}"
    height: 36px
    padding: "0 12px"
  badge:
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Calculoides Modern

## Overview

**Creative North Star: "The Semantic Ledger"**

Calculoides treats color as vocabulary, not decoration. Every financial concept in the product — balance, income, expense, transfer, category — has exactly one color, and that color means the same thing everywhere it appears: a button, a stat figure, a progress meter, a category icon well, a chromatic glow. A user who has never read a label can still tell a positive figure from a warning at a glance. This is the system's one aesthetic risk, and it is deliberate: **clarity first, personality second**.

Around that ledger, the rest of the system stays quiet on purpose. Geometric, single-family type (Geist) keeps text calm; tabular Geist Mono keeps every currency column aligned and honest. Slate neutrals carry structure without competing with the semantic palette. Depth is soft and slate-tinted rather than pure black, except for one deliberate flourish — the chromatic glow — reserved for the handful of moments (the primary CTA, an active stat figure) that most deserve emphasis.

**Key Characteristics:**
- One color per financial meaning, used consistently across every surface that shows it
- A distinct, stable per-member identity palette (10 colors) layered on top of the transaction-type palette, for group/avatar contexts
- Geist + Geist Mono as the only two type families; mono reserved exclusively for money and dates
- Slate-tinted shadows everywhere except one un-tinted outlier (see Elevation & Depth) — a gap to close, not a second system
- Soft, consistent radii; no sharp corners on any interactive element

## Colors

The palette is small and disciplined: five semantic brand hues, a ten-color member-identity ramp, and a slate neutral scale. Nothing outside those three groups.

### Primary

- **Balance Blue** (`#2563EB`): the system's primary action color — trust, the default account state, primary buttons, primary focus rings.

### Secondary

- **Income Emerald** (`#10B981`): positive states, income figures, "on-track" progress, success confirmations.
- **Expense Red** (`#EF4444`): expenses, deletion, "blocked"/over-budget states, danger actions.
- **Transfer Amber** (`#F59E0B`): transfers, pending states, "behind" progress warnings.

### Tertiary

- **Category Violet** (`#8B5CF6`): category tags and the one neutral accent not tied to a transaction direction.

### Neutral

Slate scale, `neutral-50` → `neutral-950`. Light mode: `#F8FAFC` background, `#FFFFFF` card surface, `#0F172A` primary text. Dark mode: `#020617` (slate-950) page background, `#0F172A` (slate-900) card surface, `#F8FAFC` primary text.

### Named Rules

**The One Meaning Rule.** A brand color is never used for pure decoration. If an element is blue, green, red, amber, or violet, that color is asserting something specific about a financial transaction type — never applied for visual variety alone.

**The Single Accent Rule.** No card element carries more than one brand accent at a time. Tinted wells (`well-*`, 10% opacity) exist specifically so an icon or chip background can carry brand meaning without competing with a second, full-opacity brand color nearby.

## Typography

**Display / Body Font:** Geist (with `ui-sans-serif, system-ui` fallback stack)
**Mono Font:** Geist Mono (with `ui-monospace, "SF Mono", Menlo, Consolas` fallback stack)

**Character:** A single geometric sans carries all text so the system reads as one calm voice; Geist Mono's tabular figures are the only typographic "special effect," reserved entirely for money.

### Hierarchy

- **Display** (600, 30px, 1.1 lh): section totals, the largest stat figures (`StatFigure` size `lg`).
- **Heading** (600, 18px, 1.25 lh): card titles, dialog titles, page headers.
- **Body** (400, 14px, 1.5 lh): descriptions, form labels, list rows.
- **Mono** (400–600, 14px, tabular-nums): every currency figure and date, without exception.
- **Caption** (500, 11px, uppercase or plain): avatar initials at `xs` size, `Badge` `sm` size text, grouped-list micro-labels (e.g. `IconPicker` group headers). The one documented step below Body; don't reach for an arbitrary `text-[Npx]` value smaller than this.

### Named Rules

**The No-Estimation Rule.** Monetary amounts always render in Geist Mono with `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1, "zero" 1`. This keeps currency columns aligned in tables and disambiguates `0` from `O` — never render a number in the display/body proportional face.

## Layout

4px base grid, card-based composition throughout.

- **Dashboards:** `max-w-7xl` (1280px), 24px gaps between cards.
- **List pages** (Groups, Expenses, Transfers): `max-w-4xl` (896px).
- **Auth screens / dialogs:** `max-w-md` (448px).
- **Sticky header:** 64px height, `bg-white/80` (`slate-900/80` dark) with `backdrop-blur-md`, bottom 1px border.
- **Mobile margins:** 16px (`p-4`). **Desktop margins:** 32px (`p-8`).

Cards are the primary unit of organization with 24px internal padding. Section gaps run 32px.

## Elevation & Depth

Six shadow levels (`xs` → `xl`) built on `rgba(15,23,42, …)` — slate-900 tinted, not pure black. Cards sit at `sm`, lifting to `md` on hover for clickable rows. Dialogs and popups sit at `xl`.

**Chromatic glows** are reserved for the system's highest-emphasis moments: the `cta` button variant and tone-colored stat figures emit a soft colored bloom (35% opacity, `-6px` spread) matching their brand color. One glow per screen, on the single most important action — this is the system's most distinctive elevation move.

### Named Rules

**The Un-Tinted Outlier.** The dropdown menu (`HamburgerMenu`) currently renders with Tailwind's default `shadow-2xl` (`0 25px 50px -12px rgb(0 0 0 / 0.25)`), which is pure black rather than slate-900-tinted like every other shadow in the system. This is a drift, not a rule: treat it as a fix-forward item, not a second elevation family.

## Shapes

Soft radii throughout; no sharp corners on any interactive element.

| Token | Value | Used on |
|---|---|---|
| `sm` | 4px | Nested row highlights |
| `md` | 6px | Buttons (`sm`/`md` sizes) |
| `lg` | 8px | Icon buttons, category icon tiles |
| `xl` | 12px | Inputs, large buttons (`lg` size) |
| `2xl` | 16px | Cards, dialogs, dropdown menus |
| `full` | 9999px | Pills/badges, avatars, progress bars |

## Components

### Buttons

Seven semantic variants, three sizes. `balance`, `income`, `expense`, and `transfer` are solid accent variants — brand-color background, white text. `cta` is `balance`-colored with `rounded-2xl`, the `glow-balance` shadow, and a `scale(1.02)` lift on hover — reserved for one primary action per screen. `outline` and `ghost` are neutral secondary actions.

- **Sizes:** `sm` (32px, `rounded-md`), `md` (36px default, `rounded-md`), `lg` (40px, `rounded-xl` — the one size that steps up a radius tier).
- **Focus:** `focus-visible` ring, 2px, `brand-balance`, 2px offset against the card surface.
- **Disabled:** 50% opacity, pointer-events removed.

### Icon Buttons

Square, `rounded-lg`, transparent by default. Five hover-tint variants — `balance` / `income` / `expense` / `transfer` / `neutral` — tint the icon color only on hover; an optional `bordered` prop adds a card surface, border, and `shadow-sm` for icon buttons that need to read as their own control (e.g. the hamburger trigger).

### Cards

White surface (`#FFFFFF` / `slate-900` dark), `rounded-2xl` (16px), 24px padding, 1px `neutral-200` border, `shadow-sm`. An optional colored accent edge (3px, left or top) in a semantic tone marks a card's transaction type. Hover-lift variant steps to `shadow-md` — use for clickable card rows only.

### Inputs

`rounded-xl` (12px), 36px height, 1px `neutral-200` border, `shadow-xs` at rest. Focus state: border shifts to `brand-balance` with a 1px matching ring (note: inputs use a 1px focus ring; buttons use 2px — this is an intentional weight difference between form fields and controls, not an inconsistency to fix). An optional `prefix` slot (e.g. a currency symbol) left-pads the field.

### Stat Figures

Monetary values in Geist Mono at display scale (`sm` 18px / `md` 24px / `lg` 30px, default `lg`). Tone prop (`balance` / `income` / `expense` / `transfer` / `primary`) sets the figure color; `primary` (default) uses plain neutral text for values with no inherent direction.

### Badges / Chips

Pill-shaped (`rounded-full`), two sizes. Background uses the matching `well-*` tinted fill; text and border use the full-opacity brand color at the matching tone (`income` / `balance` / `expense` / `transfer` / `category` / `neutral`). Never use a solid brand-color background on a badge — the tinted well keeps visual weight balanced in dense list views. Optional leading dot in the current text color.

### Avatars

Circular (`rounded-full`), four sizes (24/34/42/50px). Background comes from the 10-color member-identity palette via a stable `colorIndex` (join order) so a member keeps the same color everywhere — Avatar, AvatarGroup, and MemberBar all read from the same palette. Initials are always white; the member-identity palette is pre-darkened (see `colors` above) so white text clears WCAG AA against every swatch, and an explicit `color` override is darkened further at render time if needed rather than falling back to dark text. `AvatarGroup` overlaps avatars with a 2px card-colored ring and collapses overflow into a `+N` chip past a `max` count.

### Member Bar / Progress Meters

`MemberBar` renders a segmented horizontal bar (each member's income share as a proportional segment, colored from the member-identity palette) plus an optional legend. `ProgressMeter` is a single-fill track (`neutral-100` background) whose fill color is either a static semantic tone or an urgency `state` (`on-track` → income green, `behind` → transfer amber, `blocked` → expense red, overriding tone when set).

### Navigation

A single hamburger-trigger dropdown (Base UI `Menu`), not a persistent nav bar or sidebar. Trigger is a bordered `IconButton` (`lg`, neutral hover) in the sticky header. Popup: `rounded-2xl`, `w-64`, grouped items with a leading Lucide icon (neutral, tinting to `brand-balance` on hover) and a label; the destructive "Sign Out" item hover-tints red instead. See the Named Rule above regarding this popup's un-tinted shadow.

### Dialogs / Modals

Two primitives exist; pick deliberately:

- **`Dialog`** — fixed, centered, `max-w-md`, `rounded-2xl`, `shadow-xl`. Desktop-only positioning; does not adapt below the `md` breakpoint. Use for simple, desktop-weighted confirmations.
- **`ResponsiveDialog`** — the mobile-aware primitive. Centered modal at `≥768px`; below that, becomes a bottom sheet (`rounded-t-2xl`, `max-h-[90vh]`, slide-in-from-bottom). Use this for any dialog reachable from a primary mobile flow.

**Backdrop:** `bg-slate-900/50` (`slate-900/80` dark) with `backdrop-blur-sm` is the documented standard, matching `ResponsiveDialog`. `Dialog.tsx` currently uses `bg-black/40` instead — a known drift to fix in code, not a second accepted backdrop.

## Do's and Don'ts

### Do:
- **Do** use a brand color to assert a specific financial meaning — balance, income, expense, transfer, category — never for plain decoration.
- **Do** use the member-identity palette (10 stable colors, keyed by join-order `colorIndex`) everywhere a specific person needs to stay visually consistent — Avatar, AvatarGroup, MemberBar.
- **Do** render every monetary value in Geist Mono with tabular figures.
- **Do** reserve the chromatic glow + `cta` button variant for one primary action per screen.
- **Do** use `ResponsiveDialog` (not `Dialog`) for any modal reachable from a primary mobile flow.

### Don't:
- **Don't** put more than one full-opacity brand accent on a single card element; use a `well-*` tint for the second.
- **Don't** use a solid brand-color background on a badge/chip — always the tinted well plus full-opacity text.
- **Don't** use `bg-black/40` for a dialog backdrop — the documented standard is `bg-slate-900/50` (`/80` dark) with `backdrop-blur-sm`.
- **Don't** invent a generic `--ring` focus token — buttons and icon buttons use a 2px `brand-balance` ring with 2px offset; inputs use a 1px `brand-balance` ring. This weight difference is intentional.
