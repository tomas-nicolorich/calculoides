# Visual weight reduction: fonts, borders, and icon buttons

## Status

Accepted

## Context

The v2 dashboard and savings pages were built with pervasive `font-bold` throughout — on totals, section labels, and small status text alike. Combined with `border-l-4` left accents on cards, layered borders on nested rows, and icon buttons with permanent background containers, the overall UI felt heavy relative to the v1 design it replaced.

Three patterns were identified as the main contributors:

1. **Font weight** — `font-bold` used uniformly for primary figures (`text-3xl`) and section labels (`text-[10px] uppercase tracking-widest`).
2. **Border layering** — `border-l-4` accents on cards, plus individual `border` on every nested member row, creating two visible border layers inside a single card.
3. **Icon buttons** — small action icons (edit, delete, back) carried permanent `bg-slate-100 dark:bg-slate-800 rounded-xl` backgrounds regardless of hover state.

## Decision

Apply targeted weight reductions across the component library:

- **Totals and primary figures**: `font-bold` → `font-semibold`. Size unchanged.
- **Section labels** (`text-[10px] uppercase tracking-widest` pattern): `font-bold` → `font-medium`. Uppercase and tracking kept.
- **Left accent borders**: `border-l-4` → `border-l-2`.
- **Nested member/item rows**: remove individual `border` — use background fill (`bg-slate-50 dark:bg-slate-900/50`) to separate rows instead.
- **Icon buttons**: remove permanent background containers. Show background only on hover/focus.

## Consequences

- The status signal from colored left accents is preserved; only the thickness changes.
- Row separation relies on background fill contrast rather than borders, so dark-mode fill values must be chosen carefully to remain visible.
- Icon buttons will rely on hover state for affordance — appropriate for secondary actions the user already knows exist (edit, delete).

## Rejected alternative

Keeping `font-bold` only for totals and reducing it everywhere else was considered. Rejected because the semibold / bold distinction at large sizes (`text-3xl`) is subtle enough that a consistent rule (`font-semibold` for all primary figures) is easier to apply and maintain than a size-conditional one.
