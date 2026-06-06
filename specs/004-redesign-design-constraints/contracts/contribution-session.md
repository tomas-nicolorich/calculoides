# Contract: Contribution Session UI State

*State machine contract for the Contribution Session feature in `frontend/src/entities/savings-goal/`.*

## Hook: `useContributionSession`

**Placement**: Called once at the `SavingsGoalList` level (not per-goal). Only one Contribution Session can be active at a time — this is an explicit constraint. `SavingsGoalList` owns `activeGoalId: string | null` via its own `useState`; it passes the matching `SavingsGoal` object (or `null`) to the hook. Passing `null` puts the hook in `idle` with no active goal.

```typescript
// frontend/src/entities/savings-goal/index.ts (or a separate hook file in the same slice)

export function useContributionSession(activeGoal: SavingsGoal | null): ContributionSession;

export interface ContributionSession {
  // State
  phase: ContributionSessionPhase;               // 'idle' | 'editing' | 'saving'
  overrideAmounts: Record<string, number>;       // memberId → active override
  localProjectedMonths: number | null;           // null when idle
  localProjectedDate: Date | null;               // null when idle
  saveError: string | null;                      // network error from last saveSession(); null otherwise

  // Derived for Forecast panel
  forecastColor: 'neutral' | 'green' | 'amber' | 'red'; // neutral when idle

  // Actions
  startSession(): void;
  overrideMember(memberId: string, amount: number): void;  // NaN ignored — override not applied, projection unchanged
  resetToIncomeSplit(): void;
  saveSession(): Promise<void>;                  // upserts ALL members: overrideAmounts merged on top of breakdown proportionalAmounts; sets saveError on failure
  cancelSession(): void;
}

// Component responsibility: disable Save button while any input holds a non-numeric value (NaN guard at the boundary, before calling overrideMember).
```

## Reducer Contract

The reducer is internal to the hook — it is not exported. It handles:

| Action | From Phase | To Phase | Side Effect |
|--------|-----------|---------|-------------|
| `sessionStart` | `idle` | `editing` | Builds `preResetSnapshot` from `goal.breakdown`: `Object.fromEntries(breakdown.filter(b => b.isOverridden).map(b => [b.memberId, b.actualAmount]))`; seeds `overrideAmounts := preResetSnapshot`; runs projection formula |
| `overrideAmount` | `editing` | `editing` | Updates `overrideAmounts[memberId]` (NaN ignored); recomputes `localProjectedMonths` using projection formula below |
| `resetToIncomeSplit` | `editing` | `editing` | Clears `overrideAmounts` to `{}`; recomputes `localProjectedMonths` using projection formula below |
| `saveStart` | `editing` | `saving` | — |
| `saveSuccess` | `saving` | `idle` | Clears `overrideAmounts`, `preResetSnapshot`, `localProjectedMonths`, `saveError` |
| `saveFailure` | `saving` | `editing` | Sets `saveError`; preserves `overrideAmounts` so the user can retry or cancel |
| `cancelSession` | `editing` | `idle` | Restores `overrideAmounts` from `preResetSnapshot`; clears `saveError` |

**Projection recomputation formula** (used by `overrideAmount` and `resetToIncomeSplit`):
```ts
const totalMonthly = goal.breakdown.reduce(
  (sum, b) => sum + (overrideAmounts[b.memberId] ?? b.proportionalAmount),
  0
);
localProjectedMonths = calculateProjectedMonths(goal.targetAmount, goal.startingAmount, totalMonthly);
localProjectedDate = addMonths(new Date(), localProjectedMonths);
```
At `sessionStart`, `overrideAmounts` is seeded from `preResetSnapshot` (server-saved overrides), then this formula runs — so the Forecast panel immediately reflects the at-rest server projection, not a jump to proportional amounts.

**Save merge logic**: `saveSession` calls `upsertContribution` for every member in `goal.breakdown` via `Promise.all`. The amount per member is `overrideAmounts[memberId] ?? breakdown.proportionalAmount` — i.e., explicit overrides win; non-overridden members use their proportional amount. This ensures "Reset to Income Split → Save" writes proportional amounts to the server, clearing any previously-saved overrides. A rejected `Promise.all` sets `saveError` and leaves the session in `saving` phase; the component must surface `saveError` and allow retry or cancel.

Invalid transitions (e.g., `overrideAmount` while `phase === 'idle'`) are silently ignored by the reducer.

No success phase — `saveSuccess` transitions directly to `idle`. `onRefresh()` is called after `saveSuccess` to reload the goals list; no 800ms flash or `setTimeout`.

## Forecast Panel Contract

The Forecast panel in `SavingsGoalList.tsx` renders differently based on session phase:

| Phase | Display Value | Color |
|-------|-------------|-------|
| `idle` | `goal.projectedDate` (server value) | neutral |
| `editing` | `localProjectedDate` formatted; `"Never"` when `localProjectedMonths === Infinity` | green if `localProjectedMonths ≤ targetMonths`; amber if `localProjectedMonths > targetMonths` (finite); red if `localProjectedMonths === Infinity` |
| `saving` | last `localProjectedDate` / `"Never"` (unchanged) | loading indicator overlaid |

`targetMonths` = calendar diff between `goal.targetDate` and today: `(new Date(goal.targetDate).getFullYear() - now.getFullYear()) * 12 + (new Date(goal.targetDate).getMonth() - now.getMonth())`. This mirrors the server's computation in `savings.ts:182` — using a formula-derived value would diverge by ±1 at boundaries due to 2dp rounding in `proportionalAmount`.

## Icon Button Contract

Icon buttons that open/edit/delete goals:

```tsx
// Before (always-visible background)
<button className="p-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500">

// After (hover-only background)
<button className="p-2 rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
```

## Visual Weight Tokens

| Element | Before | After |
|---------|--------|-------|
| Primary figures (currency amounts) | `font-bold` | `font-semibold` |
| Micro-labels (`text-[10px] uppercase tracking-widest`) | `font-bold` | `font-medium` |
| Dashboard header (`text-3xl`) | `font-bold` | `font-semibold` |
| Nested row (e.g., member contribution row) | plain background | `bg-slate-50 dark:bg-slate-800/30` + `border-l-2 border-slate-200 dark:border-slate-700` |

## Dashboard Grid Contract

```tsx
// Before (bug: lg instead of xl)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// After (correct: xl for 3-col; items-start for align-items:start)
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
  <IncomeOverview />                         {/* col 1 at md/lg; col 1 at xl */}
  <RemainingBalance />                       {/* col 2 at md/lg; col 2 at xl */}
  <RecentExpenses />                         {/* col 1 at md/lg (row 2); col 3 at xl */}
  <BudgetCategories className="md:col-span-2 xl:col-span-3" />  {/* full-width both layouts */}
  <BudgetTransfers />                        {/* col 1 at md/lg (row 4); col 1 at xl */}
</div>
```

Note: At `md`/`lg` (2-col grid), `RecentExpenses` falls to row 2 column 1 and `BudgetTransfers` to row 4 column 1 — this is acceptable per ADR 0003 which specifies column count only, not per-item placement at md/lg.
