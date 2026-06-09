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

/** Server-side contribution values captured at session open; used by cancelSession to discard all in-session changes (FR-DS-003). */
export type SessionStartSnapshot = Record<string, number>; // memberId → server amount

/** Contribution values captured immediately before a resetToIncomeSplit; restored by undoReset. Null when no reset has occurred in this session (FR-DS-004). */
export type PreResetSnapshot = Record<string, number> | null;

export interface ContributionSessionState {
  phase: ContributionSessionPhase;
  /** memberId → override amount for this session (undefined = use proportional default) */
  overrideAmounts: Record<string, number>;
  /** Server values captured at sessionStart; restored on cancelSession to discard all in-session changes (FR-DS-003). */
  sessionStartSnapshot: SessionStartSnapshot;
  /** Captured immediately before resetToIncomeSplit; restored on undoReset; null when no reset has occurred (FR-DS-004). */
  preResetSnapshot: PreResetSnapshot;
  /** Derived — updated on every override change; null when phase === 'idle' */
  localProjectedMonths: number | null;
}
```

### `ContributionSessionAction` (frontend entity layer)

```typescript
export type ContributionSessionAction =
  | { type: 'sessionStart'; snapshot: SessionStartSnapshot }
  | { type: 'overrideAmount'; memberId: string; amount: number }
  | { type: 'resetToIncomeSplit' }
  | { type: 'undoReset' }
  | { type: 'saveStart' }
  | { type: 'saveSuccess' }
  | { type: 'saveFailure'; error: string }
  | { type: 'cancelSession' };
```

## State Transitions

```
idle
  └─ sessionStart(snapshot) ──────────────────────────────► editing
                                  (captures sessionStartSnapshot)          │
                                                   overrideAmount(memberId, amount)
                                                   resetToIncomeSplit (captures preResetSnapshot)
                                                   undoReset (restores preResetSnapshot, clears it)
                                                   (stays in editing, updates localProjectedMonths)
                                                               │
                                          ┌────────────────────┤
                                          │                    │
                                    saveStart             cancelSession
                                          │                    │
                                          ▼                    ▼
                                       saving               idle
                                          │           (restores overrideAmounts
                                    ┌─────┴──────┐    from sessionStartSnapshot)
                               saveSuccess  saveFailure
                                    │            │
                                    ▼            ▼
                                  idle         saving
                            (goal data    (error set,
                             refetched;    session active)
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
