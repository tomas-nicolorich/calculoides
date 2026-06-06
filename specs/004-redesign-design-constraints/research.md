# Research: 004 — Redesign Design Constraints

*Phase 0 output. All NEEDS CLARIFICATION items resolved before Phase 1.*

## Resolved Unknowns

### R-001: Server formula vs. spec formula — are they identical?

**Question**: Does `api/src/services/savings.ts:calculateProjectedDate` match `ceil((targetAmount - startingAmount) / totalMonthlyContributions)` exactly?

**Finding**: Yes. Line 85 of `savings.ts`:
```ts
const monthsRequired = Math.ceil(remainingToSave / totalMonthly);
```
Where `remainingToSave = Math.max(0, targetAmount - startingAmount)`.

The date derivation:
```ts
const projectedDate = new Date(startDate);
projectedDate.setMonth(projectedDate.getMonth() + monthsRequired);
```

This matches the spec formula and the ADR-documented intent exactly. The server passes `now` as `startDate` (line 177 in `getGoalsForGroup`), so the anchor date is always "today."

**Decision**: The shared module exports two primitives: `calculateProjectedMonths` (the integer count) and `addMonths` (the date derivation). Both server and frontend compose these — the server replaces its inline `Math.ceil(...)` and `setMonth(...)` calls; the frontend uses them for live preview.

### R-002: Edge case handling — zero contributions, already funded

**Finding** (from `savings.ts`):
- `remainingToSave <= 0` → returns `startDate` unchanged (zero months needed)
- `totalMonthly <= 0` → returns `startDate + 100 years` (effectively "never")
- NaN contribution amounts → treated as `0` via `isNaN(val) ? 0 : val` guard

**Decision**: `shared/logic/projection.ts` must replicate all three:
- `calculateProjectedMonths(target, starting, total)`: returns `0` when `remaining ≤ 0`, returns `Infinity` constant when `total ≤ 0` (frontend renders "—" or "Never"; API maps `Infinity` → `+100y date`).
- `addMonths(date, months)`: saturates at `+100 years` when `months === Infinity`.

### R-003: Date derivation — should shared own it?

**Question**: If frontend and API independently call `new Date()` and `setMonth(...)`, timezone or day-of-month drift could produce a 1-month discrepancy.

**Decision**: Yes — `addMonths` is exported from `shared` so both packages use identical date arithmetic. Both pass `new Date()` locally (no network round-trip for "today"), but the month-arithmetic implementation is shared.

### R-004: React 19 state pattern for Contribution Session

**Question**: Should Contribution Session use `useState` with individual fields or `useReducer` for the full state machine?

**Finding**: The session has 4 distinct states:
1. `idle` — no active session, server values shown
2. `editing` — user has entered the session, local overrides tracked, projection live
3. `saving` — Save button clicked, network request in flight
4. `saved` — session committed, return to idle

The transition from `editing` → `idle` on Cancel requires restoring Pre-Reset Snapshot. This is a state machine with branching transitions — `useReducer` fits naturally and avoids `useState` update-sequencing bugs on the Cancel path.

**Decision**: `useReducer` with an explicit `ContributionSessionAction` discriminated union. The reducer handles all transitions; the component dispatches actions only.

### R-005: FSD layer for projection formula usage in frontend

**Question**: Should `frontend` call `calculateProjectedMonths` inside an `entities/savings-goal` hook, or inside the `features/savings` component directly?

**Finding**: `entities/` owns domain API calls and state for SavingsGoal per Constitution II. The projection formula is domain logic tied to SavingsGoal data.

**Decision**: The `entities/savings-goal/index.ts` exports a `useContributionSession(goal)` hook that encapsulates the reducer state and the projection call. The `features/savings/SavingsGoalList.tsx` component imports the hook and uses the derived projection values — no direct formula call in the feature component.

### R-006: Tailwind 4 responsive grid for 2-col/3-col dashboard

**Question**: How to express "2-col at md+, 3-col at xl+" in Tailwind 4 CSS-first syntax?

**Finding**: Tailwind 4 breakpoints are unchanged: `md` = 768px, `lg` = 1024px, `xl` = 1280px. The standard utility classes work the same way:
```html
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
```

