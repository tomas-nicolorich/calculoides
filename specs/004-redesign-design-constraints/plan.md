# Implementation Plan: 004 — Redesign Design Constraints

**Branch**: `004-redesign-design-constraints` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/004-redesign-design-constraints/spec.md`

## Summary

Deliver three user stories against the existing Savings Calculator + Dashboard UI:

1. **US1 — Live Savings Projection**: During a Contribution Session, the projected completion date updates client-side on every contribution change using `ceil((targetAmount - startingAmount) / totalMonthlyContributions)`. The formula is extracted from `api/src/services/savings.ts` into `shared/logic/projection.ts` and exported from `shared/index.ts` so both packages share the identical implementation. The API is refactored to import from `shared` — removing the inline copy.

   **Session architecture**: `useContributionSession(activeGoal: SavingsGoal | null)` lives at the `SavingsGoalList` level (one instance per page, not per goal). `SavingsGoalList` owns `activeGoalId: string | null` via `useState`. Only one Contribution Session can be active at a time — this is an explicit constraint enforced by the single hook instance and a single `activeGoalId`. Passing `null` resets the hook to idle.

2. **US2 — Reduced Visual Weight**: Typography and border tokens are adjusted project-wide: `font-bold` → `font-semibold` on primary figures, `font-bold` → `font-medium` on micro-labels (`text-[10px] uppercase tracking-widest`), `border-l-2` left accents on nested rows, `bg-slate-50/bg-slate-800/30` fill on nested rows, hover-only icon button backgrounds.

3. **US3 — Two-Column Dashboard Layout**: Dashboard grid becomes 2-column at `md`/`lg`, 3-column at `xl+`. Current implementation has a bug (`lg:grid-cols-3` instead of `xl:grid-cols-3`) that this story corrects.

See `research.md` for resolved unknowns, `data-model.md` for entity/state shapes, `contracts/` for module APIs.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict, `isolatedModules`)

**Primary Dependencies**:
- React 19.2.6 — `ref` as regular prop (no `forwardRef`), `useActionState` available
- Tailwind CSS 4.3.0 — CSS-first config only (`@theme` in CSS, no `tailwind.config.js`)
- React Router 7.15.0 — library mode; no 7.16/7.17 APIs
- Vite 8.0.12 / Vitest 4.1.6
- Express 5.2.1 / Prisma 7.8.0 / Zod 4.4.3

**Storage**: PostgreSQL via Prisma 7.8.0. No schema changes required — this feature has no new database entities. The `SavingsGoalContribution` table (existing) remains the persistence point; session state is in-memory only.

**Testing**: Vitest 4.1.6. Unit tests for `shared/logic/projection.ts` go in `api/tests/logic/projection.test.ts` — following the existing pattern where `api/tests/logic/rounding.test.ts` imports and tests `shared/logic/rounding.ts`. Hook unit tests co-located at `frontend/src/entities/savings-goal/useContributionSession.test.ts`. Forecast panel integration tests at `frontend/tests/features/savings-contribution-session.test.tsx`.

**Target Platform**: Browser SPA deployed to Vercel (via `frontend/` package). API on Vercel Functions (`api/` package).

**Project Type**: Monorepo web application (`frontend/` + `api/` + `shared/`).

**Performance Goals**: Client-side projection recalculation must complete in <16ms (one animation frame) so the forecast panel updates synchronously on every contribution input change without a loading state.

**Constraints**:
- `shared/logic/projection.ts` must be importable by both `api/` and `frontend/` via `import { ... } from "shared"` — no relative cross-package paths.
- No new API endpoints required; Save/Cancel use existing `upsertContribution`.
- Tailwind 4: only `@theme` CSS variables — no JS config file.
- React Router 7.15.x only — no 7.16+ API.

**Scale/Scope**: 3 user stories, ~8–12 files modified, 2–3 new files created (`shared/logic/projection.ts`, `specs/004/contracts/`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Principle I — TypeScript Integrity ✅ PASS (with noted pre-existing violation)

**Applies**: `shared/logic/projection.ts` must export pure functions (not a class or service object). The API service `SavingsService` already uses the `const object` pattern — the refactor to import from `shared` maintains that. Cross-package import must go via `import { ... } from "shared"`.

**Pre-existing violation (out of scope)**: Relative cross-package `shared` imports exist in ~20 files across `frontend/src/` (e.g., `import { ... } from "../../../shared/..."`). This feature will not fix them — the scope is projection formula + visual changes only. No new relative cross-package imports will be introduced by this feature.

### Principle II — Frontend Architecture (FSD) ⚠️ PASS WITH DEFERRAL

**Constitution II** (v1.2.0 amendment) removed the `widgets/` layer. `frontend/src/widgets/dashboard/ui/` still exists with: `IncomeOverview.tsx`, `RemainingBalance.tsx`, `RecentExpenses.tsx`, `BudgetCategories.tsx`, `BudgetTransfers.tsx`.

**US2 + US3 require editing these files** for typography and grid changes.

**Gate decision**: Pass. This feature's scope is visual/layout changes, not FSD layer migration. Files in `widgets/dashboard/ui/` will be edited in-place; no new `widget/` files will be introduced; no new intra-widget dependencies will be added. The `widgets/` → `features/` FSD migration is a conscious deferral tracked separately (see Complexity Tracking).

### Principle III — Server-Side Financial Logic ✅ PASS (ADR 0001 exception)

**Tension**: FR-DS-001 requires client-side projection during Contribution Session. Principle III mandates server-side financial calculations.

**Resolution**: ADR 0001 (status: Accepted) explicitly grants this exception. The justification is that Contribution Session projection is a **preview only** — no financial state is persisted until the user clicks Save, at which point the server recalculates from scratch using the same formula. The bridge mechanism is `shared/logic/projection.ts`: both `api/` and `frontend/` import the identical formula, preventing client/server divergence.

**Structural enforcement**: The API refactor in US1 (import `calculateProjectedDate` from `shared` instead of inline) makes parity automatic rather than relying on manual review.

### Principle IV — Database & ORM Standards ✅ PASS

No new Prisma models. No migrations. No schema changes. `SavingsGoalContribution` upsert on Save is unchanged.

### Principle VII — Comprehensive Testing Discipline ✅ PASS

`shared/logic/projection.ts` pure functions: `api/tests/logic/projection.test.ts` — normal case, already-funded (`remaining ≤ 0`), zero contributions, `Infinity` saturation in `addMonths`. `useContributionSession` hook: `frontend/src/entities/savings-goal/useContributionSession.test.ts` — session start/override/reset/cancel/save. Forecast panel color-coding: `frontend/tests/features/savings-contribution-session.test.tsx` via Testing Library.

### Principle XI — Monorepo Package Boundaries ✅ PASS

`shared/logic/projection.ts` → exported from `shared/index.ts`. `api/src/services/savings.ts` imports from `"shared"`. `frontend/` imports from `"shared"`. No cross-direction imports.

## Project Structure

### Documentation (this feature)

```text
specs/004-redesign-design-constraints/
├── plan.md              ← this file
├── version-guard-report.md
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── quickstart.md        ← Phase 1
└── contracts/
    ├── projection.md    ← Phase 1: shared/logic/projection.ts API
    └── contribution-session.md  ← Phase 1: UI state contract
