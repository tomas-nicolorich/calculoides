# Data Model: 004 — Redesign Design Constraints

*Phase 1 output. No new database tables. All additions are in-memory types and shared logic.*

## New Types

### `shared/logic/projection.ts`

```typescript
// Pure functions — no side effects, no I/O

/** Returns the number of months required to reach the target. */
export function calculateProjectedMonths(
  targetAmount: number,
  startingAmount: number,
  totalMonthly: number,
): number

/** Returns Infinity when totalMonthly <= 0 or remainingToSave <= 0 (already funded returns 0). */

/** Adds months to a date using setMonth — same arithmetic as existing server implementation. */
export function addMonths(date: Date, months: number): Date

/** Saturates at +100 years when months === Infinity. */
```

### `ContributionSessionState` (frontend entity layer)

Lives in `frontend/src/entities/savings-goal/index.ts` alongside the existing `SavingsGoal` and `ContributionBreakdown` interfaces.

```typescript
/** The three phases of a Contribution Session lifecycle. */
export type ContributionSessionPhase = 'idle' | 'editing' | 'saving';

/** In-memory snapshot taken at session open; used to restore on Cancel. */
export type PreResetSnapshot = Record<string, number>; // memberId → override amount

export interface ContributionSessionState {
  phase: ContributionSessionPhase;
  /** memberId → override amount for this session (undefined = use proportional default) */
  overrideAmounts: Record<string, number>;
  /** Snapshot captured on sessionStart; restored on cancelSession */
  preResetSnapshot: PreResetSnapshot;
  /** Derived — updated on every override change; null when phase === 'idle' */
  localProjectedMonths: number | null;
}
```

### `ContributionSessionAction` (frontend entity layer)

```typescript
export type ContributionSessionAction =
  | { type: 'sessionStart'; snapshot: PreResetSnapshot }
  | { type: 'overrideAmount'; memberId: string; amount: number }
  | { type: 'resetToIncomeSplit' }
  | { type: 'saveStart' }
  | { type: 'saveSuccess' }
  | { type: 'cancelSession' };
```

## State Transitions

```
idle
  └─ sessionStart(snapshot) ──────────────────────────────► editing
                                                               │
                                                   overrideAmount(memberId, amount)
                                                   resetToIncomeSplit
                                                   (stays in editing, updates localProjectedMonths)
                                                               │
                                          ┌────────────────────┤
                                          │                    │
                                    saveStart             cancelSession
                                          │                    │
                                          ▼                    ▼
                                       saving               idle
                                          │           (restores overrideAmounts
                                          │            from preResetSnapshot)
                                    saveSuccess
                                          │
                                          ▼
                                        idle
                                  (goal data refetched;
                                   server projectedDate shown)
```

## Existing Types (unchanged)

The following types are already defined and will not be modified:

```typescript
// frontend/src/entities/savings-goal/index.ts — EXISTING
interface ContributionBreakdown {
  memberId: string;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: User;
}

interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}
```

## No Schema Changes

The `SavingsGoalContribution` Prisma model remains unchanged. The Contribution Session state is entirely in-memory in the React component tree — it is not persisted until the user clicks Save, at which point the existing `upsertContribution` endpoint is called for each overridden member.

## Derived Values (not stored)

| Derived Value | Formula | When Computed |
|--------------|---------|---------------|
| `totalMonthly` | `sum(breakdown[i].actualAmount)` applying session overrides | Every render during `editing` |
| `localProjectedMonths` | `calculateProjectedMonths(goal.targetAmount, goal.startingAmount, totalMonthly)` | Every override dispatch |
| `localProjectedDate` | `addMonths(new Date(), localProjectedMonths)` | Every override dispatch |
| `targetMonths` | `(new Date(goal.targetDate).getFullYear() - now.getFullYear()) * 12 + (new Date(goal.targetDate).getMonth() - now.getMonth())` — mirrors the server's calendar diff in `savings.ts:182` | Session start |
| Forecast color | `localProjectedMonths <= targetMonths ? 'green' : 'amber'` | Every render during `editing` |
