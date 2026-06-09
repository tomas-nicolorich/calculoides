# Tasks: 004 — Redesign Design Constraints

**Input**: Design documents from `/specs/004-redesign-design-constraints/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests included**: Per Constitution VII and plan.md explicit test file references.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Branch configuration and workspace initialization

- [X] T001 Verify feature branch `004-redesign-design-constraints` exists, set upstream tracking: `git branch --set-upstream-to origin/develop 004-redesign-design-constraints`
- [X] T002 Install all workspace dependencies from repo root: `npm install --workspaces`

---

## Phase 2: Foundational — Shared Projection Module

**Purpose**: Core shared module that both `api/` and `frontend/` must import. US1 hook cannot be implemented until this phase is verified passing.

**⚠️ CRITICAL**: T008–T012 (US1) cannot start until this phase is complete.

**TDD order: skeleton → export → tests (RED) → implement (GREEN) → integrate → verify**

- [X] T003 Create `shared/logic/projection.ts` **skeleton only** — export `calculateProjectedMonths` and `addMonths` with correct TypeScript signatures and obviously-wrong stub bodies: `calculateProjectedMonths` returns `Number.NaN`; `addMonths` throws `new Error('not implemented')`. The file must compile and be importable but stubs must produce clear failures. Do **NOT** add production logic yet.
- [X] T004 Add `export * from "./logic/projection"` to `shared/index.ts`
- [X] T005 Write unit tests in `api/tests/logic/projection.test.ts` covering all 8 contract cases: normal (target=10000 starting=2000 total=800 → 10), already-funded (target=5000 starting=6000 → 0), zero contributions (total=0 → Infinity), negative monthly (total=-100 → Infinity), addMonths normal (2026-01-01 +3 → 2026-04-01), addMonths Infinity (+Infinity → 2126-01-01), addMonths zero (months=0 → copy of input), addMonths no-mutation (original date unchanged). Run `npm test -w api` now — **tests MUST FAIL (RED)**. Do not proceed to T003b until all tests are failing.
- [X] T003b Implement `calculateProjectedMonths` and `addMonths` in `shared/logic/projection.ts` replacing the stubs with production logic: `calculateProjectedMonths` returns `0` when `remaining ≤ 0`, `Infinity` when `totalMonthly ≤ 0`, `Math.ceil(remaining/totalMonthly)` otherwise; `addMonths` uses `setMonth` arithmetic, saturates at +100 years for Infinity, does not mutate input — per `specs/004-redesign-design-constraints/contracts/projection.md`. Run `npm test -w api` — **all T005 tests MUST PASS (GREEN)** before continuing.
- [X] T006 Refactor `api/src/services/savings.ts`: add `import { calculateProjectedMonths, addMonths } from "shared"` at top; replace `calculateProjectedDate(...)` call in `getGoalsForGroup` with `const totalActual = finalContributions.reduce((acc, fc) => acc + fc.actualAmount, 0); const months = calculateProjectedMonths(targetAmount, startingAmount, totalActual); const projectedDate = addMonths(now, months);`; delete the `export function calculateProjectedDate(...)` function body (lines 64–90)
- [X] T007 Verify formula parity and type safety: `npm test -w api && npm run typecheck -w api` must pass before proceeding

**Checkpoint**: Projection formula lives in `shared/`; API imports from `shared`; all existing API tests pass. US1 can begin.

---

## Phase 3: User Story 1 — Live Savings Projection During Editing (Priority: P1) 🎯 MVP

**Goal**: Contribution Session hook in the entity layer and live Forecast panel in `SavingsGoalList` — contribution changes update Projected Date client-side, no network round-trip during the session.

**TDD order**: types → hook skeleton → hook tests (RED) → hook impl (GREEN) → focus styles → component tests (RED) → component impl (GREEN) → verify

**Independent Test**: Open Savings Calculator, throttle network to 0 in DevTools, start a Contribution Session, change a contribution value — Projected Date updates immediately without any network request dispatched.

- [X] T008 [US1] Add `ContributionSessionPhase`, `SessionStartSnapshot`, `PreResetSnapshot`, `ContributionSessionState`, and `ContributionSessionAction` types to `frontend/src/entities/savings-goal/index.ts` per `specs/004-redesign-design-constraints/data-model.md` — append after existing `SavingsGoal` and `ContributionBreakdown` exports
- [X] T009 [US1] Create `frontend/src/entities/savings-goal/useContributionSession.ts` **skeleton** — export `useContributionSession(activeGoal: SavingsGoal | null)` with correct TypeScript signature returning a static stub state: `{ phase: 'idle' as ContributionSessionPhase, overrideAmounts: {}, sessionStartSnapshot: {} as Record<string, number>, preResetSnapshot: null as Record<string, number> | null, localProjectedMonths: null, localProjectedDate: null, forecastColor: 'neutral' as const, saveError: null, saveSession: async () => {}, cancelSession: () => {}, resetToIncomeSplit: () => {}, undoReset: () => {} }`. The file must compile — do **NOT** add reducer logic yet.
- [X] T010 [US1] Write `frontend/src/entities/savings-goal/useContributionSession.test.ts`: import `{ renderHook, act }` from `@testing-library/react`; import `{ vi, describe, it, expect, beforeEach }` from `vitest`; mock `upsertContribution` via `vi.mock("@/shared/api/supabase", ...)` and `vi.clearAllMocks()` in `beforeEach`; write unit tests for: `sessionStart` action seeds `overrideAmounts` from the provided snapshot and initializes `sessionStartSnapshot` to that snapshot with `preResetSnapshot` set to `null`; `overrideAmount` action updates `localProjectedMonths`; `resetToIncomeSplit` captures `preResetSnapshot = current overrideAmounts` then clears overrides to `{}`; `undoReset` restores `overrideAmounts` from `preResetSnapshot` and sets `preResetSnapshot` back to `null` (single-level undo per FR-DS-004); `cancelSession` restores `overrideAmounts` from `sessionStartSnapshot` and resets `preResetSnapshot` to `null` (discards all in-session changes per FR-DS-003); `saveSession` success transitions `phase` to `'idle'`; `saveSession` failure sets `saveError` and keeps `phase === 'editing'`; `forecastColor` returns `'green'` when `localProjectedMonths ≤ targetMonths`, `'amber'` when over, `'red'` when `Infinity`, `'neutral'` when `phase === 'idle'`. Run tests — **they MUST FAIL (RED)**. Do not proceed to T009b until tests fail.
- [X] T009b [US1] Implement full `useContributionSession` hook in `frontend/src/entities/savings-goal/useContributionSession.ts`, replacing the T009 skeleton: `useReducer`-based hook with all 8 reducer transitions (`sessionStart`, `overrideAmount`, `resetToIncomeSplit`, `undoReset`, `saveStart`, `saveSuccess`, `saveFailure`, `cancelSession`). Reducer semantics: `sessionStart(snapshot)` initializes `overrideAmounts = snapshot`, `sessionStartSnapshot = snapshot`, `preResetSnapshot = null`; `resetToIncomeSplit` sets `preResetSnapshot = current overrideAmounts` then clears `overrideAmounts` to income-proportional defaults; `undoReset` sets `overrideAmounts = preResetSnapshot`, `preResetSnapshot = null`; `cancelSession` sets `overrideAmounts = sessionStartSnapshot`, `preResetSnapshot = null`, `phase = 'idle'` (FR-DS-003). Derive `forecastColor` (`neutral`/`green`/`amber`/`red`); derive `localProjectedDate` from `addMonths(new Date(), localProjectedMonths)`; compute `targetMonths` as calendar diff; implement `saveSession()` calling `upsertContribution` for every member via `Promise.all` (override wins over proportional); set `saveError` on rejection — per `specs/004-redesign-design-constraints/contracts/contribution-session.md`. Run `npm test -w frontend` — **all T010 tests MUST PASS (GREEN)**.
- [X] T009a [US1] Add visible keyboard focus styles to Savings Calculator interactive elements only (FR-DS-016 — WCAG 2.1 AA): in `frontend/src/features/savings/SavingsGoalList.tsx` add `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded` to contribution amount inputs, Save, Cancel, Reset, and Undo buttons. Dashboard icon button focus styles are handled in T016 and T017 by their respective file owners.
- [X] T011 [US1] Write `frontend/tests/features/savings-contribution-session.test.tsx` with real failing assertions against the **current** `SavingsGoalList.tsx` (before the T011b refactor): import `{ render, screen, fireEvent, waitFor }` from `@testing-library/react` and `{ vi, describe, it, expect, beforeEach }` from `vitest`; set up `vi.mock("@/shared/api/supabase", ...)` and `vi.mock("@/app/providers/AuthContext", ...)` at module level; `vi.clearAllMocks()` in `beforeEach`; write tests asserting: Forecast panel renders server-returned date with no color-emphasis class when `phase === 'idle'` (neutral state per FR-DS-019); Forecast panel has `text-green-600` on under-target projection; `text-amber-500` on over-target; `text-red-500` + text `"Never"` on zero contributions; text `"Already reached"` on already-funded goal; inline `saveError` message rendered on save failure; cancel reverts Projected Date to server value and the panel returns to neutral styling; Undo button is visible after a Reset and hidden after the first manual contribution edit post-reset (FR-DS-004); Undo reverts the Forecast panel to the pre-reset projection; Save button is `disabled` during `saving` phase; Tab key cycles through contribution input, Save, Cancel, Reset, and Undo in order; Enter activates Save and Cancel. Run tests — **they MUST FAIL (RED)** because the current component lacks the hook and Forecast panel. Do not proceed to T011b until tests fail.
- [X] T011b [US1] Refactor `frontend/src/features/savings/SavingsGoalList.tsx` to make T011 tests pass: remove `adjustingGoalId`, `overrideAmounts`, `loading`, `error`, `successGoalId` local `useState`; add `activeGoalId: string | null` via `useState`; instantiate `useContributionSession(activeGoal)` once at list level; wire Forecast panel to `localProjectedDate ?? goal.projectedDate` with `forecastColor` text classes (`text-green-600`, `text-amber-500`, `text-red-500`); show `"Never"` when `localProjectedMonths === Infinity`, `"Already reached"` when `localProjectedMonths === 0`; disable Save when `phase === 'saving'`; wire Save/Cancel/Reset/Undo buttons to `saveSession`/`cancelSession`/`resetToIncomeSplit`/`undoReset` hook actions; show Undo button only when `preResetSnapshot` is non-null (hidden at rest and after first manual post-reset edit, per FR-DS-004); render Forecast panel in neutral styling (no color class, default text color) when `phase === 'idle'`; display inline `saveError` when non-null; add `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded` from T009a to all interactive elements; apply US2 micro-label `font-bold` → `font-medium` and primary figure `font-bold` → `font-semibold` changes; apply hover-only icon button backgrounds (`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700`). Run `npm test -w frontend` — **all T011 tests MUST PASS (GREEN)**.
- [X] T012 [US1] Full test suite verification: `npm test -w frontend && npm run typecheck -w frontend` — zero failures, zero type errors. Fix any regressions before proceeding.

**Checkpoint**: Contribution Session fully functional — start, adjust, save, cancel, reset all work with live Forecast panel. All tests pass.

---

## Phase 4: User Story 2 — Reduced Visual Weight UI (Priority: P1)

**Goal**: Project-wide typography and border token updates across dashboard and savings components. All five tasks are independent — no cross-file dependencies. Each task owns its file(s) exclusively.

**TDD order for each task**: (1) write failing class assertion → (2) make the change → (3) GREEN → (4) commit

**Independent Test**: Load dashboard at rest (no hover): section labels use `font-medium`, left accents are 2px, icon buttons have no background, nested rows inside cards show `bg-slate-50` / `bg-slate-800/30` fill.

- [X] T013 [P] [US2] Update `frontend/src/features/savings/SavingsGoalForm.tsx`: (1) create `frontend/src/features/savings/SavingsGoalForm.test.tsx` if it does not exist (mirroring the minimal setup in `frontend/src/features/savings/SavingsGoalList.test.tsx`); in that test file add `expect(screen.getByText(/section-label/i)).toHaveClass('font-medium')` and `expect(screen.getByRole('heading', { level: 2 })).toHaveClass('font-semibold')` — run and confirm FAIL; (2) change `font-bold` → `font-medium` on all elements using `text-[10px] uppercase tracking-widest`; change `font-bold` → `font-semibold` on the card title; (3) run tests — all must PASS; git commit: `feat(savings): reduce visual weight on SavingsGoalForm (FR-DS-005, FR-DS-006)`
- [X] T014 [P] [US2] Update `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx` (this task owns the file exclusively — do not edit in parallel with any other task): (1) in `frontend/tests/widgets/income.test.tsx` add a test asserting the primary figure has `font-semibold` and a test asserting `screen.getByText('No members yet')` is in the document when rendered with `members={[]}` — run and confirm FAIL; (2) change `text-3xl font-bold` → `text-3xl font-semibold` on the primary figure element; add `{members.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No members yet</p>}` before the member list (FR-DS-017); (3) run tests — all must PASS; git commit: `feat(dashboard): font-semibold on primary figure, empty-state label in IncomeOverview (FR-DS-005, FR-DS-017)`
- [X] T015 [P] [US2] Update `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx` (this task owns the file exclusively): (1) create `frontend/tests/widgets/balance.test.tsx` if it does not exist (mirroring the pattern in `frontend/tests/widgets/income.test.tsx`); in that test file add a test asserting the primary figure has `font-semibold` and a test asserting `screen.getByText('No members yet')` appears when rendered with `members={[]}` — run and confirm FAIL; (2) change `text-3xl font-bold` → `text-3xl font-semibold` on the primary figure element; add `{members.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No members yet</p>}` before the member list (FR-DS-017); (3) run tests — all must PASS; git commit: `feat(dashboard): font-semibold on primary figure, empty-state label in RemainingBalance (FR-DS-005, FR-DS-017)`
- [X] T016 [P] [US2] Update `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` (this task owns the file exclusively — T009a does not touch this file): (1) in `frontend/tests/widgets/categories.test.tsx` add tests asserting: nested rows have `bg-slate-50`; icon buttons have no `bg-slate-100` at rest; icon buttons have `focus-visible:ring-2`; `screen.getByText('No categories yet')` is present when rendered with `categories={[]}` — run and confirm FAIL; (2) add `bg-slate-50 dark:bg-slate-800/30 border-l-2 border-slate-200 dark:border-slate-700` to nested member/item row elements; replace always-visible icon button backgrounds (`bg-slate-100 dark:bg-slate-700`) with hover-only + focus pattern (`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded`); add `{categories.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No categories yet</p>}` before the category list (FR-DS-017); (3) run tests — all must PASS; git commit: `feat(dashboard): nested rows, hover/focus icon buttons, empty-state label in BudgetCategories`
- [X] T017 [P] [US2] Update `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx` (this task owns the file exclusively — T009a does not touch this file): (1) add tests asserting nested rows have `bg-slate-50` and icon buttons have `focus-visible:ring-2` — run and confirm FAIL; (2) add `bg-slate-50 dark:bg-slate-800/30 border-l-2 border-slate-200 dark:border-slate-700` to nested row elements; apply hover-only icon button pattern with focus styles (`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded`); (3) run tests — all must PASS; git commit: `feat(dashboard): nested row fills, hover-only icon buttons, focus styles in BudgetTransfers`

**Note**: `BudgetTransfers` and `RecentExpenses` already have empty-state labels (`"No recent transfers"` / `"No recent expenses"`) and do not require changes for FR-DS-017.

**Dependency note on SavingsGoalList.tsx**: The `SavingsGoalList.tsx` US2 changes (micro-label font weights, hover-only icon button backgrounds) are bundled into T011b (a US1 Phase 3 task). T013–T017 do not touch `SavingsGoalList.tsx`. Phase 4's five tasks are independent of each other and of Phase 3, but the `SavingsGoalList.tsx` US2 slice completes as part of Phase 3 (T011b), not Phase 4.

**RecentExpenses.tsx**: Confirmed — no interactive icon buttons, no `font-bold` on primary figures. Excluded from US2 scope; no action required for FR-DS-009 or FR-DS-016.

**Checkpoint**: All five files updated. Visual weight changes visible across dashboard and savings. `npm run typecheck -w frontend` passes.

---

## Phase 5: User Story 3 — Two-Column Dashboard Layout (Priority: P1)

**Goal**: Fix dashboard grid bug (`lg:grid-cols-3` → `xl:grid-cols-3`), add `items-start` alignment, and add `BudgetCategories` column-span so it spans full width at all desktop breakpoints.

**Independent Test**: Load dashboard at 1024px (`lg`): two-column grid, Income Overview + Remaining Balance top row, Budget Categories full-width row, Recent Expenses + Budget Transfers bottom row. At 1280px+ (`xl`): three-column grid. No card height-stretches to match a taller sibling.

- [X] T018 [US3] Update `frontend/src/pages/dashboard/ui/DashboardPage.tsx`: (1) in `frontend/tests/pages/dashboard.test.tsx` add `expect(gridContainer).toHaveClass('xl:grid-cols-3')`, `expect(gridContainer).not.toHaveClass('lg:grid-cols-3')`, and `expect(gridContainer).toHaveClass('items-start')` — run and confirm FAIL; (2) change grid `className` from `"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"` to `"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start"`; add `className="md:col-span-2 xl:col-span-3"` prop to `<BudgetCategories>`; if `BudgetCategories` does not accept/forward a `className` prop, add it; change dashboard heading `font-bold` → `font-semibold` if present; (3) run tests — all must PASS; git commit: `feat(dashboard): fix grid breakpoint lg→xl, add items-start, BudgetCategories full-width span (FR-DS-010–012)`

**Checkpoint**: Dashboard renders 2-col at md/lg and 3-col at xl+. `BudgetCategories` spans full width. No sibling height-stretching at any breakpoint.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite validation, visual verification, and scope-completeness audit across all three stories.

- [X] T019 Run `npm test` from repo root — all workspaces (shared, api, frontend) must pass
- [X] T020 Run `npm run typecheck` from repo root — zero TypeScript errors across all workspaces
- [ ] T021 [P] Start dev server (`npm run dev -w frontend`) and visually verify US2 changes: section labels at `font-medium`, left accents 2px, nested row backgrounds, hover-only icon buttons at rest vs. hover, focus rings visible when Tab is used to reach any button
- [ ] T022 [P] Visual verification of US3 at viewport widths 768px, 1024px, and 1280px+ — confirm correct column counts, `BudgetCategories` full-width span, no card height-stretching
- [X] T022b [P] In `frontend/tests/pages/dashboard.test.tsx` verify the grid container has class `items-start` and does not have `self-stretch` or `h-full` on any card element — guard against the most common regression path for SC-DS-007 (sibling height-stretching). Run `npm test -w frontend` — must pass before marking Phase 6 complete.
- [ ] T023 Verify edge case rendering in dev: zero-contribution Savings Calculator shows "Never" with Save disabled (FR-DS-014); already-funded goal shows "Already reached" with Save enabled (FR-DS-018); `IncomeOverview`, `RemainingBalance`, and `BudgetCategories` all show their empty-state label when passed no data (FR-DS-017)
- [X] T024 Scope-completeness audit — run from repo root and confirm clean results: (a) `grep -rn 'border-l-4' frontend/src/` — must return zero results (SC-DS-004). If any hits appear in files outside T013–T018's scope, fix them inline during this task (change `border-l-4` → `border-l-2`) before marking T024 complete — do not leave unowned hits; (b) `grep -rn 'font-bold' frontend/src/` — review every hit; any remaining instance on a primary figure or micro-label is a missed change and must be fixed; (c) `grep -rn 'focus-visible' frontend/src/` — must return hits in `SavingsGoalList.tsx`, `BudgetCategories.tsx`, and `BudgetTransfers.tsx`; any interactive element missing a ring is a gap; (d) `grep -n 'border ' frontend/src/widgets/dashboard/ui/BudgetCategories.tsx frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx` — must show no standalone `border` class on nested rows (only `border-l-2` is permitted)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS US1 only** (US2 and US3 are independent)
- **US1 (Phase 3)**: Depends on Phase 2 — hook imports `calculateProjectedMonths` from `"shared"`
- **US2 (Phase 4)**: Depends only on Phase 1 — can start in parallel with Phase 2 immediately
- **US3 (Phase 5)**: Depends only on Phase 1 — can start in parallel with Phases 2 and 4
- **Polish (Phase 6)**: Depends on all story phases (3, 4, 5) complete

### User Story Dependencies

- **US1**: Blocked until Phase 2 complete (T003–T007). Within US1: T008 → T009 (skeleton) → T010 (RED) → T009b (GREEN) → T009a (focus) → T011 (RED) → T011b (GREEN) → T012 (verify)
- **US2**: No dependency on Phase 2, US1, or US3. All five tasks (T013–T017) are fully parallel; each owns its file exclusively.
- **US3**: No dependency on Phase 2, US1, or US2. Single task (T018).

### Within Phase 2 (TDD)

- T003 (skeleton) → T004 (export) → T005 (RED) → T003b (GREEN) → T006 (api refactor) → T007 (verify)

### Within Phase 3 (US1 TDD)

- T008 (types) → T009 (skeleton) → T010 (RED) → T009b (GREEN) → T009a (focus styles) → T011 (RED) → T011b (GREEN) → T012 (verify)

### Parallel Opportunities

- T013, T014, T015, T016, T017 (US2) — different files, no shared state — run simultaneously; each owns its file exclusively
- Phase 4 (US2) and Phase 5 (US3) can run in parallel with Phase 2 (foundational) and each other
- T019 (tests) and T020 (typecheck) can run in parallel in Phase 6
- T021 and T022 (visual verification) can run in parallel in Phase 6

---

## Parallel Example: US2 Visual Updates

```bash
# Each US2 task owns exactly one file — safe to run as simultaneous agents:
Agent 1: T013 → frontend/src/features/savings/SavingsGoalForm.tsx
Agent 2: T014 → frontend/src/widgets/dashboard/ui/IncomeOverview.tsx
Agent 3: T015 → frontend/src/widgets/dashboard/ui/RemainingBalance.tsx
Agent 4: T016 → frontend/src/widgets/dashboard/ui/BudgetCategories.tsx
Agent 5: T017 → frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx
```

## Parallel Example: US2 + US3 Alongside Phase 2

```bash
# While Developer A works on Phase 2 (T003–T007):
# Developer B runs Phase 4 (T013–T017) and Phase 5 (T018) in parallel — zero shared dependencies
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Shared Projection Module (CRITICAL — blocks US1)
3. Complete Phase 3: US1 (Live Savings Projection)
4. **STOP and VALIDATE**: Throttle network to 0, test Contribution Session live projection
5. Deploy / demo live Forecast panel

