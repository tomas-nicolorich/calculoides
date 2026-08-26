# Dashboard View Specification

## Purpose

Full widget-parity dashboard at `app/(app)/dashboard/[groupId]/**`, replacing
the current lean placeholder (a bare group-name heading and category list)
with the six-widget, two-column composition from `main`'s `DashboardPage`.
Underlying income/savings math is governed by the existing
`dashboard-income`, `savings-goal-management`, and
`savings-income-split-allocation` specs — those scenarios are referenced
here, not duplicated, and MUST continue to hold on this implementation.

## Requirements

### Requirement: Dashboard Renders the Full Widget Set in a Two-Column Layout

The dashboard page MUST render `IncomeOverview`, `RemainingBalance`,
`BudgetCategories`, `BudgetTransfers`, `RecentExpenses`, and
`SavingsGoalList` composed in a two-column layout, replacing the current
placeholder's bare group-name heading and flat category list.

#### Scenario: All six widgets render for a populated group
- GIVEN a group with members, categories, expenses, transfers, and savings goals
- WHEN `/dashboard/[groupId]` renders
- THEN `IncomeOverview`, `RemainingBalance`, `BudgetCategories`, `BudgetTransfers`, `RecentExpenses`, and `SavingsGoalList` are all present

#### Scenario: Loading state precedes hydration, per independent region
- GIVEN the server has not yet resolved one or more of the `summary`, `categories`, or `savingsGoals` prefetches
- WHEN the page begins streaming
- THEN each of the three independent data regions shows its own `<Suspense>` fallback, and a slower region does not block a faster region from revealing — not a single page-level spinner blocking all six widgets

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

`RecentExpenses`, `BudgetCategories` (including its nested
`TransferHistory` drill-down), `RemainingBalance`, and `IncomeOverview`
MUST render a `Skeleton`-shaped placeholder for any loading state they own
independently of the page-level `<Suspense>` fallback (e.g., a
client-triggered refetch), rather than plain "Loading…" text.

#### Scenario: Category drill-down shows Skeleton while transfer history loads
- GIVEN a category accordion row is expanded
- WHEN its `/api/transfers/by-category` request is in flight
- THEN `TransferHistory` renders a `Skeleton` placeholder, not literal "Loading…" text

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
- GIVEN a category's row menu offers delete
- WHEN the user selects delete
- THEN a confirmation step precedes the `deleteCategory` Server Action call — a single click does not itself delete

### Requirement: Budget Transfers Support Inline Creation and Per-Category History

`BudgetTransfers` MUST support creating a transfer via
`lib/actions/transfer.create`, and `BudgetCategories`' per-category
drill-down MUST show that category's transfer history via
`/api/transfers/by-category`.

#### Scenario: Creating a transfer invalidates the group cache
- GIVEN a valid inline transfer form submission
- WHEN `transfer.create` resolves
- THEN `queryKeys.group(groupId)` invalidates and `BudgetTransfers`/`RemainingBalance` reflect the new transfer

#### Scenario: Category drill-down lists only that category's transfers
- GIVEN a category has 2 of the group's 5 total transfers
- WHEN its accordion row's transfer history loads via `/api/transfers/by-category`
- THEN exactly those 2 transfers are listed

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

### Requirement: Savings Goal List Delegates Goal Logic to Existing Specs

`SavingsGoalList` MUST render each group's savings goals using the existing
delete/edit/adjust lifecycle (`savings-goal-management`) and contribution
math (`savings-income-split-allocation`) unchanged — this spec adds only the
widget's placement within the dashboard composition, not new goal behavior.

#### Scenario: Goal deletion behavior is unchanged inside the dashboard placement
- GIVEN a goal card rendered inside `SavingsGoalList` on the dashboard
- WHEN its row-menu delete is confirmed
- THEN the existing `savings-goal-management` deletion scenarios hold verbatim (isolated deletion, confirmation-gated, no shared-balance side effect)
