# Delta for Dashboard View

## MODIFIED Requirements

### Requirement: Dashboard Renders the Full Widget Set in a Two-Column Layout

The dashboard page MUST render `IncomeOverview`, `RemainingBalance`,
`BudgetCategories`, `BudgetTransfers`, and `RecentExpenses` composed in a
two-column layout, replacing the current placeholder's bare group-name
heading and flat category list. `SavingsGoalList` is NOT a dashboard
widget — it renders only on `/savings/[groupId]`; the dashboard's
`savingsGoals` prefetch exists solely to warm that route's cache ahead of
navigation (see "One Server Prefetch Feeds the Summary-Dependent Widgets"
below), not to display goals inline.

(Previously: this requirement and its own delta both incorrectly listed
`SavingsGoalList` as a sixth dashboard widget — a stale carry-over from an
earlier draft that was never actually implemented as a dashboard-rendered
widget. Corrected during `sdd-verify`/`sdd-archive` per product decision:
savings goals stay a `/savings`-only page. "Loading state precedes
hydration" still describes independent per-widget loading as an aspiration
met by inline skeletons after one blocking parent await; it now describes
literal independent streaming via per-query-key `<Suspense>` regions.)

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

(Previously: described a single `Promise.all` prefetch feeding one
page-wide `HydrationBoundary`; now describes three independent
per-query-key regions, with the four summary consumers still sharing
exactly one of them.)

#### Scenario: No client-side waterfall for summary-backed widgets
- GIVEN the server has prefetched `summary`
- WHEN the four summary-consuming widgets mount
- THEN none of them issues its own initial client fetch for summary data — they read the hydrated cache

#### Scenario: Independent regions elsewhere do not fragment the shared summary hydration
- GIVEN the dashboard renders three independent `<Suspense>` regions (`summary`, `categories`, `savingsGoals`)
- WHEN `categories` and `savingsGoals` stream in at different times than `summary`
- THEN all four `queryKeys.summary`-consuming widgets still hydrate together from the one shared `summary` region's prefetch, with no widget issuing its own client fetch

## ADDED Requirements

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
