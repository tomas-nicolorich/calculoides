# Dashboard row presentation refinements: expense marker, urgency text, member share pill

## Status

Accepted (2026-06-24)

Partially supersedes [ADR 0007](0007-dashboard-design-fidelity.md) — two rulings only. The other three ADR 0007 rulings (stable member colour index, single `brand-category` violet, `en-IE` currency) remain authoritative.

## Context

Issue #104 aligned the dashboard against the design reference (`.knowledge/calculoides-app/project/app/dashboard.jsx`). During review, two rulings from ADR 0007 were found to produce a worse result in practice than the alternatives:

1. **Urgency bar + Badge pill.** ADR 0007 wired `ProgressMeter`'s `state` to the spend ratio and added a matching `Badge` pill on the member row. In a dense two-line member row the pill adds visual weight without adding information the "X left / X over" text does not already carry.

2. **`CategoryIconTile` + `<Badge tone="category">` on expense rows.** ADR 0007 specified rendering the category's lucide icon tile and a category Badge on each recent-expense row. In practice this makes expense rows read as category tiles rather than money-out events; a universal expense marker communicates the list's purpose more directly.

A third pattern — the **Category Member Share** displayed as a percentage next to the member's name in a budget category row — had no prior ruling. Rendering it as a plain text span loses the member identity signal that the share's value carries.

## Decision

### 1. Urgency bar without pill; left/over text tracks bar colour

`ProgressMeter` on member rows is wired to the spend-vs-budget ratio using the existing `state` prop:

| Spend ratio | `state`     | Bar colour        | "X left" / "X over" text colour |
|-------------|-------------|-------------------|----------------------------------|
| < 80 %      | `on-track`  | `brand-income`    | `text-brand-income` (green)      |
| 80 – 100 %  | `behind`    | `brand-transfer`  | `text-brand-transfer` (amber)    |
| > 100 %     | `blocked`   | `brand-expense`   | `text-brand-expense` (red)       |

No `Badge` pill accompanies the bar. The colour-matched text is the only urgency signal alongside the bar fill.

*Supersedes ADR 0007 §"Spent / left / % uses the CDS urgency machine" (the bar-state wiring is kept; the Badge pill requirement is removed).*

### 2. Receipt icon + plain text for expense rows

Recent-expense rows render:
- A `<Receipt>` lucide icon in `text-brand-expense` as the row marker — not `CategoryIconTile`.
- The category name as a plain `<span>` — not `<Badge tone="category">`.

The category name is still present in the sub-line alongside the payer's first name; it is simply unstyled text rather than a pill.

*Supersedes ADR 0007 §"Avatars on expenses and transfers require an additive API extension" — the `CategoryIconTile` and `Badge` category tag requirements are removed. The `payerId` / `categoryId` API extension and stable `colorIndex` threading remain required.*

### 3. Category Member Share as a member-coloured pill

The **Category Member Share** on each member row inside the Budget Categories Accordion is rendered as a small pill:
- Background: dark neutral (`bg-slate-700 dark:bg-slate-800`), no border.
- Text: the member's stable avatar colour, applied as an inline `color` style (same CSS variable as the avatar background).
- Format: `share.toFixed(1) + "%"` (one decimal place).

This ties the share figure visually to the member's identity colour without introducing a new Badge tone.

## Consequences

- `ProgressMeter` on all member rows uses `state` (urgency) rather than a static `tone`. The `data-state` attribute is present on the progressbar element and can be used in tests.
- `Badge` with `tone="category"` is no longer rendered on expense rows; tests asserting its presence are removed.
- `CategoryIconTile` is no longer rendered on expense rows; the `categories` prop is not required by `RecentExpenses`.
- The Category Member Share pill requires the member's colour CSS variable at render time; the stable `colorIndex` → colour lookup already threaded from `DashboardPage` supplies this.
- "X left" is now green when the member is comfortably within budget — a deliberate choice to make all three urgency states consistent and legible rather than reserving colour only for warnings.

## Rejected alternatives

- **Badge pill alongside urgency bar.** Rejected: redundant signal in a space-constrained row; ADR 0007's original motivation (CDS urgency machine should be authoritative) still holds — we keep the bar state, we drop the pill.
- **`brand-income` tint pill for share % (light background, coloured text).** Rejected: dynamic Tailwind arbitrary values with CSS custom properties are fragile; solid dark background with coloured text is simpler and reads with equal clarity.
- **Neutral text on "X left" when on-track.** Rejected by user preference: all three urgency states mirror the bar fill colour, making the pattern uniform and predictable.
