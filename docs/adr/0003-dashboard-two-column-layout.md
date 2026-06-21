# Dashboard uses a two-column grid on desktop, three columns on extra-large screens

## Status

Accepted (amended 2026-06-05, 2026-06-19)

## Context

The v2 dashboard used a three-column top row (Income Overview, Remaining Balance, Expenses side by side) with a two-column row beneath (Budget Categories, Budget Transfers). The three-column layout caused two problems:

1. Cards in the same row stretched to the height of the tallest sibling (CSS grid default), leaving visible empty space at the bottom of shorter cards.
2. Three equal-weight hero widgets diluted each other — no clear visual hierarchy between primary summaries and secondary detail.

## Decision

Cap the dashboard grid at two columns. Apply `align-items: start` to all grid rows so cards size to their content rather than the row height.

Widget arrangement:

- **Row 1** (2 columns): Income Overview | Remaining Balance
- **Row 2** (full width): Budget Categories
- **Row 3** (2 columns): Expenses | Budget Transfers

Income Overview and Remaining Balance are the two primary financial summaries and share the hero row. Budget Categories is complex enough (nested per-member rows, edit/delete actions) to benefit from the full width. Expenses and Budget Transfers are secondary and share the bottom row.

The income stacked bar chart and per-member breakdown inside Income Overview and Remaining Balance are retained from v2 — they are genuine improvements over v1.

## Consequences

- Budget Categories will render wider than in v2, giving its nested rows more breathing room.
- On narrow viewports the grid already collapses to single column; this decision has no effect on mobile layout.

## Amendment (2026-06-05)

Three-column layout is reinstated at `xl` viewports and above. The two original objections are resolved at this breakpoint: `align-items: start` eliminates height stretching, and at `xl` widths the additional breathing room reduces the visual-hierarchy concern. Two columns remains the default at `md`–`lg`. At `xl`+ the arrangement becomes: Row 1 → Income Overview, Remaining Balance, Recent Expenses; Row 2 → Budget Categories (full width); Row 3 → Budget Transfers.

## Amendment (2026-06-19)

The dashboard moved to an **asymmetric** column structure, and this amendment records it as the canonical layout (superseding the row-based arrangement described above):

- **Right column**: Budget Categories, always its own full-height column. Its nested accordion (see ADR 0006) makes it the tallest, most interactive widget, so it owns a dedicated column rather than a full-width row.
- **Left region**: the four summary/detail widgets (Income Overview, Remaining Balance, Recent Expenses, Budget Transfers) stacked in a single column at `md`–`lg`, flowing into multiple columns only at `3xl`.

Concretely: `grid-cols-1` (mobile) → `lg:grid-cols-2` (left stack | categories) → `3xl:grid-cols-3` (left region splits to two columns, categories still full-height on the right). `align-items: start` is retained throughout.

The strict two-column variant (left stack never splits, even on very wide screens) from the redesign mock was **rejected** — it wastes horizontal space at `3xl` and conflicts with the established preference for three columns on large displays.

## Rejected alternative

Three columns at `md`/`lg` desktop was rejected because of the empty-space artifact and because it flattened the visual hierarchy between primary summaries and detail widgets.
