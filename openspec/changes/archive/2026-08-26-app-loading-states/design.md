# Design: App Loading States

## Technical Approach

Two mechanisms, delivered as two chained slices. **Slice A** adds Next.js `loading.tsx` segment fallbacks, a ported `Spinner` primitive, and a single shared skeleton module. **Slice B** restructures `dashboard/[groupId]/page.tsx` from one blocking `await Promise.all` into nested `<Suspense>` regions.

The unifying decision: **one skeleton module is the single source of truth** for a segment. `app/(app)/dashboard/[groupId]/_skeletons.tsx` exports the widget/column/page skeletons consumed by (1) the segment `loading.tsx`, (2) Slice B's `<Suspense>` fallbacks, and (3) each widget's `isLoading` branch. Because all three render identical markup, the hand-off between them is pixel-identical — the "double-skeleton" risk becomes a no-op swap.

## Codebase Findings That Shape the Design

| Finding | Consequence |
|---|---|
| No `app/(auth)/layout.tsx` exists (only `app/layout.tsx`, `app/(app)/layout.tsx`) | See Decision 1 |
| `queryKeys.savingsGoals` is prefetched by the dashboard but **consumed by no dashboard widget** (only `/savings`'s `SavingsClient`). It is a cross-route cache warm-up that currently blocks first paint | See Decision 3 |
| `QuickAddExpense` (in the header) reads **both** `summary` and `categories`; `BudgetCategories` reads **both** `categories` and `summary` | Regions are not key-disjoint by default — see Decision 4 |
| `useDashboardSummary`/`useCategoriesList` have no `enabled` guard, so a cold cache at mount fires a real `fetch` | Any region ordering that lets a consumer mount before its key hydrates re-creates the waterfall `dashboard-view` forbids |
| `createQueryClient()` is not `cache()`-wrapped; it returns a fresh client per call | Per-region ephemeral clients are the convention-compatible choice |
| `page.test.tsx` renders `await DashboardPage(...)`'s return value directly with RTL | Async region children cannot be rendered by the client renderer — test strategy must change |

## Architecture Decisions

### Decision 1 — One shared `app/(auth)/loading.tsx`, no layout required

**Choice**: a single `app/(auth)/loading.tsx` covering all five auth routes.
**Alternatives**: five per-segment `loading.tsx` files; adding an `app/(auth)/layout.tsx` purely to host the boundary.
**Rationale**: verified against the installed Next.js source, `node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js`. `createSubtreePropsFromSegmentPath` resolves **every** entry of `FILE_TYPES` (`layout`, `template`, `error`, `loading`, …) for each segment path independently, and group segments (`(auth)`) are ordinary segments in that walk (`isGroupSegment` is only consulted for access-fallback insertion). A `loading` file therefore installs a Suspense boundary at its segment whether or not a sibling `layout` exists. This is **settled, not an open question** — do not add a layout, and do not fan out to five files.

### Decision 2 — `app/(app)/layout.tsx` is NOT streamed

**Choice**: leave the layout's three awaits blocking.
**Alternatives**: `<Suspense>` around `AppShell`'s group switcher; a `(app)`-level streaming shell.
**Rationale**: two of the three awaits are gates, not data — `getUser()` drives `redirect("/login")` and `UserService.getUser` drives `redirect("/complete-profile")`. Deferring them converts a server-side redirect into a post-paint flash and weakens the UX half of `server-session-auth`. The third (`GroupService.getGroupsForUser`) is a single indexed lookup already running in `Promise.all` with the profile read. Also note the proposal's "root `loading.tsx` remounts `AppShell`" risk is **refuted**: `loading.tsx` wraps the segment's `page` and children *inside* that segment's layout, so `app/(app)/loading.tsx` renders in `AppShell`'s `<main>` slot and never remounts the shell. It stays in scope as the generic safety net for segments without their own file.

### Decision 3 — `savingsGoals` becomes an invisible, non-blocking warm-up region

**Choice**: `<Suspense fallback={null}><SavingsWarmRegion/></Suspense>`, rendering `<HydrationBoundary state={…}>{null}</HydrationBoundary>`.
**Alternatives**: delete the prefetch (behaviour + spec change, breaks `page.test.tsx`'s 16.1 assertion); give it a visible region (there is no UI to show); leave it blocking.
**Rationale**: it has no dashboard consumer, so it can never justify blocking first paint, yet its `/savings` warm-up value is real and spec-backed. Wrapping it removes an entire service call from time-to-first-paint at zero behaviour cost. This is precisely the proposal's success criterion "a slow `savingsGoals` query does not delay `summary` widgets".

### Decision 4 — Nested (not sibling) regions, with promises hoisted to `page.tsx`

**Choice**: `page.tsx` starts all three service promises **without awaiting**, then passes each promise into the region that needs it. The categories region is nested *inside* the summary region as `children`.
**Alternatives**: (a) one `dehydrate()` up front plus three sibling `<Suspense>`s; (b) three key-disjoint sibling regions; (c) React `cache()`-memoized loaders shared across sibling regions.

**Rationale — this is the crux the proposal flagged, answered concretely:**

- **(a) cannot stream, at all.** `dehydrate(client)` is a *snapshot*: TanStack Query's default `shouldDehydrateQuery` only serializes settled queries. To produce a non-empty `state` prop the parent must already have awaited, which reinstates the blocking `Promise.all`. Independent streaming requires the awaits themselves to live inside separately-suspending async components, each with its own boundary. One shared dehydrate + three Suspense boundaries **does not** achieve independent streaming.
- **(b) is unsafe here.** The regions are not key-disjoint: `QuickAddExpense` reads `categories` from inside the summary region and `BudgetCategories` reads `summary` from inside the categories region. Sibling boundaries flush in completion order, which is not deterministic, so a consumer can mount against a cold cache and fire a client `fetch` — the exact waterfall `dashboard-view` forbids and `page.test.tsx` asserts against.
- **Nesting makes ordering a guarantee, not a hope.** React cannot stream a nested boundary's content before its parent boundary's content, so the summary `HydrationBoundary` always renders before the categories subtree mounts. Categories therefore needs to carry only its own key, and gating it on summary costs nothing real — `BudgetCategories` needs `summary` for owner checks and member names anyway.
- **Hoisted promises keep the parallel start.** All three service calls begin in the same tick, exactly as today's `Promise.all`, but each region awaits only what it needs. No React `cache()` dependency, no duplicate service call. Each created promise gets `void p.catch(() => {})` at the creation site to mark it handled; the region's own `prefetchQuery` still observes the rejection.
- **`QuickAddExpense` gets `enabled`.** Its `useCategoriesList(groupId)` becomes `useCategoriesList(groupId, open)` so a closed dialog never fetches, following the existing `useTransfersByCategory(groupId, categoryId, isExpanded)` precedent. This makes the summary region dependency-closed on `queryKeys.summary` alone.

### Decision 5 — `client-data-cache` DOES require a delta

**Choice**: add a delta. The current requirement describes one dehydrated `QueryClient` feeding one `HydrationBoundary`. The new shape is N ephemeral clients, one per streamed region.
**Rationale**: the *invariant* ("one server prefetch per query key; no consumer issues an initial client fetch for a prefetched key") is preserved and must be restated, but the mechanism sentence is now false as written. The delta must add the ordering rule that makes multiple boundaries safe: **a region's boundary must hydrate every key its subtree reads, or nest strictly below the region that does.** `hydrate()` is idempotent (it skips entries older than the cached `dataUpdatedAt`), so overlapping boundaries are correct but wasteful; disjoint-plus-nested is the sanctioned shape. `dashboard-view`'s "One Server Prefetch Feeds the Summary-Dependent Widgets" requirement is **preserved unchanged**.

## Data Flow

```
Navigation to /dashboard/:groupId
        │
        ▼
(app)/layout.tsx  ── blocking: getUser + [groups, profile] ──►  AppShell mounted (client nav: already mounted)
        │
        ▼  <Suspense fallback={dashboard/loading.tsx → <DashboardSkeleton/>}>
page.tsx: await params → createClient → getUser → isGroupMember     [auth gate only, no data]
        │
        ├─ summaryPromise    = SummaryService.getGroupSummary(groupId)   ─┐
        ├─ categoriesPromise = BudgetService.listCategoriesWithBalances() ├─ all started, none awaited
        └─ savingsPromise    = SavingsService.getGoalsForGroup(groupId)  ─┘
        │
        ▼  page.tsx returns  →  outer loading.tsx fallback is dropped
   <Suspense fallback={<DashboardSkeleton/>}>          ← identical markup to loading.tsx: no visible swap
     <SummaryRegion summaryPromise>                    ← awaits summary, dehydrates queryKeys.summary
        <Suspense fallback={<CategoriesColumnSkeleton/>}>
          <CategoriesRegion categoriesPromise/>        ← awaits categories, dehydrates queryKeys.categories
        </Suspense>
     </SummaryRegion>
   </Suspense>
   <Suspense fallback={null}>
     <SavingsWarmRegion savingsPromise/>               ← invisible; dehydrates queryKeys.savingsGoals
   </Suspense>
```

### Sequence — reveal order

```
t0  ──► loading.tsx  : full DashboardSkeleton (header + left column + right column)
t1  ──► page returns : same DashboardSkeleton, now from page.tsx's own Suspense fallback  [no repaint]
t2  ──► summary settles : header + IncomeOverview + RemainingBalance + RecentExpenses +
                          BudgetTransfers paint;  right column still CategoriesColumnSkeleton
t3  ──► categories settles : BudgetCategories paints
tX  ──► savingsGoals settles : nothing paints; client cache warmed for /savings
```

`t2` may precede or follow `t3`'s underlying service resolution; only the *reveal* is ordered.

## File Changes

### Slice A — segment fallbacks (additive)

| File | Action | Description |
|---|---|---|
| `app/_ui/Spinner.tsx` | Create | Port `origin/main:frontend/src/shared/ui/Spinner.tsx` verbatim (class strings copied, not re-derived) |
| `app/_ui/index.tsx` | Modify | `export { Spinner }` + `export type { SpinnerSize }` |
| `app/(app)/loading.tsx` | Create | Generic content skeleton, `max-w-7xl mx-auto space-y-8` |
| `app/(app)/dashboard/[groupId]/loading.tsx` | Create | Renders `<DashboardSkeleton/>` from `_skeletons.tsx` |
| `app/(app)/dashboard/[groupId]/_skeletons.tsx` | Create | Shared skeleton module (see Interfaces) |
| `app/(app)/groups/loading.tsx` | Create | `max-w-4xl … space-y-8`; header block + group-card grid |
| `app/(app)/members/loading.tsx` | Create | `max-w-4xl … space-y-6`; header + member rows |
| `app/(app)/profile/loading.tsx` | Create | `max-w-2xl … space-y-8`; header + two Card blocks |
| `app/(app)/expenses/[groupId]/loading.tsx` | Create | `max-w-7xl … space-y-8`; header + filter bar + expense rows |
| `app/(app)/transfers/[groupId]/loading.tsx` | Create | `max-w-4xl … space-y-8`; header + transfer rows |
| `app/(app)/savings/[groupId]/loading.tsx` | Create | `max-w-6xl … space-y-8`; header + goal cards |
| `app/(auth)/loading.tsx` | Create | `min-h-screen flex items-center justify-center` + `<Spinner size="lg"/>` |
| `_widgets/RecentExpenses.tsx` | Modify | `isLoading` branch → `<RecentExpensesSkeleton/>`; keep `data-testid="recent-expenses-loading"` |
| `_widgets/RemainingBalance.tsx` | Modify | → `<RemainingBalanceSkeleton/>`; keep testid |
| `_widgets/IncomeOverview.tsx` | Modify | → `<IncomeOverviewSkeleton/>`; keep testid |
| `_widgets/BudgetTransfers.tsx` | Modify | → `<BudgetTransfersSkeleton/>`; keep testid |
| `_widgets/BudgetCategories.tsx` | Modify | Widget `isLoading` → `<BudgetCategoriesSkeleton/>`; nested `TransferHistory` `isLoading` → two `<Skeleton className="h-3 …"/>` rows |
| `openspec/specs/route-loading-states/**` | Create | New capability |
| `openspec/specs/ui-design-system/**` | Modify | `Spinner` in the sanctioned barrel; Spinner-vs-Skeleton rule |

### Slice B — dashboard streaming

| File | Action | Description |
|---|---|---|
| `app/(app)/dashboard/[groupId]/page.tsx` | Restructure | Auth gate → hoisted promises → nested `<Suspense>` regions |
| `app/(app)/dashboard/[groupId]/_regions.tsx` | Create | `SummaryRegion`, `CategoriesRegion`, `SavingsWarmRegion` (async Server Components) |
| `app/(app)/dashboard/[groupId]/DashboardClient.tsx` | Modify | Accepts `children` for the right column; drops the `BudgetCategories` import |
| `_components/QuickAddExpense.tsx` | Modify | `useCategoriesList(groupId, open)` |
| `app/_data/categories.ts` | Modify | `useCategoriesList(groupId, enabled = true)` |
| `app/(app)/dashboard/[groupId]/page.test.tsx` | Modify | See Testing Strategy |
| `openspec/specs/dashboard-view/**`, `client-data-cache/**` | Modify | Deltas per Decision 5 |

## Interfaces / Contracts

```tsx
// app/_ui/Spinner.tsx — prod API, ported verbatim
export type SpinnerSize = "sm" | "md" | "lg";
export function Spinner(props: { size?: SpinnerSize; className?: string }): JSX.Element;
// conic-gradient ring + radial-gradient mask, role="status", aria-label="Loading"
```

```tsx
// app/(app)/dashboard/[groupId]/_skeletons.tsx — no "use client"; imported by server AND client
export function IncomeOverviewSkeleton(): JSX.Element;
export function RemainingBalanceSkeleton(): JSX.Element;
export function RecentExpensesSkeleton(): JSX.Element;
export function BudgetTransfersSkeleton(): JSX.Element;
export function BudgetCategoriesSkeleton(): JSX.Element;
export function SummaryColumnSkeleton(): JSX.Element;   // header + the 4 left-column widget skeletons
export function CategoriesColumnSkeleton(): JSX.Element; // right column wrapper + BudgetCategoriesSkeleton
export function DashboardSkeleton(): JSX.Element;        // SummaryColumnSkeleton + CategoriesColumnSkeleton
```

`DashboardSkeleton` MUST reproduce `DashboardClient`'s exact container chain — `p-4 md:p-8 max-w-7xl mx-auto space-y-8` → `grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-6 items-start` → left `flex flex-col gap-6 3xl:col-span-2 3xl:grid 3xl:grid-cols-2` / right `flex flex-col gap-6` — so the `loading.tsx` → shell → region hand-offs cause no layout shift (ADR-0003, ADR-0007).

```tsx
// _regions.tsx
export async function SummaryRegion(props: {
  groupId: string; currentUserId: string;
  summaryPromise: Promise<DashboardSummary>;
  children: ReactNode;              // the nested categories <Suspense> subtree
}): Promise<JSX.Element>;
```

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | `Spinner` renders `role="status"`, `aria-label="Loading"`, size classes | `app/_ui/Spinner.test.tsx`, RTL |
| Unit | Each `loading.tsx` renders its container width + skeleton count | Import the default export, `render()`, assert on `max-w-*` and `animate-pulse` node counts |
| Unit | Widget `isLoading` branches | **RED first**: rewrite the existing `getByText("Loading…")` assertions to `getByTestId("<widget>-loading")` + presence of `animate-pulse`, *then* swap the markup |
| Integration | `DashboardPage` still denies non-members before touching services | Unchanged assertion in `page.test.tsx` |
| Integration | Regions stream independently | New `_regions.test.tsx`: `await SummaryRegion({…, summaryPromise: Promise.resolve(fixture), children: null})`, render the result, assert widgets paint with a never-resolving `categoriesPromise` |
| Integration | No client fetch for a hydrated key | Port the existing `fetchMock` assertion onto the awaited region output. **`page.test.tsx`'s current `render(await DashboardPage(...))` must change** — the client renderer cannot render async region children, so the page test asserts on element *structure* (Suspense boundaries + fallbacks present, promises started) and the render assertions move to `_regions.test.tsx` |
| E2E | None | No E2E tooling in this repo (`openspec/config.yaml`) |

## Threat Matrix

`N/A` — no shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The `loading.tsx` additions are Next.js file-convention render boundaries, not URL routing: they add no route, no matcher, no redirect, and no authorization decision. Every authorization gate (`getUser`, `isGroupMember`, `redirect`) keeps its current blocking position — see Decision 2.

## Migration / Rollout

Two chained PRs, stacked onto `origin/nextjs-integration` (chain trunk; the `nextjs-integration` → `main` merge is a separate, later change).

```
origin/nextjs-integration
  └── PR #1  Slice A — segment fallbacks        📍 lands first
        └── PR #2  Slice B — dashboard streaming
```

Slice A must land first because Slice B's `<Suspense fallback>` values are `_skeletons.tsx` exports that Slice A introduces, and because Slice B's no-visible-swap property depends on Slice A's `loading.tsx` rendering the identical `DashboardSkeleton`. Slice B's PR body must carry the dependency diagram with `📍` on itself.

No schema, migration, API-surface, or deploy-ordering concern in either direction. Rollback per the proposal: Slice A is delete-to-revert; Slice B reverts `page.tsx` to the single `await Promise.all` + one `HydrationBoundary`, plus `_regions.tsx` deletion and the two spec deltas.

## Open Questions

None blocking. All four questions the proposal raised are resolved above: `(auth)` boundary (Decision 1), layout streaming (Decision 2), skeleton composition / double-skeleton (Decision 4 + Data Flow), `client-data-cache` delta (Decision 5).
