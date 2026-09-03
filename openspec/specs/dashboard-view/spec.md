# Dashboard View Specification

## Purpose

Full widget-parity dashboard at `app/(app)/dashboard/[groupId]/**`, replacing
the current lean placeholder (a bare group-name heading and category list)
with the five-widget, two-column composition from `main`'s `DashboardPage`.
Savings goals are a separate page (`/savings/[groupId]`, `SavingsGoalList`),
not a dashboard widget; the dashboard only prefetches `savingsGoals` as an
invisible cache warm-up for that next navigation. Underlying income/savings
math is governed by the existing `dashboard-income`,
`savings-goal-management`, and `savings-income-split-allocation` specs —
those scenarios are referenced here, not duplicated, and MUST continue to
hold on this implementation.

## Requirements

### Requirement: Dashboard Renders the Full Widget Set in a Two-Column Layout

The dashboard page MUST render `IncomeOverview`, `RemainingBalance`,
`BudgetCategories`, `BudgetTransfers`, and `RecentExpenses` composed in a
two-column layout, replacing the current placeholder's bare group-name
heading and flat category list. `SavingsGoalList` is NOT a dashboard
widget — it renders only on `/savings/[groupId]`; the dashboard's
`savingsGoals` prefetch exists solely to warm that route's cache ahead of
navigation (see "One Server Prefetch Feeds the Summary-Dependent Widgets"
below), not to display goals inline.

#### Scenario: All five widgets render for a populated group
- GIVEN a group with members, categories, expenses, and transfers
- WHEN `/dashboard/[groupId]` renders
- THEN `IncomeOverview`, `RemainingBalance`, `BudgetCategories`, `BudgetTransfers`, and `RecentExpenses` are all present

#### Scenario: Loading state precedes hydration, per independent region
- GIVEN the server has not yet resolved one or more of the `summary`, `categories`, or `savingsGoals` prefetches
- WHEN the page begins streaming
- THEN each of the three independent data regions shows its own `<Suspense>` fallback, and a slower region does not block a faster region from revealing — not a single page-level spinner blocking all five widgets

### Requirement: One Server Prefetch Feeds the Summary-Dependent Widgets

`app/(app)/dashboard/[groupId]/page.tsx` MUST prefetch `summary`,
`categories`, and `savingsGoals` server-side, each within its own
`<Suspense>` region and paired `dehydrate`/`HydrationBoundary`, so
`IncomeOverview`, `RemainingBalance`, `RecentExpenses`, and
`BudgetTransfers` — all four consumers of `queryKeys.summary` — hydrate
from that one shared `summary` prefetch/boundary instead of each firing
its own client-side fetch. The four summary consumers MUST NOT be split
across more than one `<Suspense>`/`HydrationBoundary` region; splitting
them would reintroduce a client-side waterfall.

#### Scenario: No client-side waterfall for summary-backed widgets
- GIVEN the server has prefetched `summary`
- WHEN the four summary-consuming widgets mount
- THEN none of them issues its own initial client fetch for summary data — they read the hydrated cache

#### Scenario: Independent regions elsewhere do not fragment the shared summary hydration
- GIVEN the dashboard renders three independent `<Suspense>` regions (`summary`, `categories`, `savingsGoals`)
- WHEN `categories` and `savingsGoals` stream in at different times than `summary`
- THEN all four `queryKeys.summary`-consuming widgets still hydrate together from the one shared `summary` region's prefetch, with no widget issuing its own client fetch

### Requirement: Widget-Level Loading Indicators Use Skeleton, Not Plain Text

`RecentExpenses`, `BudgetCategories`, `RemainingBalance`, and
`IncomeOverview` MUST render a `Skeleton`-shaped placeholder for any loading
state they own independently of the page-level `<Suspense>` fallback (e.g.,
a client-triggered refetch), rather than plain "Loading…" text.

#### Scenario: No widget renders literal loading text
- GIVEN any of the four reconciled widgets is in a loading state
- WHEN it renders
- THEN no plain-text "Loading…" string appears in its output

### Requirement: BudgetCategories Renders an Accordion With Per-Member Balances

`BudgetCategories` MUST render each category as an accordion row showing a
`ProgressMeter` and per-member balance breakdown, expandable/collapsible,
with its own empty and loading states independent of the other widgets.

#### Scenario: Expanding a category row shows per-member balances
- GIVEN a category with per-member balance data
- WHEN the user expands its accordion row
- THEN per-member balance rows render beneath it

#### Scenario: Zero categories renders an empty state, not an error
- GIVEN a group with no categories
- WHEN `BudgetCategories` renders
- THEN it shows an empty state and throws no error

### Requirement: BudgetCategories Mutations Invalidate the Group Cache

Category create, update, and delete MUST go through `lib/actions/category.ts`
Server Actions and, on success, invalidate `queryKeys.group(groupId)` so
every dependent widget reflects the change without a manual reload.

#### Scenario: Creating a category refreshes dependent widgets
- GIVEN the create-category dialog is submitted successfully
- WHEN the Server Action resolves
- THEN `queryKeys.group(groupId)` invalidates and `BudgetCategories` (and any other widget reading category data) reflects the new category

#### Scenario: Deleting a category is confirmed before the call fires
- GIVEN an expanded category row offers an inline Edit/Delete action pair (ported from `main`, not a "⋯" row menu)
- WHEN the user selects Delete
- THEN a confirmation step precedes the `deleteCategory` Server Action call — a single click does not itself delete

### Requirement: Budget Transfers Support Inline Creation

`BudgetTransfers` MUST support creating a transfer via
`lib/actions/transfer.create`. Per-category transfer history is not part of
this widget-parity dashboard — `main`'s `BudgetCategories` has no such
drill-down, and the accordion row's expanded state ends at the per-member
balance breakdown.

#### Scenario: Creating a transfer invalidates the group cache
- GIVEN a valid inline transfer form submission
- WHEN `transfer.create` resolves
- THEN `queryKeys.group(groupId)` invalidates and `BudgetTransfers`/`RemainingBalance` reflect the new transfer

### Requirement: Recent Expenses and Quick-Add Share the Same Invalidation Contract

`RecentExpenses` MUST list the group's most recent expenses, and the
dashboard's `ExpenseForm` quick-action MUST create an expense via
`lib/actions/expense.ts` and invalidate `queryKeys.group(groupId)` on
success, so the new expense appears in `RecentExpenses` and affects
`RemainingBalance` without a manual reload.

#### Scenario: Quick-added expense appears in Recent Expenses
- GIVEN the dashboard's add-expense quick action is submitted successfully
- WHEN the Server Action resolves
- THEN the new expense appears at the top of `RecentExpenses` and `RemainingBalance` reflects the reduced balance
