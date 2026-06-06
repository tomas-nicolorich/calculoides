# Quickstart: 004 — Redesign Design Constraints

*Developer guide for implementing this feature. Read `plan.md`, `research.md`, `data-model.md`, and `contracts/` first.*

## Prerequisites

```bash
# From repo root
git checkout -b 004-redesign-design-constraints
git branch --set-upstream-to origin/develop 004-redesign-design-constraints
npm install --workspaces
```

## Implementation Order

Work in this order to keep a passing test suite at every step:

### Step 1 — Shared projection module (no breakage risk)

**New file**: `shared/logic/projection.ts`

```typescript
const INFINITY_YEARS = 100;

export function calculateProjectedMonths(
  targetAmount: number,
  startingAmount: number,
  totalMonthly: number,
): number {
  const remaining = Math.max(0, targetAmount - startingAmount);
  if (remaining <= 0) return 0;
  if (totalMonthly <= 0) return Infinity;
  return Math.ceil(remaining / totalMonthly);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  if (!isFinite(months)) {
    result.setFullYear(result.getFullYear() + INFINITY_YEARS);
    return result;
  }
  result.setMonth(result.getMonth() + months);
  return result;
}
```

**Update**: `shared/index.ts` — add `export * from "./logic/projection";`

**Write tests**: `shared/logic/projection.test.ts` — all cases from `contracts/projection.md`.

**Verify**:
```bash
npm test -w shared
```

### Step 2 — API refactor (import from shared, delete inline copy)

**Edit**: `api/src/services/savings.ts`

1. Add `import { calculateProjectedMonths, addMonths } from "shared";` at top
2. In `getGoalsForGroup`, replace the `calculateProjectedDate(...)` call:
   ```typescript
   const totalActual = finalContributions.reduce((acc, fc) => acc + fc.actualAmount, 0);
   const months = calculateProjectedMonths(targetAmount, startingAmount, totalActual);
   const projectedDate = addMonths(now, months);
   ```
3. Delete the `export function calculateProjectedDate(...)` function body (lines 64–90)
4. Delete the `export function calculateSavingsContributions(...)` function is **NOT** changed — it stays in `savings.ts` (it handles proportional distribution, not projection)

**Verify** (run existing API tests — formula parity is proven if these pass):
```bash
npm test -w api
npm run typecheck -w api
```

### Step 3 — Entity layer: ContributionSession types + hook

**Edit**: `frontend/src/entities/savings-goal/index.ts`

Add after existing exports:
```typescript
export type ContributionSessionPhase = 'idle' | 'editing' | 'saving';
export type PreResetSnapshot = Record<string, number>;

export interface ContributionSessionState {
  phase: ContributionSessionPhase;
  overrideAmounts: Record<string, number>;
  preResetSnapshot: PreResetSnapshot;
  localProjectedMonths: number | null;
}

export type ContributionSessionAction =
  | { type: 'sessionStart'; snapshot: PreResetSnapshot }
  | { type: 'overrideAmount'; memberId: string; amount: number }
  | { type: 'resetToIncomeSplit' }
  | { type: 'saveStart' }
  | { type: 'saveSuccess' }
  | { type: 'cancelSession' };
```

**New file**: `frontend/src/entities/savings-goal/useContributionSession.ts`

Implement the reducer and hook per `contracts/contribution-session.md`. Import `calculateProjectedMonths` from `"shared"` (not a relative path).

**Write tests**:
```bash
# frontend/src/entities/savings-goal/useContributionSession.test.ts
# Test each reducer action; test forecastColor derivation; test saveSession API calls
```

**Verify**:
```bash
npm test -w frontend
npm run typecheck -w frontend
```

### Step 4 — US2: Visual weight changes

Touch files in this order (smallest diff first):

1. **`frontend/src/features/savings/SavingsGoalForm.tsx`**
   - Micro-labels: `font-bold` → `font-medium` on elements with `text-[10px] uppercase tracking-widest`
   - Card title: `font-bold` → `font-semibold`

2. **`frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`**
   - Primary figure: `text-3xl font-bold` → `text-3xl font-semibold`

3. **`frontend/src/widgets/dashboard/ui/RemainingBalance.tsx`**
   - Same pattern as IncomeOverview

4. **`frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`**
   - Nested member rows: add `bg-slate-50 dark:bg-slate-800/30 border-l-2 border-slate-200 dark:border-slate-700`
   - Icon buttons: `bg-slate-100 dark:bg-slate-700` → `bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700`

5. **`frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx`**
   - Same nested row pattern as BudgetCategories

6. **`frontend/src/pages/dashboard/ui/DashboardPage.tsx`**
   - Dashboard heading `font-bold` → `font-semibold` (if present)

**Verify visually**: Start dev server (`npm run dev -w frontend`) and check each changed component.

### Step 5 — US3: Dashboard grid layout

**Edit**: `frontend/src/pages/dashboard/ui/DashboardPage.tsx`

```tsx
// Change grid className:
// Before: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
// After:  "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start"

// Add col-span to BudgetCategories:
// Before: <BudgetCategories ... />
// After:  <BudgetCategories className="md:col-span-2 xl:col-span-3" ... />
```

Verify `BudgetCategories` accepts and forwards a `className` prop — add it if missing.

**Verify visually** at 768px (md), 1024px (lg), and 1280px (xl) viewport widths.

### Step 6 — US1: Live projection in SavingsGoalList

**Edit**: `frontend/src/features/savings/SavingsGoalList.tsx`

Replace the existing `adjustingGoalId` + `overrideAmounts` local state with `useContributionSession(goal)` per hook from Step 3.

Key rendering changes:
- Forecast panel: show `localProjectedDate ?? goal.projectedDate`
- Forecast color: apply `text-green-600` or `text-amber-500` per `forecastColor`
- Save button: disabled when `phase === 'saving'`, shows spinner
- Cancel button: calls `cancelSession()` (restores snapshot — no API call)
- Reset button: calls `resetToIncomeSplit()`
- Member input `onChange`: calls `overrideMember(memberId, amount)`

**Verify**:
```bash
npm test -w frontend     # integration tests for session flow
npm run typecheck -w frontend
```

## Running All Checks

```bash
# From repo root
npm test           # all workspaces
npm run typecheck  # all workspaces
```

## Fallow Gate

The pre-commit hook runs `fallow audit`. If it reports over-reports due to missing upstream, set the upstream first:
```bash
git branch --set-upstream-to origin/develop 004-redesign-design-constraints
```

## Files Changed Summary

| File | Change Type | Story |
|------|------------|-------|
| `shared/logic/projection.ts` | NEW | US1 |
| `shared/index.ts` | MODIFY | US1 |
| `api/src/services/savings.ts` | MODIFY (refactor) | US1 |
| `frontend/src/entities/savings-goal/index.ts` | MODIFY | US1 |
| `frontend/src/entities/savings-goal/useContributionSession.ts` | NEW | US1 |
| `frontend/src/features/savings/SavingsGoalList.tsx` | MODIFY | US1, US2 |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | MODIFY | US2 |
| `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx` | MODIFY | US2 |
| `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx` | MODIFY | US2 |
| `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` | MODIFY | US2 |
| `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx` | MODIFY | US2 |
| `frontend/src/pages/dashboard/ui/DashboardPage.tsx` | MODIFY | US2, US3 |

New test files:
- `shared/logic/projection.test.ts`
- `frontend/src/entities/savings-goal/useContributionSession.test.ts`
