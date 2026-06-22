# Dashboard design fidelity: reference governs treatment, CDS governs tokens

## Status

Accepted (2026-06-21)

Refines [ADR 0005](0005-adopt-calculoides-design-system.md). Does not supersede it.

## Context

PR #93 redesigned the dashboard. On review against the design reference
(`.knowledge/screenshots/dashboard_design.png` vs the shipped
`.knowledge/screenshots/dashboard.png`), the build felt "missing a lot."
Investigation showed the gap is **not** missing capability:

- The data layer already exposes everything the reference needs —
  `MemberSummary.spent` / `remainingQuota`, `Summary.totalSpent`, and a
  nullable `Category.icon` field.
- CDS primitives already exist for every visual element — `Avatar` /
  `AvatarGroup`, `Badge` (with tones + dot), `ProgressMeter` (with a 3-state
  urgency machine), `StatFigure`, `MemberBar`.

The design vocabulary was simply **applied to one widget only**: `BudgetCategories`
adopted `Avatar`, while `IncomeOverview` / `RemainingBalance` (via `MemberBar`),
`RecentExpenses`, and `BudgetTransfers` fell back to colour dots and plain text.
Two formatting/data choices also diverged from the reference (`de-DE` currency,
freeform emoji category icons). The divergence was hidden in review because the
test group used bare data (`asdasd`, six unnamed members, one category, zero
transfers).

ADR 0005 established the CDS as the source of truth for primitives but did not
state what governs when the design reference and the CDS disagree on an
**element's treatment** (e.g. avatar chips vs dots, traffic-light bars vs calm
bars, multi-hue category tiles vs one brand colour).

## Decision

**The design reference governs which elements appear and how rich each row is.
The CDS governs the tokens those elements are built from (colour, typography,
spacing, icon set). When the two conflict on a token-level choice, the CDS wins.**

This produces the following concrete rulings for the dashboard.

### Stable member colour index, threaded app-wide

A member's avatar colour and initial are keyed by a **stable per-group index**
(join order), computed once in `DashboardPage` and threaded into every widget.
`MemberBar` accepts an explicit per-member `colorIndex` (defaulting to array
position for back-compat) rather than colouring by array position. One person =
one colour = one initial in every panel — income bar segment, balance card,
expense tag, transfer chip. Avatar sizes: `xs` in the income legend, `sm` in
balance/expense/transfer rows, `AvatarGroup max={4} size="sm"` in the header.

### Spent / left / % uses the CDS urgency machine (CDS over reference)

The reference keeps progress bars calm and carries warnings in pills. We
**override toward the CDS** here: wire `ProgressMeter`'s `state` to the
spent-vs-budget ratio — `<80%` on-track (green), `80–100%` behind (amber),
`>100%` blocked (red) — with the `Badge` pill tone matching. Member rows replace
the cramped 10px `Budget | Spent` line with a `Badge` pill plus a spent/left
figure.

### Single `brand-category` violet for category tiles

The reference shows distinctly-coloured category tiles, but CDS defines only one
`--color-brand-category`. We **do not** introduce a category palette. Every
category tile uses the violet `brand-category` token at `/10` tint. CDS wins
over the reference's multi-hue look.

### Constrained CDS lucide icon set for categories, with legacy fallback

`Category.icon` currently stores a freeform emoji. We replace this with a small
**keyed lucide map** (`rent→Home`, `groceries→ShoppingCart`, `utilities→Plug`…);
`Category.icon` stores the key, rendered as a `text-brand-category` glyph in the
violet tile. The create/edit form becomes a picker. Unknown or legacy (emoji)
values fall back to a `Folder` lucide glyph so existing rows never render broken
before a data backfill.

### Currency format: `en-IE`

`formatCurrency` switches locale `de-DE` → `en-IE`, yielding `€8,420.00`
(symbol-prefix, comma-thousands, dot-decimal) to match the reference. This is a
locale choice, not a CDS token; the reference is taken as the design intent.

### Avatars on expenses and transfers require an additive API extension

To render correct, stable avatars and per-category icons on expense and transfer
rows — rather than resolving members by name, which reintroduces the very drift
the stable-index rule forbids — extend the summary payload:

- `RecentExpense` gains `payerId` + `categoryId`
- `Transfer` gains `fromMemberId` + `toMemberId`

Expense rows then render the category lucide tile (not a fixed `Receipt`), the
amount in `text-brand-expense`, and an `Avatar` + `Badge` category tag. Transfer
rows render `Avatar` → `Avatar` chips with the amount in `text-brand-transfer`.

## Consequences

- A single API pass adds `payerId`/`categoryId` to `RecentExpense` and
  `fromMemberId`/`toMemberId` to `Transfer`; member `index` becomes resolvable
  from the summary.
- A rendering pass applies avatars + stable `colorIndex`, spent/left urgency
  pills, the category lucide-key tile, and the header `AvatarGroup` across all
  dashboard widgets — no new inline implementations (per ADR 0005).
- `formatCurrency` is a one-line locale change.
- Existing `Category.icon` emoji values are covered by the `Folder` fallback and
  should be backfilled to keys later; this is not blocking.
- Dashboard QA must use seeded, realistic data (named members, multiple
  categories, transfers present) — bare data hid this entire class of gap once
  already.

## Rejected alternatives

- **Reference as full authority (pixel-match the mock).** Rejected: the mock's
  freeform emoji and multi-hue tiles conflict with the CDS token discipline from
  ADR 0005. Treatment fidelity, yes; token fidelity, no.
- **New `--color-category-1..N` palette** mirroring the member palette, so each
  category tile is a distinct hue. Rejected in favour of the single
  `brand-category` violet — fewer tokens, and category/member colour collisions
  are avoided in the expense rows where both appear.
- **Resolve expense/transfer members by name** instead of extending the API.
  Rejected: name collisions (shared first names, renamed categories) desync the
  avatar colour and icon, defeating the stable-index invariant; the additive API
  change is small and robust.
- **Full urgency traffic-lighting only via the pill, calm bars** (a hybrid).
  Rejected in favour of wiring the bar `state` directly, since the CDS already
  ships the bar-level urgency machine.
