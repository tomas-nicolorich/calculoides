# Apply Progress: App Loading States — Slice A COMPLETE (28/41), Slice B pending (13/41)

**Mode**: Strict TDD (RED → GREEN, safety-net run before every existing-file edit)
**Delivery**: auto-chain, stacked-to-main (trunk `origin/nextjs-integration`), all work uncommitted on the current branch — orchestrator decides commit/branch/PR split

## Scope of This Run

Slice A ONLY — tasks.md Phases 1-4. Slice B (Phases 5-6: dashboard streaming,
`_regions.tsx`, `page.tsx` restructure, `useCategoriesList` `enabled` param,
`QuickAddExpense.tsx`) is out of scope for this apply run per design.md's
two-chained-PR sequencing mandate (Slice A must land first — Slice B's
`<Suspense>` fallbacks import Slice A's `_skeletons.tsx` exports).

## Completed Tasks (28/41 — all of Phase 1-4)

**Phase 1 (1.1-1.7)**: `app/_ui/Spinner.tsx` ported verbatim from
`origin/main:frontend/src/shared/ui/Spinner.tsx` (only the `cn` import path
changed). Barrel export added. `app/(app)/dashboard/[groupId]/_skeletons.tsx`
created with all 8 exports from design.md's Interfaces/Contracts, reproducing
`DashboardClient`'s exact container chain.

**Phase 2 (2.1-2.11)**: 9 `loading.tsx` files — 8 `(app)` segments shaped to
each segment's real Client component container width/structure (verified
against live source, not guessed), plus 1 shared `(auth)/loading.tsx`
(centered `Spinner`, no `layout.tsx` per Decision 1).

**Phase 3 (3.1-3.7)**: 5 dashboard widgets (RecentExpenses, RemainingBalance,
IncomeOverview, BudgetTransfers, BudgetCategories) converted from
`<p>Loading…</p>` to shaped `Skeleton` components; nested `TransferHistory`
drill-down converted to two skeleton rows. RED written first for every
conversion (confirmed failing against unmodified production code), then
GREEN.

**Phase 4 (4.1-4.3)**: `openspec/specs/route-loading-states/spec.md` created
(new capability). `openspec/specs/ui-design-system/spec.md` modified (2 new
Spinner requirements). Full scoped test/lint/typecheck run: all green.

## Test Results

- Scoped Slice A suite (19 test files): **100/100 passed**
- Full root suite (`npx vitest run --config vitest.config.ts`, all
  `app/**`/`lib/**`/`shared/**`/`proxy.test.ts`): **113 files / 554 tests,
  all passed** — confirms Slice B code paths untouched and unbroken.
- `npm run lint:next`: clean (0 warnings/errors).
- `npm run typecheck:next`: clean.

## Review Budget / Diff Size — EXCEEDS FORECAST, FLAGGED

Measured actual diff: **~1,108 changed lines** (937 new-file lines + 139
insertions/32 deletions across modified files). This exceeds both the
tasks.md forecast (~600-750 for Slice A) and the 800-line session review
budget.

tasks.md's own forecast already anticipated this: if Slice A approaches or
exceeds 800 lines, split into stacked sub-PRs **1a** (Phases 1+3, Spinner +
`_skeletons.tsx` + widget conversions, ~462 lines) → **1b** (Phases 2+4, 9
`loading.tsx` files + spec deltas, ~646 lines), both still landing before
Slice B's PR #2 and both still targeting `origin/nextjs-integration`.
Recommending this split rather than shipping Slice A as one 1,108-line PR.

## Known Deviation

tasks.md 3.1/3.2 cite `dashboard-view` spec requirements ("Widget-Level
Loading Indicators Use Skeleton, Not Plain Text", "Category drill-down shows
Skeleton while transfer history loads") not yet present in the base
`openspec/specs/dashboard-view/spec.md`. Per design.md's File Changes table
and this run's explicit scope boundary, that spec delta belongs to Slice B
(task 6.5). The Slice A code implements the behavior now; the formal spec
text is deferred to Slice B.

## Non-Changes Confirmed

Zero diff in `DashboardClient.tsx`, `page.tsx`, `_regions.tsx` (doesn't
exist yet), `QuickAddExpense.tsx`, `app/_data/categories.ts`,
`dashboard-view/spec.md`, `client-data-cache/spec.md`. Slice B's territory
is fully untouched.

## Remaining Tasks (Slice B — separate later apply run)

- [ ] 5.1-5.7 (data layer & `_regions.tsx`, RED → GREEN)
- [ ] 6.1-6.6 (page restructure, test restructure, dashboard-view/client-data-cache spec deltas)

Ready for sdd-verify (Slice A) once the PR-split decision above is resolved.