Note: `items-start` is the Tailwind utility for `align-items: start` per FR-DS-013.

**Bug confirmed**: Current `DashboardPage.tsx` has `lg:grid-cols-3`; correct is `xl:grid-cols-3`.

### R-007: `BudgetCategories` column-span at xl+

**Finding**: FR-DS-012 requires `BudgetCategories` to span all 3 columns at xl+. In a `xl:grid-cols-3` grid:
```html
<BudgetCategories class="xl:col-span-3" />
```
At md/lg (2-col grid), it should span both columns:
```html
<BudgetCategories class="md:col-span-2 xl:col-span-3" />
```

### R-008: Pre-existing `lg:grid-cols-3` bug scope

**Finding**: `DashboardPage.tsx` line currently reads:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

Fix is: remove `lg:grid-cols-3`, add `xl:grid-cols-3 items-start`. This is the primary US3 change.

### R-009: Micro-label token definition

**Finding** (from spec + ADR 0002): Micro-labels are elements styled `text-[10px] uppercase tracking-widest`. They currently use `font-bold`; they should use `font-medium`. Affected files: `SavingsGoalForm.tsx`, potentially `BudgetCategories.tsx`, `BudgetTransfers.tsx`.

**Decision**: Search for `text-\[10px\].*uppercase` patterns in frontend components and replace `font-bold` → `font-medium` on those elements only.

### R-010: Hover-only icon button background

**Question**: What is the correct Tailwind pattern for hover-only icon button backgrounds?

**Finding** (ADR 0002): Icon buttons currently show a background at rest. The spec requires `bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700` — background only on hover.

## ADR Summaries

| ADR | Status | Decision |
|-----|--------|----------|
| ADR 0001 | Accepted | Client-side projection during Contribution Session only; formula in `shared/logic/projection.ts`; server recalculates on Save |
| ADR 0002 | Accepted | Visual weight reduction: font-semibold primary figures, font-medium micro-labels, border-l-2 accents, bg fills for nested rows, hover-only icon buttons |
| ADR 0003 | Accepted (amended) | 2-col at md/lg (`md:grid-cols-2`), 3-col at xl+ (`xl:grid-cols-3`), `items-start` alignment |

## Key Implementation Notes

### Shared Module Migration Path

`calculateProjectedDate` currently lives entirely in `api/src/services/savings.ts`. The migration is:

1. Create `shared/logic/projection.ts` with `calculateProjectedMonths` + `addMonths`
2. Add `export * from "./logic/projection"` to `shared/index.ts`
3. In `api/src/services/savings.ts`: `import { calculateProjectedMonths, addMonths } from "shared"` and replace lines 85–88 with the imported functions
4. **Verify formula parity** in unit tests before deleting the inline copy

This order ensures the server never loses the formula during migration.

### Contribution Session — No New API Endpoints

Save → existing `savingsGoalApi.upsertContribution(goalId, memberId, amount)` for each overridden member  
Cancel → no API call; state is discarded  
Reset to Income Split → clears all overrides in local state; calls `upsertContribution` only on Save

### Pre-Reset Snapshot

At `sessionStart`, the reducer builds `preResetSnapshot` from the goal's `breakdown`: `Object.fromEntries(goal.breakdown.filter(b => b.isOverridden).map(b => [b.memberId, b.actualAmount]))`. This captures the server-saved override values at session start. On `cancelSession`, the reducer restores `overrideAmounts` from this snapshot — so canceling always reverts to the server-saved state, not to empty. The snapshot is typed as `Record<string, number>` (memberId → amount). It is in-memory only — never persisted.

### Forecast Panel Color Coding

Per `frontend/CONTEXT.md`:
- **At rest** (no session): shows server `projectedDate` value, neutral color
- **During session** (`editing`): shows local projection; green if `localProjectedMonths ≤ targetMonths`, amber if `localProjectedMonths > targetMonths` (finite), red + "Never" if `localProjectedMonths === Infinity` (zero total contributions)
- **During save** (`saving`): retain last local value/label, show loading indicator

This is driven by comparing `localProjectedMonths` to `targetMonths` in the session state.
