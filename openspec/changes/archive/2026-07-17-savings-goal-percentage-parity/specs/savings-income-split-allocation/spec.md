# Delta for savings-income-split-allocation

## ADDED Requirements

### Requirement: Percent-Dollar Reconciliation Invariant

For each member in a savings goal's income-split allocation, the displayed `percentage` and the computed `monthlyContribution` MUST derive from the same underlying share value, so they reconcile.

#### Scenario: Percent and dollar amount reconcile for the repro case

- GIVEN `calculateRoundedShares` produces a member percentage of 29.1%
- WHEN `calculateSavingsContributions` computes that member's `monthlyContribution`
- THEN `monthlyContribution / totalMonthlyNeed` MUST equal `percentage / 100` within a one-cent rounding tolerance
- AND the two figures MUST NOT be derived from independently-rounded values (`share` vs. `percentage`)

#### Scenario: Contributions still sum exactly to the monthly total

- GIVEN any member set passed to `calculateSavingsContributions`
- WHEN all members' `monthlyContribution` values are summed
- THEN the sum MUST equal `totalMonthlyNeed` exactly (remainder-absorption invariant preserved)

### Requirement: Category-Budget Rounding Non-Regression

`calculateRoundedShares` (shared/logic/rounding.ts) and its `share`/`percentage` split MUST NOT change behavior as a result of this fix.

#### Scenario: Category-budget quota math is unaffected

- GIVEN a category-budget allocation that consumes `calculateRoundedShares` output directly (not via `calculateSavingsContributions`)
- WHEN this fix is applied
- THEN the returned `share` and `percentage` values MUST be identical to pre-fix output

#### Scenario: Fix is scoped to the savings-goal boundary only

- GIVEN the fix targets `calculateSavingsContributions` and/or its caller `SavingsService.getGoalsForGroup`
- WHEN the change is applied
- THEN `shared/logic/rounding.ts` MUST remain unmodified

### Requirement: Reconciliation Test Coverage

A unit test MUST assert the percent-dollar reconciliation invariant using the issue #160 repro case.

#### Scenario: New test reproduces and closes the reported mismatch

- GIVEN the member set and inputs from the issue #160 repro (a member displayed at 29.1% whose contribution previously reflected a different share)
- WHEN the updated test in `api/_tests/logic/savings.test.ts` runs post-fix
- THEN it MUST assert `monthlyContribution / totalMonthlyNeed` matches `percentage / 100` (one-cent tolerance) for every member
- AND it MUST fail if `calculateSavingsContributions` reverts to consuming `m.share` directly

## MODIFIED Requirements

### Requirement: Savings Contribution Money Math Input

`calculateSavingsContributions` MUST derive each member's proportional weight from the 1-decimal-precision `percentage` value (`percentage / 100`) produced by `calculateRoundedShares`, not from the coarser 2-decimal-precision `share` value, whenever both are available for the same member.
(Previously: computed `baseAmount` directly from `m.share`, a value independently floored to 2dp and diverging from the displayed `percentage` for the same member.)

#### Scenario: Money math consumes the percentage-derived weight

- GIVEN a member whose `calculateRoundedShares` output has `share = 0.29` and `percentage = 29.1`
- WHEN `calculateSavingsContributions` computes that member's `baseAmount`
- THEN it MUST use `0.291` (percentage / 100) as the proportional weight, not `0.29`

#### Scenario: Remainder absorption still applies to the highest-share member

- GIVEN percentage-derived weights do not divide `totalMonthlyNeed` evenly across members
- WHEN each member's base amount is floored to 2dp
- THEN the leftover cents MUST still be absorbed onto the highest-share member, unchanged from current behavior

#### Scenario: Two-member goal is fully reconciled end to end

- GIVEN a two-member group with incomes producing `share = [0.29, 0.71]` and `percentage = [29.1, 70.9]`, and a `totalMonthlyNeed` of 1000.00
- WHEN `calculateSavingsContributions` runs
- THEN member 1's `monthlyContribution` MUST be 291.00 and member 2's MUST be 709.00
- AND both amounts MUST divide back to their exact displayed percentage (29.1% and 70.9%)