```

### Source Code

```text
shared/
├── index.ts                          # add: export * from "./logic/projection"
└── logic/
    ├── rounding.ts                   # existing
    └── projection.ts                 # NEW — calculateProjectedMonths, addMonths

api/
├── src/
│   └── services/
│       └── savings.ts                # MODIFY — replace inline projection with shared import
└── tests/
    └── logic/
        └── projection.test.ts        # NEW — unit tests for shared/logic/projection.ts

frontend/
├── src/
│   ├── entities/
│   │   └── savings-goal/
│   │       ├── index.ts              # MODIFY — add ContributionSession types; add useContributionSession hook
│   │       └── useContributionSession.test.ts  # NEW — hook unit tests
│   ├── features/
│   │   └── savings/
│   │       ├── SavingsGoalList.tsx   # MODIFY — add activeGoalId useState; add Forecast panel; REMOVE adjustingGoalId/overrideAmounts/loading/error/successGoalId useState (replaced by hook); no success flash
│   │       └── SavingsGoalForm.tsx   # MODIFY — micro-label font weights
│   ├── pages/
│   │   └── dashboard/
│   │       └── ui/
│   │           └── DashboardPage.tsx # MODIFY — grid (lg→xl, align-items:start), font-bold→font-semibold
│   └── widgets/
│       └── dashboard/
│           └── ui/
│               ├── IncomeOverview.tsx     # MODIFY — font-bold→font-semibold on primary figures
│               ├── RemainingBalance.tsx   # MODIFY — font-bold→font-semibold on primary figures
│               ├── BudgetCategories.tsx   # MODIFY — nested row bg fills, left accents
│               └── BudgetTransfers.tsx    # MODIFY — nested row bg fills, left accents
└── tests/
    └── features/
        └── savings-contribution-session.test.tsx  # NEW — Forecast panel integration tests
```

**Structure Decision**: Monorepo web-app layout (Option 2). `shared/` module bridge is the key structural addition; all other changes are in-place edits to existing files.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| FSD: editing `widgets/` layer (Principle II) | US2 + US3 require typography and grid changes to `widgets/dashboard/ui/*.tsx`. Migration to `features/` would require renaming, moving, and re-wiring 5+ components plus update every importer — scope far exceeds the visual change. | The simplest correct action is edit-in-place with no new widget files. Full migration is a separate story. |
| Pre-existing: relative `shared` imports in `frontend/src/` (Principle I) | ~20 files across the codebase already use relative paths into `shared/src/`. Fixing them all is a codebase-wide refactor, not a feature task. | This feature will not introduce any new relative cross-package imports; it will use `import { ... } from "shared"` for all new code. |
