# Contract: `shared/logic/projection.ts`

*Public API for the shared projection formula module.*

## Module Location

```
shared/logic/projection.ts
```

Exported from `shared/index.ts` via `export * from "./logic/projection"`.

Consumed by:
- `api/src/services/savings.ts` — replaces inline `calculateProjectedDate` implementation
- `frontend/src/entities/savings-goal/index.ts` — drives live Contribution Session preview

## Function Signatures

```typescript
/**
 * Returns the whole number of months required to reach the savings target.
 *
 * Edge cases:
 *   - Returns 0 when targetAmount <= startingAmount (already funded).
 *   - Returns Infinity when totalMonthly <= 0 (no contributions configured).
 */
export function calculateProjectedMonths(
  targetAmount: number,
  startingAmount: number,
  totalMonthly: number,
): number;

/**
 * Adds a whole number of months to a Date using setMonth().
 *
 * Edge cases:
 *   - When months is Infinity, returns startDate + 100 years (far-future sentinel).
 *   - When months is 0, returns a copy of startDate.
 *   - Does not mutate startDate.
 */
export function addMonths(date: Date, months: number): Date;
```

## Invariants

1. `calculateProjectedMonths` is a pure function — no side effects, no `new Date()` calls inside.
2. `addMonths` does not mutate its `date` argument — it always returns a new `Date` instance.
3. The 100-year sentinel matches the existing server behavior in `api/src/services/savings.ts` (line 82: `farDate.setFullYear(startDate.getFullYear() + 100)`).
4. Rounding: `Math.ceil` — identical to the existing server formula.

## Test Coverage Requirements

The following cases must have unit tests (Vitest) in `shared/logic/projection.test.ts`:

| Case | Input | Expected |
|------|-------|----------|
| Normal | target=10000, starting=2000, total=800 | `calculateProjectedMonths` → 10 |
| Already funded | target=5000, starting=6000, total=500 | 0 |
| Zero contributions | target=10000, starting=0, total=0 | Infinity |
| Negative monthly (guard) | target=10000, starting=0, total=-100 | Infinity |
| `addMonths` normal | 2026-01-01, months=3 | 2026-04-01 |
| `addMonths` Infinity | 2026-01-01, months=Infinity | 2126-01-01 |
| `addMonths` zero | 2026-06-06, months=0 | copy of 2026-06-06 |
| `addMonths` no mutation | any date | original date unchanged |

## Server Migration Guide

In `api/src/services/savings.ts`, replace `calculateProjectedDate` with the shared primitives:

**Before** (inline, lines 64–90):
```typescript
export function calculateProjectedDate(
  targetAmount: number,
  startingAmount: number,
  startDate: Date,
  contributions: { memberId: string; amount: number }[]
): Date {
  const totalMonthly = contributions.reduce(...)
  const remainingToSave = Math.max(0, targetAmount - startingAmount)
  if (remainingToSave <= 0) return startDate;
  if (totalMonthly <= 0) { farDate.setFullYear(+100); return farDate; }
  const monthsRequired = Math.ceil(remainingToSave / totalMonthly);
  projectedDate.setMonth(projectedDate.getMonth() + monthsRequired);
  return projectedDate;
}
```

**After** (using shared):
```typescript
import { calculateProjectedMonths, addMonths } from "shared";

// In getGoalsForGroup, replace the calculateProjectedDate call:
const totalActual = finalContributions.reduce((acc, fc) => acc + fc.actualAmount, 0);
const months = calculateProjectedMonths(targetAmount, startingAmount, totalActual);
const projectedDate = addMonths(now, months);
```

The inline `calculateProjectedDate` export from `savings.ts` should be removed after the migration is verified by tests.
