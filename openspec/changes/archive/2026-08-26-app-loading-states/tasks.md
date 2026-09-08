# Tasks: App Loading States

No task in this change touches Prisma schema or migrations — zero backend/schema surface (confirmed against design.md's Threat Matrix `N/A` and the File Changes table).

## Review Workload Forecast

Review budget applied this session: **800 changed lines** (session override; guard literal label below stays `400-line budget risk` for downstream parseability).

| Field | Value |
|---|---|
| Estimated changed lines | ~1,150–1,450 total (Slice A ~600–750, Slice B ~550–700) |
| 400-line budget risk | Medium (both slices, measured against the 800-line session budget) |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 Slice A (segment fallbacks) → PR #2 Slice B (dashboard streaming) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main (trunk = `origin/nextjs-integration`) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

Both slices sit close enough to the 800-line budget to warrant re-measuring the actual diff before opening each PR. If Slice A's measured diff approaches or exceeds 800, split it further into stacked sub-PRs **1a** (Spinner + `_skeletons.tsx` + 4 widget conversions, Phases 1+3) → **1b** (9 `loading.tsx` files + spec deltas, Phases 2+4), both still landing before Slice B and both still targeting `origin/nextjs-integration`. Slice B's `_regions.tsx`/`page.tsx` restructure is not further splittable without breaking the single-restructure atomicity Decision 4 depends on; if it measures over budget, ask for `size:exception` rather than splitting. **Slice A and Slice B MUST NOT merge into one PR under any circumstance** — design.md mandates two separately-mergeable chained PRs, A landing first, because Slice B's `<Suspense>` fallbacks import Slice A's `_skeletons.tsx` exports.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Segment `loading.tsx` fallbacks + ported `Spinner` + shared skeleton module + widget skeleton conversion | PR #1 (base: `origin/nextjs-integration`) | `npm test -- Spinner _skeletons loading RecentExpenses RemainingBalance IncomeOverview BudgetTransfers BudgetCategories` | `next dev`; hard/soft-navigate each of the 8 `(app)` segments + any `(auth)` route, confirm shaped skeleton/spinner appears | Delete `app/_ui/Spinner.tsx`, `_skeletons.tsx`, all 9 `loading.tsx` files; revert the 5 widget files — dashboard restructure untouched |
| 2 | Dashboard streaming: hoisted promises, nested `<Suspense>` regions, `enabled`-gated categories fetch | PR #2 (base: PR #1 branch) | `npm test -- page.test _regions categories.test QuickAddExpense` | `next dev`; navigate to `/dashboard/:groupId`, confirm summary paints before categories, savings warm-up is invisible, `QuickAddExpense` fetches categories only when opened | Revert `page.tsx` to single `await Promise.all` + one `HydrationBoundary`; delete `_regions.tsx`; revert `DashboardClient.tsx`/`QuickAddExpense.tsx`/`categories.ts`/both spec deltas — Slice A's fallbacks stay intact |

## Phase 1: Slice A — Spinner Port & Skeleton Module (PR #1 foundation)

- [x] 1.1 Run `git show origin/main:frontend/src/shared/ui/Spinner.tsx` and port its output verbatim into `app/_ui/Spinner.tsx` (class strings copied, not re-derived).
- [x] 1.2 Add `export { Spinner }` + `export type { SpinnerSize }` to `app/_ui/index.tsx`.
- [x] 1.3 [RED] Write `app/_ui/Spinner.test.tsx`: asserts `role="status"`, `aria-label="Loading"`, size-class variants for `sm|md|lg`. (ui-design-system: "Spinner Primitive Provides a Sanctioned Full-Page/Shape-Unknown Loading Indicator")
- [x] 1.4 [GREEN] Confirm 1.1's ported markup passes 1.3.
- [x] 1.5 Create `app/(app)/dashboard/[groupId]/_skeletons.tsx` exporting `IncomeOverviewSkeleton`, `RemainingBalanceSkeleton`, `RecentExpensesSkeleton`, `BudgetTransfersSkeleton`, `BudgetCategoriesSkeleton`, `SummaryColumnSkeleton`, `CategoriesColumnSkeleton`, `DashboardSkeleton` — no `"use client"` (imported by server and client).
- [x] 1.6 [RED] Write a `_skeletons.test.tsx`: `DashboardSkeleton` reproduces `DashboardClient`'s exact container chain (`p-4 md:p-8 max-w-7xl mx-auto space-y-8` → grid → left/right columns); each leaf skeleton renders `animate-pulse` nodes.
- [x] 1.7 [GREEN] Confirm 1.5 satisfies 1.6.

## Phase 2: Slice A — Segment `loading.tsx` Fallbacks (PR #1)

- [x] 2.1 Create `app/(app)/dashboard/[groupId]/loading.tsx` rendering `<DashboardSkeleton/>` from `_skeletons.tsx`.
- [x] 2.2 Create `app/(app)/loading.tsx`: generic `max-w-7xl mx-auto space-y-8` content skeleton.
- [x] 2.3 Create `app/(app)/groups/loading.tsx`: `max-w-4xl … space-y-8`, header + group-card grid.
- [x] 2.4 Create `app/(app)/members/loading.tsx`: `max-w-4xl … space-y-6`, header + member rows.
- [x] 2.5 Create `app/(app)/profile/loading.tsx`: `max-w-2xl … space-y-8`, header + two Card blocks.
- [x] 2.6 Create `app/(app)/expenses/[groupId]/loading.tsx`: `max-w-7xl … space-y-8`, header + filter bar + expense rows.
- [x] 2.7 Create `app/(app)/transfers/[groupId]/loading.tsx`: `max-w-4xl … space-y-8`, header + transfer rows.
- [x] 2.8 Create `app/(app)/savings/[groupId]/loading.tsx`: `max-w-6xl … space-y-8`, header + goal cards.
- [x] 2.9 Create the single shared `app/(auth)/loading.tsx`: `min-h-screen flex items-center justify-center` + `<Spinner size="lg"/>`, covering all five auth routes — no `app/(auth)/layout.tsx` needed (Decision 1). (route-loading-states: "Every `(auth)` Route Segment Renders a Centered Spinner Fallback")
- [x] 2.10 [RED] Write one RTL test per file from 2.1–2.9 asserting container width class + skeleton/spinner presence. (route-loading-states: "Every `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback", "Fallback Type Is Chosen by Content-Shape Knowledge, Not Route Group Membership Alone")
- [x] 2.11 [GREEN] Confirm 2.1–2.9 satisfy 2.10.

## Phase 3: Slice A — Widget Skeleton Conversion, RED → GREEN (PR #1)

- [x] 3.1 [RED] Rewrite `RecentExpenses.test.tsx`, `RemainingBalance.test.tsx`, `IncomeOverview.test.tsx`, `BudgetTransfers.test.tsx`: replace `getByText("Loading…")` with `getByTestId("<widget>-loading")` + `animate-pulse` presence. (dashboard-view: "Widget-Level Loading Indicators Use Skeleton, Not Plain Text")
- [x] 3.2 [RED] Update `BudgetCategories.test.tsx`: widget `isLoading` asserts testid + skeleton; nested `TransferHistory` `isLoading` asserts two skeleton rows, not "Loading…" text. (dashboard-view: "Category drill-down shows Skeleton while transfer history loads")
- [x] 3.3 [GREEN] Swap `RecentExpenses.tsx` `isLoading` branch to `<RecentExpensesSkeleton/>`, keep `data-testid="recent-expenses-loading"`.
- [x] 3.4 [GREEN] Swap `RemainingBalance.tsx` → `<RemainingBalanceSkeleton/>`, keep testid.
- [x] 3.5 [GREEN] Swap `IncomeOverview.tsx` → `<IncomeOverviewSkeleton/>`, keep testid.
- [x] 3.6 [GREEN] Swap `BudgetTransfers.tsx` → `<BudgetTransfersSkeleton/>`, keep testid.
- [x] 3.7 [GREEN] Swap `BudgetCategories.tsx` widget `isLoading` → `<BudgetCategoriesSkeleton/>`; nested `TransferHistory` `isLoading` → two `<Skeleton className="h-3 …"/>` rows, to pass 3.1–3.2.

## Phase 4: Slice A — Spec Deltas & PR #1 Verification

- [x] 4.1 Write `openspec/specs/route-loading-states/spec.md` (new capability) per the drafted spec.
- [x] 4.2 Modify `openspec/specs/ui-design-system/spec.md`: Spinner-in-barrel requirement + Spinner-vs-Skeleton rule.
- [x] 4.3 Run `npm test`, `npm run lint`, `npm run typecheck` scoped to Slice A files; confirm all green and measure the actual diff before opening PR #1.

## Phase 5: Slice B — Data Layer & Regions Module, RED → GREEN (PR #2)

- [x] 5.1 [RED] Write a test: closed `QuickAddExpense` dialog fires no `useCategoriesList` fetch; opening it fires one. (Decision 4)
- [x] 5.2 [GREEN] Add `enabled = true` param to `useCategoriesList(groupId, enabled)` in `app/_data/categories.ts`; wire `QuickAddExpense.tsx` to call `useCategoriesList(groupId, open)`, passing 5.1.
- [x] 5.3 Create `app/(app)/dashboard/[groupId]/_regions.tsx` exporting async `SummaryRegion({groupId, currentUserId, summaryPromise, children})`, `CategoriesRegion({groupId, categoriesPromise})`, `SavingsWarmRegion({groupId, savingsPromise})` per the Interfaces contract.
- [x] 5.4 [RED] `_regions.test.tsx`: `await SummaryRegion({..., children: null})`, render, assert summary widgets paint with a never-resolving `categoriesPromise`. (dashboard-view: "Loading state precedes hydration, per independent region")
- [x] 5.5 [RED] `_regions.test.tsx`: port the existing `fetchMock` assertion onto the awaited region output — no client fetch for an already-hydrated key. (client-data-cache: "A per-region streamed read is still Server-Component-owned")
- [x] 5.6 [RED] `_regions.test.tsx`: `SavingsWarmRegion` dehydrates `queryKeys.savingsGoals` and renders nothing visible. (Decision 3)
- [x] 5.7 [GREEN] Implement `SummaryRegion`/`CategoriesRegion`/`SavingsWarmRegion` bodies (own ephemeral `createQueryClient()`, `prefetchQuery`, `dehydrate`, `HydrationBoundary`) to pass 5.4–5.6.

## Phase 6: Slice B — Page Restructure, Test Restructure & Spec Deltas (PR #2)

- [x] 6.1 Restructure `page.tsx`: keep the auth gate (`params` → `createClient` → `getUser` → `isGroupMember`) blocking; start `summaryPromise`/`categoriesPromise`/`savingsPromise` without awaiting, each `void p.catch(() => {})`'d; return nested `<Suspense>` regions — `SummaryRegion` wrapping nested `CategoriesRegion`, `SavingsWarmRegion` as a sibling `fallback={null}`. (dashboard-view: "One Server Prefetch Feeds the Summary-Dependent Widgets"; client-data-cache: "A Streamed Region's Hydration Boundary Must Cover or Nest Below Every Key Its Subtree Reads")
- [x] 6.2 Modify `DashboardClient.tsx`: accept `children` for the right column; drop the direct `BudgetCategories` import.
- [x] 6.3 [RED] Update `page.test.tsx`: keep the non-member-denied-before-service-touch assertion unchanged; replace `render(await DashboardPage(...))` widget-render assertions with structural assertions (Suspense boundaries + fallbacks present, promises started).
- [x] 6.4 [GREEN] Confirm 6.1–6.2 satisfy 6.3's structural assertions.
- [x] 6.5 Modify `openspec/specs/dashboard-view/spec.md` and `openspec/specs/client-data-cache/spec.md` deltas per the drafted content (Decision 5).
- [x] 6.6 Run `npm test`, `npm run lint`, `npm run typecheck` scoped to Slice B files; confirm all green and measure the actual diff before opening PR #2.
