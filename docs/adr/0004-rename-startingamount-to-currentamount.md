# Rename `startingAmount` to `currentAmount` in SavingsGoal

## Status

Accepted

## Context

The `SavingsGoal` model has a field called `startingAmount` that represents how much a group has already accumulated toward a goal. The name `startingAmount` is misleading in two ways:

1. It implies the value is fixed at creation time and never changes — but the field's intended semantics are *current* balance, not *initial* balance.
2. It makes the `ProgressMeter` UI component (savings fill bar) impossible to implement correctly, because the field reads as a one-time snapshot rather than a live figure.

The rename surfaced during a design system migration that added `ProgressMeter` to the savings goal UI. `ProgressMeter` requires a `currentAmount` / `targetAmount` pair to compute fill percentage. Using `startingAmount` as the current value works today (the initial balance *is* the current balance until we implement live updates), but the name would permanently mislead future readers about the field's purpose.

## Decision

Rename `startingAmount` → `currentAmount` across the full stack:

- Prisma schema (`savings_goals` table, column migration)
- `shared/validation.ts` Zod schema
- `shared/logic/projection.ts`
- `api/src/services/savings.ts` and `api/src/handlers/transactions.ts`
- `frontend/src/entities/savings-goal/index.ts` (`SavingsGoal` interface and API call bodies)
- All tests at every layer (the BUG-036 integration test for `startingAmount: 0` serialization is preserved — only the field name changes)
- `SavingsGoalForm` label: "Initial (€)" → "Saved So Far"

The *value* is unchanged for now: users still enter how much they've already saved when creating a goal, and the API stores it as-is. The "update it properly" work — making `currentAmount` reflect actual accumulated contributions over time — is a separate future task.

## Consequences

- A Prisma migration is required to rename the database column. No data is lost.
- The BUG-036 integration test (serialization of a zero value) continues to cover the same behaviour under the new field name.
- `ProgressMeter` in `SavingsGoalList` can now be wired up correctly: `value={goal.currentAmount}` / `max={goal.targetAmount}`.

## Rejected alternative

Rename only the frontend `SavingsGoal` TypeScript interface and add a mapping at the API boundary (`startingAmount` from the wire → `currentAmount` in the type). Rejected because it splits vocabulary across layers — every future contributor touching savings logic would need to understand the bridge — and it defers, rather than eliminates, the confusion.
