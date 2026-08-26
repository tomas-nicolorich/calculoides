# Apply Progress: App Loading States — Slice A COMPLETE (28/41), Slice B COMPLETE (13/41) — 41/41 total

**Mode**: Strict TDD (RED → GREEN, safety-net run before every existing-file edit)
**Delivery**: auto-chain, stacked-to-main (trunk `origin/nextjs-integration`), all work uncommitted on the current branch — orchestrator decides commit/branch/PR split

## Scope of This Run (Slice B — Phases 5-6)

This apply run covers Slice B ONLY (tasks.md Phases 5-6: dashboard streaming,
`_regions.tsx`, `page.tsx` restructure, `useCategoriesList` `enabled` param,
`QuickAddExpense.tsx`, `dashboard-view`/`client-data-cache` spec deltas).
Slice A (Phases 1-4) was already merged into `origin/nextjs-integration` via
PRs #232 and #233 before this run started — verified via
`git log --oneline origin/nextjs-integration` and the presence of
`_skeletons.tsx`/`Spinner.tsx` before any edits were made. This run's
working tree was already synced to that merged state.

## Completed Tasks — Slice A (28/41, all of Phase 1-4) — MERGED, PRs #232/#233

**Phase 1 (1.1-1.7)**: `app/_ui/Spinner.tsx` ported verbatim from
`origin/main:frontend/src/shared/ui/Spinner.tsx` (only the `cn` import path
changed). Barrel export added. `app/(app)/dashboard/[groupId]/_skeletons.tsx`
created with all 8 exports from design.md's Interfaces/Contracts, reproducing
`DashboardClient`'s exact container chain.

**Phase 2 (2.1-2.11)**: 9 `loading.tsx` files — 8 `(app)` segments shaped to
each segment's real Client component container width/structure, plus 1
shared `(auth)/loading.tsx` (centered `Spinner`, no `layout.tsx` per
Decision 1).

**Phase 3 (3.1-3.7)**: 5 dashboard widgets (RecentExpenses, RemainingBalance,
IncomeOverview, BudgetTransfers, BudgetCategories) converted from
`<p>Loading…</p>` to shaped `Skeleton` components; nested `TransferHistory`
drill-down converted to two skeleton rows.

**Phase 4 (4.1-4.3)**: `openspec/specs/route-loading-states/spec.md` created
(new capability). `openspec/specs/ui-design-system/spec.md` modified (2 new
Spinner requirements). Full scoped test/lint/typecheck run: all green.

Slice A's measured diff (~1,108 changed lines) exceeded its own forecast and
the 800-line session budget; it was landed as PR #232 (Spinner + `_skeletons`
+ widget conversions) and PR #233 (9 `loading.tsx` files + spec deltas),
both merged into `origin/nextjs-integration` before this run.

## Completed Tasks — Slice B (13/41, all of Phase 5-6) — THIS RUN

**Phase 5 (5.1-5.7), data layer & `_regions.tsx`**:
- 5.1-5.2: `useCategoriesList(groupId, enabled = true)` gains an `enabled`
  param (`app/_data/categories.ts`), matching the `useTransfersByCategory`
  precedent. `QuickAddExpense.tsx` restructured so the `categories`-reading
  code (`ExpenseFields`, extracted as a small child component) mounts only
  while the dialog is `open`, rather than mounting an always-present
  `enabled: open` observer.
- 5.3/5.7: `app/(app)/dashboard/[groupId]/_regions.tsx` created, exporting
  `SummaryRegion({groupId, currentUserId, summaryPromise, children})`,
  `CategoriesRegion({groupId, currentUserId, categoriesPromise})` (see
  Deviation below re: `currentUserId`), and `SavingsWarmRegion({groupId,
  savingsPromise})`. Each is an `async` Server Component owning its own
  ephemeral `createQueryClient()` → `prefetchQuery` → `dehydrate` →
  `HydrationBoundary` cycle.
- 5.4-5.6: `_regions.test.tsx` written RED-first (import-not-found, then
  wrong/missing behavior against a not-yet-written module), covering:
  summary widgets painting while a nested subtree never resolves (via
  React 19's `use()` in a Client Component, since RTL's client renderer
  cannot render an unresolved async Server Component as JSX); no client
  fetch for the two-region combined, fully-hydrated tree; `SavingsWarmRegion`
  dehydrating with zero visible DOM output.

**Phase 6 (6.1-6.6), page restructure & spec deltas**:
- 6.1: `page.tsx` restructured — auth gate stays blocking; `summaryPromise`/
  `categoriesPromise`/`savingsPromise` are started without awaiting, each
  `void p.catch(() => undefined)`'d; returns nested `<Suspense>` regions
  (`SummaryRegion` wrapping nested `CategoriesRegion`; `SavingsWarmRegion` as
  a sibling with `fallback={null}`).
