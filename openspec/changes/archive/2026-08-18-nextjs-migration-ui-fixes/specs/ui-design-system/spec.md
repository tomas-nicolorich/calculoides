# UI Design System Specification

## Purpose

The ported CDS (Calculoides Design System) primitive and money-visualisation
layer at `app/_ui/**`, giving Dashboard/Groups/nav a shared, semantic
vocabulary instead of ad hoc Tailwind (design.md ADR-1, ADR-2). Presentation
is ported verbatim from `main`'s `shared/ui/**`; only the data seam changes.

## Requirements

### Requirement: Primitives Live at `app/_ui/**` and Keep Their Ported Prop API

Ported primitives (Button, Card, Input, Select, Badge, Avatar/AvatarGroup,
IconButton, UserDisplay, Dialog, ResponsiveDialog, RowMenu, DatePicker,
IconPicker) MUST live under `app/_ui/**`, MUST keep `main`'s exact prop
names, and MUST be re-exported from a single barrel (`app/_ui/index.tsx`).
Consumers MUST NOT reimplement a covered primitive inline elsewhere in the
app.

#### Scenario: A widget consumes the barrel, not a bespoke element
- GIVEN a dashboard widget needs a button
- WHEN it is implemented
- THEN it imports `Button` from the `app/_ui` barrel rather than a raw `<button>` with hand-rolled classes

#### Scenario: Prop names match the ported source
- GIVEN `main`'s `Button` accepts a `variant` prop with a fixed vocabulary
- WHEN the ported `app/_ui/Button.tsx` is used
- THEN it accepts the same `variant` prop name and values, unrenamed

### Requirement: Button and Badge Use the Semantic Money Variant Vocabulary

`Button` and `Badge` MUST support the semantic variant set `income | balance
| expense | transfer | category`, mapping each to its designated color
token, rather than accepting only generic color-role variants.

#### Scenario: An income-related action uses the income variant
- GIVEN `IncomeOverview` renders a save action
- WHEN its button is styled
- THEN it uses `variant="income"`, not a hardcoded color class

#### Scenario: A transfer-related badge uses the transfer variant
- GIVEN `BudgetTransfers` renders a status badge
- WHEN it is styled
- THEN it uses `variant="transfer"` from the shared vocabulary

### Requirement: Money Visualisations Render Without a Charting Library

`StatFigure`, `MemberBar`, and `ProgressMeter` (`app/_ui/money/**`) MUST
render monetary figures and per-member proportions using CSS/DOM primitives
only — no `recharts`/`d3`/`chart.js`/equivalent dependency, matching the
zero-chart-library evidence from `main`'s pre-bundle.

#### Scenario: Member income split renders as a stacked bar
- GIVEN `IncomeOverview` needs a per-member income-share visualisation
- WHEN it renders `MemberBar`
- THEN the bar is a CSS stacked-segment element, not a chart-library canvas/SVG component

#### Scenario: Category progress renders via ProgressMeter
- GIVEN a budget category has a spent/budgeted ratio
- WHEN `BudgetCategories` renders that category's row
- THEN `ProgressMeter` renders the ratio without any charting dependency

### Requirement: `ResponsiveDialog` Is the One Sanctioned `useIsMobile()` Consumer

Unlike the shell's CSS-first branching (see `app-navigation-shell`),
`ResponsiveDialog` MAY use `lib/hooks/use-is-mobile.ts` to pick a
centered-dialog vs. bottom-sheet presentation, because the choice is made
while the dialog is closed and is correct by the time it opens (ADR-3).

#### Scenario: Desktop opens a centered dialog
- GIVEN `useIsMobile()` resolves `false`
- WHEN `ResponsiveDialog` opens
- THEN it renders as a centered modal dialog

#### Scenario: Mobile opens a bottom sheet
- GIVEN `useIsMobile()` resolves `true`
- WHEN `ResponsiveDialog` opens
- THEN it renders as a bottom sheet
