# Dashboard design alignment

Make the live dashboard match the design reference. Source of truth for copy
and structure: `.knowledge/calculoides-app/project/app/dashboard.jsx` (runnable
design). `pop.png` (inline transfer popover) is an older snapshot and is
**superseded** by the centered dialog in that source.

## Scope

Pure layout / style / copy. **No API or data-model work** — every value the
design shows already exists in the current data:

- per-member-per-category `quota` / `spent` / `remainingQuota`
  (`shared/src/schemas/redesign.ts` `CategoryBalanceSchema`)
- per-member `income` / `share` / `colorIndex` (`DashboardMemberSchema`)

All needed DS primitives already exist: `StatFigure`, `ProgressMeter`,
`MemberBar` (dot legend built in), `Avatar`, `Badge`.

No ADR / CONTEXT.md change — no new domain terms, no hard-to-reverse trade-off.

## Global token changes

1. **Base font 16px → 15px.** `frontend/src/app/index.css`, `@layer base`:
   add `html { font-size: 15px; }`. All rem-based Tailwind sizes scale
   proportionally (inputs/selects included).
2. **Avatar `xs` 24px → 20px.** `frontend/src/shared/ui/Avatar.tsx` size map:
   `xs: "h-6 w-6 text-[10px]"` → `xs: "h-5 w-5 text-[9px]"`. Leave
   `sm`/`md`/`lg` (32/40/48) untouched — only the transfer dialog uses `sm`.

## Per-widget changes

### IncomeOverview.tsx
- **#1** Big total: `StatFigure` → `tone="primary"` (neutral), drop
  income/balance tone.
- **#2** Delete the hand-rolled per-member Avatar list (currently ~L46-68).
  Render members through `MemberBar` with its legend enabled
  (`legend` default true) → colored dot + name + amount + `(share%)`.
- **#8** Card title `Income Overview`; stat label `Total Group Income`.

### RemainingBalance.tsx
- **#1** Big total: `StatFigure tone="primary"`.
- **#4** Each member quota row gets a subtle card bg (e.g.
  `rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2`).
- **#3** Member avatars use `xs` (now 20px).
- **#8** Title `Remaining Balance`; label `Total Group Remaining`. Row meta:
  `Income: {x}` (left) / `Budgeted: {x}` (right).

### RecentExpenses.tsx
- **#5** Row icon = red expense icon: lucide `receipt` with the `--expense`
  tone (red), **not** the category icon.
- **#6** Sub-line is one row: `xs avatar` + payer first name + dot separator +
  `categoryName`. Remove the category pill/Badge.
- **#8** Title `Recent Expenses`; widget head `Latest 5 spends` + `View All ›`
  link to expenses page.

### BudgetTransfers.tsx
- **#4** Each transfer row: subtle bordered card bg (design `ck-row--bordered`).
- **#3** Avatars `xs` (20px).
- **#8** Title `Budget Transfers`; head `Money moved between members`. Row:
  transfer icon (amber/`--transfer`), category name + amount, sub-line
  `from → to` with xs avatars.

### BudgetCategories.tsx
Category header (`CategoryItem`):
- **#9** Under the category name, render `ProgressMeter tone="category"` with
  `valueLabel="{spentPct}% spent"`. Remove the right-side spent pill. Keep
  budget amount on the right of the name row + chevron.

Member breakdown row:
- **#10** Top row, flex justify-between:
  - left: `xs avatar` + first name + optional `Custom` badge (if overridden)
  - right: transfer icon-button → percent (`share%`, member-colored) →
    budgeted amount
- Second row, justify-between: `Spent: {spent}` (left) /
  `{left} left` or `{over} over` (right, red when over)
- Then `ProgressMeter tone="income"` value=spent max=quota.
- **#4** Member row gets subtle card bg.
- **#8** Card title `Budget Categories`; head text
  `Shared buckets · each member's share is set by income. Expand to view and
  transfer.`; button `New Category`.

### Transfer Budget dialog (in BudgetCategories.tsx)
- **#12** Replace the **From** `Select` with a locked read-only line:
  `sm avatar` + `From {firstName} · {categoryName}`. The from-member is fixed
  to the row whose transfer button was clicked (no selector, even for owners).
  Keep **To Member** select (excludes the from-member) and **Amount** input.
- **#8** Title `Transfer Budget`; desc
  `Move budget from {firstName}'s share of {categoryName} to another member.`;
  submit button `Send Transfer`.

### Add Expense form (ExpenseForm.tsx)
- **#11** Category `Select` options: label = `c.name` only. Remove the
  `${c.icon ?? ""}` prefix concatenation.
- **#8** Dialog title `Add Expense`; desc
  `Log a spend against a category and the member who paid.`

### New Budget Category dialog
- **#8** Title `New Budget Category`; desc
  `Each member's contribution is calculated from their income share.`; note
  `This category applies to everyone unless you pick members.`; submit
  `Create Category`.

## Suggested commit slices

1. `style(frontend): global base font 15px + avatar xs 20px` (tokens)
2. `feat(dashboard): neutral stat totals + dot legend income overview` (#1,#2)
3. `feat(dashboard): subtle card bg on member rows` (#4 across 3 widgets)
4. `feat(dashboard): recent expenses red icon + inline category` (#5,#6)
5. `feat(dashboard): budget category meter-below-name + member row layout` (#9,#10)
6. `feat(dashboard): lock transfer From, drop expense category icon` (#11,#12)
7. `feat(dashboard): align card/form copy to design` (#8 everywhere)

Verify after each: `npm test -w frontend`, `npm run typecheck -w frontend`,
visual check against `.knowledge/screenshots/design_dashboard.png`.