- 6.2: `DashboardClient.tsx` now accepts `children` for the right column and
  no longer imports `BudgetCategories` directly. `DashboardClient.test.tsx`
  updated to pass a `categoriesSlot()` children fixture (not itself a
  tasks.md line item, but a required companion change — see Deviation).
- 6.3-6.4: `page.test.tsx`'s render-based widget assertion replaced with a
  structural assertion (element-tree inspection via `.type`/`.props`, no
  `render()` call) proving: both service-call-started assertions, nested
  (not sibling) `<Suspense>` structure, and that the fallbacks are exactly
  `DashboardSkeleton`/`CategoriesColumnSkeleton` from `_skeletons.tsx`. The
  non-member-denied-before-service-touch test and the two prefetch-args
  tests were left unchanged (they don't render, so the async-region
  restructure doesn't affect them).
- 6.5: `openspec/specs/dashboard-view/spec.md` and
  `openspec/specs/client-data-cache/spec.md` updated in place (same
  convention Slice A's task 4.1/4.2 used) with the drafted delta content:
  region-aware "Loading state precedes hydration" scenario, the new
  "Widget-Level Loading Indicators Use Skeleton" requirement (resolves
  Slice A's flagged deviation), and the new "A Streamed Region's Hydration
  Boundary Must Cover or Nest Below Every Key Its Subtree Reads" requirement.
- 6.6: full suite/lint/typecheck run — see Test Results below.

## TDD Cycle Evidence (Slice B)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5.1-5.2 | `QuickAddExpense.test.tsx` | Integration (RTL) | 2/2 passing baseline | Written first, confirmed fail (fetch happened while closed) | 3/3 passed after `enabled` param + `ExpenseFields` extraction | N/A — single scenario per the task | Clean — extraction itself was the fix, not incidental |
| 5.3-5.7 | `_regions.test.tsx` | Integration (RTL) | N/A (new file) | All 3 written first, confirmed fail (module not found, then real `fetch` occurring for `categories` — see Issue below) | 3/3 passed after `_regions.tsx` implementation + the `QuickAddExpense` mount-order fix | 3 cases (never-resolving nested subtree, fully-hydrated combined tree, invisible savings region) | Clean |
| 6.1-6.4 | `page.test.tsx` | Integration (RTL, structural — no `render()`) | 3/3 passing baseline (the 3 non-rendering tests) | Written first, confirmed fail (`result.props.children` not iterable against the old single-`HydrationBoundary` shape) | 4/4 passed after `page.tsx` restructure | N/A — one structural scenario per the Testing Strategy table | Clean |
| 6.2 (DashboardClient) | `DashboardClient.test.tsx` | Integration (RTL) | 2/2 passing baseline | N/A — approval-test style: existing assertions preserved via a `categoriesSlot()` children fixture, not new RED | 2/2 passed after the `children`-prop restructure | N/A — companion change, no new behavior | Clean |
| 6.5 | N/A (spec docs) | N/A | N/A | N/A | N/A | N/A | N/A — pure documentation |

## Issue Found and Fixed During Implementation (flagged per apply-phase rules)

**A design gap in Decision 4's `enabled`-gating, discovered via a genuine
test failure, not by inspection.** The original plan (tasks.md 5.2, design.md
Decision 4) was `useCategoriesList(groupId, open)` mounted unconditionally in
`QuickAddExpense`, with `enabled: open` doing the gating. This alone is
insufficient: TanStack Query v5's `useQuery({ enabled: false })` still
registers a real `Query` object in the `QueryCache` at mount time, even
though it never fetches. Because `QuickAddExpense` (in `DashboardClient`'s
header) renders and mounts *before* the right column's `{children}`
(`CategoriesRegion`'s own `HydrationBoundary`) in the same synchronous
render pass, its disabled observer's placeholder `categories` cache entry
already exists by the time `CategoriesRegion`'s `HydrationBoundary` tries to
hydrate that same key. `@tanstack/react-query`'s `HydrationBoundary`
(`build/modern/HydrationBoundary.js`) special-cases this: hydrating a key
that has **no** existing cache entry happens synchronously inside a
`useMemo` (before any child mounts); hydrating a key that **already has** an
entry (even an empty placeholder) is deferred to a `useEffect`, which — due
to React's child-before-parent effect ordering — can run *after*
`BudgetCategories`'s own enabled, data-fetching observer has already decided
to fetch. This reopens exactly the client-fetch race nesting was meant to
close, and was reproduced with a minimal debug test before being fixed (not
asserted from documentation alone).

**Fix applied**: extracted the categories-reading half of `QuickAddExpense`
into a small child component (`ExpenseFields`) that is only rendered (and
thus only mounts its `useCategoriesList` observer) while the dialog is
actually `open` — `{open && <ExpenseFields .../>}` — instead of mounting an
always-present disabled observer. This avoids ever registering a
placeholder `categories` cache entry ahead of `CategoriesRegion`'s
hydration. The `enabled` parameter on `useCategoriesList` itself is still
implemented and exercised (belt-and-braces for the dialog's own open/close
transition), matching tasks.md 5.2's literal requirement; the *mounting*
strategy is the deviation, not the hook signature.

**Verified via a minimal reproduction** (`_debug.test.tsx`, deleted after
confirming the fix — not part of the final deliverable): standalone
`CategoriesRegion` alone never fetches categories; nesting it inside
`SummaryRegion` with the *original* unconditional `enabled: open` mount did
fetch categories; after the `ExpenseFields` extraction, the same nested
scenario no longer fetches. All three `_regions.test.tsx` assertions and the
new `QuickAddExpense.test.tsx` assertion pass with the fix in place.

## Other Deviations from the Literal Design/Tasks Text

1. **`CategoriesRegion` takes `currentUserId`, not just `{groupId,
   categoriesPromise}` as tasks.md 5.3 literally lists.** `BudgetCategories`
   (rendered inside `CategoriesRegion`) requires `currentUserId` for its
   owner-only delete affordance — this prop has no other channel from
   `page.tsx` into that subtree. design.md's own Interfaces/Contracts
   section only gives `SummaryRegion`'s exact signature; tasks.md's
   parenthetical list for `CategoriesRegion`/`SavingsWarmRegion` reads as
   shorthand, not an exhaustive prop contract. Functionally required, not a
   freelance addition.
2. **`DashboardClient.test.tsx` updated even though it isn't listed in
   design.md's Slice B File Changes table.** `DashboardClient.tsx`'s
   behavior change (task 6.2: accept `children`, drop the `BudgetCategories`
   import) breaks that test's existing assertions unless it's given a
   `children` fixture — this is a necessary companion change to 6.2, not a
   new task or an unrelated scope expansion.
3. **`ExpenseFields` extraction inside `QuickAddExpense.tsx`** — see the
   Issue section above. Necessary for correctness; the public
   `useCategoriesList(groupId, enabled)` signature tasks.md specifies is
   unchanged.

## Test Results

- Scoped Slice B suite: `_regions.test.tsx` (3), `QuickAddExpense.test.tsx`
  (3), `categories.test.tsx` (1), `DashboardClient.test.tsx` (2),
  `page.test.tsx` (4), `BudgetCategories.test.tsx`, `BudgetTransfers.test.tsx`
  — all green (34/34 across the 6 directly-run files during TDD cycles).
- Full root suite (`npx vitest run --config vitest.config.ts`): **114 files
  / 558 tests, all passed** (up from Slice A's 113 files / 554 tests —
  +1 file `_regions.test.tsx`, +4 net new test cases).
- `npm run lint:next` (`eslint app lib proxy.ts next.config.ts
  --max-warnings 0`): clean after fixing 4 findings (`no-unsafe-member-access`
  on `result.props.children` in `page.test.tsx`, fixed via an explicit
  intermediate cast; 3× `no-empty-function` on `.catch(() => {})` in
  `page.tsx`, fixed by using `.catch(() => undefined)`, an expression-bodied
  arrow the rule doesn't flag).
- `npm run typecheck:next` (`tsc --noEmit -p tsconfig.next.json`): clean
  after switching `_regions.tsx`'s prop types from the client-side
  `shared/src/types/redesign` types (`DashboardSummary`/`CategoryWithBalances`
  — the post-`fetchJson`-serialization shapes, e.g. `date: string`,
  `icon: string | undefined`) to `Awaited<ReturnType<typeof
  SummaryService.getGroupSummary>>` / `...BudgetService
  .listCategoriesWithBalances>>` / `...SavingsService.getGoalsForGroup>>`
  (the actual raw service-return shapes, e.g. `date: Date`,
  `icon: string | null`) — the two shapes are structurally different and
  the shared types never matched what `page.tsx` actually passes through,
  even before this slice; the mismatch was previously invisible because
  nothing was explicitly typed on this path.
- No `next dev` runtime harness available in this environment (no
  browser/runtime harness); `lint:next`/`typecheck:next` remain the
  available proxy for route-file and JSX/TSX compile correctness, same as
  Slice A's run.

## Review Budget / Diff Size — Slice B, WITHIN BUDGET

Measured actual diff for this run (authored additions+deletions on modified
files, full line count for new files; `tasks.md` checkbox-only changes
excluded from this count, consistent with Slice A's methodology):

- Modified files: 356 insertions + 105 deletions = 461 lines (9 files:
  `DashboardClient.tsx`/`.test.tsx`, `QuickAddExpense.tsx`/`.test.tsx`,
  `page.tsx`/`.test.tsx`, `app/_data/categories.ts`,
  `openspec/specs/{dashboard-view,client-data-cache}/spec.md`)
- New files: `_regions.tsx` (112 lines) + `_regions.test.tsx` (148 lines)
  = 260 lines
- **Total: ~721 changed lines** — within the 800-line session budget and
  close to tasks.md's own ~550-700 forecast for Slice B (slightly over, due
  to the structural `page.test.tsx` rewrite and the `_regions.test.tsx`
  triangulation coverage being more thorough than the minimum). No further
  split needed or recommended — design.md's own text says Slice B "is not
  further splittable without breaking the single-restructure atomicity
  Decision 4 depends on," and 721 lines does not require invoking the
  `size:exception` fallback.

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run --config vitest.config.ts "app/(app)/dashboard/[groupId]/_components/QuickAddExpense.test.tsx" "app/_data/categories.test.tsx" "app/(app)/dashboard/[groupId]/DashboardClient.test.tsx" "app/(app)/dashboard/[groupId]/_regions.test.tsx" "app/(app)/dashboard/[groupId]/_widgets/BudgetCategories.test.tsx" "app/(app)/dashboard/[groupId]/_widgets/BudgetTransfers.test.tsx" "app/(app)/dashboard/[groupId]/page.test.tsx"`: 40/40 passed (6 files run together earlier at 34/34, `page.test.tsx` 4/4 confirmed separately after the `page.tsx` restructure). Full root suite: 114 files / 558 tests, all passed. |
| Runtime harness command/scenario and exact result | No live `next dev`/browser harness available in this environment (same as Slice A). `npm run lint:next` and `npm run typecheck:next` both clean — the available proxy for Next.js route/JSX/TSX compile correctness. |
| Rollback boundary | Revert `page.tsx` to the single `await Promise.all` + one `HydrationBoundary` (git history has the pre-restructure version from Slice A's merge); delete `_regions.tsx` and `_regions.test.tsx`; revert `DashboardClient.tsx`/`DashboardClient.test.tsx`, `QuickAddExpense.tsx`/`QuickAddExpense.test.tsx`, `app/_data/categories.ts`, `page.test.tsx`, and the two spec deltas. Slice A's fallbacks (`_skeletons.tsx`, `loading.tsx` files, `Spinner.tsx`, widget skeleton conversions), already merged, are entirely unaffected by any of the above. |

## Files Changed (Slice B, this run)

| File | Action |
|---|---|
| `app/(app)/dashboard/[groupId]/_regions.tsx` | Created |
| `app/(app)/dashboard/[groupId]/_regions.test.tsx` | Created |
| `app/(app)/dashboard/[groupId]/page.tsx` | Modified (restructured) |
| `app/(app)/dashboard/[groupId]/page.test.tsx` | Modified (structural test restructure) |
| `app/(app)/dashboard/[groupId]/DashboardClient.tsx` | Modified (`children` prop) |
| `app/(app)/dashboard/[groupId]/DashboardClient.test.tsx` | Modified (`categoriesSlot()` fixture) |
| `app/(app)/dashboard/[groupId]/_components/QuickAddExpense.tsx` | Modified (`ExpenseFields` extraction) |
| `app/(app)/dashboard/[groupId]/_components/QuickAddExpense.test.tsx` | Modified (new RED test) |
| `app/_data/categories.ts` | Modified (`enabled` param) |
| `openspec/specs/dashboard-view/spec.md` | Modified |
| `openspec/specs/client-data-cache/spec.md` | Modified |
| `openspec/changes/app-loading-states/tasks.md` | Modified (41/41 checkboxes marked `[x]`) |

## Status

**41/41 tasks complete** (28/41 Slice A, already merged via PRs #232/#233;
13/41 Slice B, this run). This is the last implementation slice of the
change per the orchestrator's brief. Working tree left uncommitted for the
orchestrator to review and commit/push as PR #2 (stacked on
`origin/nextjs-integration`, per the chain strategy), consistent with how
Slice A was handled.

Ready for `sdd-verify`.