### Incremental Delivery

1. Setup + Foundational → Shared formula in place; API tests verify parity
2. US1 → Live Projection → Test independently → Deploy (MVP)
3. US2 → Visual weight reduced → Test independently → Deploy
4. US3 → Dashboard grid fixed → Test independently → Deploy

### Parallel Team Strategy

With two developers:

1. Both complete Setup (Phase 1) together
2. Developer A: Phase 2 → Phase 3 (US1, sequential TDD dependency)
3. Developer B: Phase 4 (US2, 5 tasks in parallel) + Phase 5 (US3)

---

## Notes

- T011b covers both US1 hook wiring AND US2 font/icon changes in `SavingsGoalList.tsx` — the file is modified in one pass (plan.md: "MODIFY | US1, US2"). T009a adds the focus styles; T011b wires everything else.
- Tests are mandatory per Constitution VII and plan.md explicit test file list: `api/tests/logic/projection.test.ts`, `frontend/src/entities/savings-goal/useContributionSession.test.ts`, `frontend/tests/features/savings-contribution-session.test.tsx`
- Note: `projection.test.ts` follows the existing pattern of `api/tests/logic/rounding.test.ts` — tests for `shared/logic/` live in `api/tests/logic/` not in `shared/`
- `[P]` tasks operate on different files with no shared state — safe to parallelize via `/dispatching-parallel-agents`
- Run `fallow audit` before each commit; if upstream missing: `git branch --set-upstream-to origin/develop 004-redesign-design-constraints`
- No new Prisma migrations — `SavingsGoalContribution` schema is unchanged
- TDD gate: each phase has an explicit RED→GREEN sequence; `/speckit-superb-tdd` enforces failing tests before implementation proceeds
- `BudgetTransfers` and `RecentExpenses` already have empty-state labels with `className="text-center py-8 text-slate-400 text-sm"` — new empty states in T014/T015/T016 use the same pattern for consistency
