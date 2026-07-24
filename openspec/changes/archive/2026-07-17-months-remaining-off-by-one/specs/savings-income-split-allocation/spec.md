# Delta for savings-income-split-allocation

## ADDED Requirements

### Requirement: Single Source of Truth for Months-Remaining Calculation

The system MUST compute the adjusted calendar-months-remaining value consumed by (a) the contribution divisor and (b) the variance/forecast comparison via one shared calculation, so the adjustment logic cannot drift between call sites without being applied everywhere.

#### Scenario: Identical inputs yield identical output across call sites

- GIVEN the same `now` and `targetDate` inputs
- WHEN months-remaining is computed for the contribution-divisor use (api/_src/services/savings.ts) and for the variance/forecast use (api/_src/services/savings.ts `getGoalsForGroup`, frontend/src/entities/savings-goal/useContributionSession.ts)
- THEN all three call sites MUST return the same numeric value for equal inputs

### Requirement: Ceiling-Warning Code Path Non-Regression

The `ceilingWarnings` derivation (useContributionSession.ts:182-190) MUST NOT have its comparison logic altered by this fix. Only the upstream numeric inputs it consumes (proportionalAmount, fed by the corrected totalMonthlyNeed) MAY change.

#### Scenario: Ceiling-warning comparison code path is untouched

- GIVEN `ceilingWarnings` compares each member's effective contribution (`overrideAmounts[id] ?? proportionalAmount`) against `remainingBalance`
- WHEN the months-remaining off-by-one fix is applied
- THEN that comparison's code path MUST remain unchanged
- AND only the numeric value of `proportionalAmount` MAY differ as a downstream cascade

#### Scenario: Existing ceiling-warning tests remain valid without modification

- GIVEN `useContributionSession.test.ts:241-471` hardcodes `proportionalAmount`/`remainingBalance` directly in mock fixtures, not derived from `calculateSavingsContributions`
- WHEN the fix is applied
- THEN those tests MUST continue to pass unmodified

## MODIFIED Requirements

### Requirement: Monthly Contribution Divisor Must Not Over-Count Elapsed and Deadline Months

The `monthsRemaining` value used as the divisor for `totalMonthlyNeed` in `calculateSavingsContributions` (api/_src/services/savings.ts:31-33) MUST exclude the current partially-elapsed month and the deadline month from the count of full contribution opportunities.
(Previously: raw calendar-month diff `(targetYear-nowYear)*12 + (targetMonth-nowMonth)` used unadjusted as the divisor, over-counting by one and understating required monthly contributions.)

#### Scenario: Multi-month goal computes the reduced, correct divisor

- GIVEN a goal with remaining amount 27100, target date August 2027, and "now" July 2026
- WHEN `calculateSavingsContributions` computes `monthsRemaining`
- THEN `monthsRemaining` MUST equal 12 (not 13)
- AND `totalMonthlyNeed` MUST equal 2258.33 (not 2084.62)

#### Scenario: Target exactly one calendar month out triggers lump-sum fallback

- GIVEN a target date exactly one calendar month after "now"
- WHEN the adjusted `monthsRemaining` is computed
- THEN it MUST equal 0
- AND the existing `monthsRemaining <= 0` immediate-lump-sum branch MUST apply, unchanged

#### Scenario: Target date within current month or past remains a lump-sum

- GIVEN target date falls within the current calendar month or earlier
- WHEN `monthsRemaining` is computed
- THEN it MUST be `<= 0` and the immediate-payment branch MUST apply, unchanged

### Requirement: Variance and Forecast Comparisons Must Use the Corrected Months-Remaining

`targetMonths` feeding `varianceMonths` (api/_src/services/savings.ts:260-266) and `targetMonths` feeding `forecastColor` (frontend/src/entities/savings-goal/useContributionSession.ts:158-176) MUST use the same corrected adjustment as the divisor. The exact boundary-value semantics of comparing this adjusted value against `calculateProjectedMonths`'s forward `Math.ceil` projection are DEFERRED to design; this requirement specifies only the observable contract below.
(Previously: both sites used the same unadjusted raw calendar-month diff as the divisor formula, duplicated and independently editable.)

#### Scenario: On-pace goal is not misclassified as delayed

- GIVEN a goal whose actual contribution rate exactly matches its required rate, such that `calculateProjectedMonths` yields a `projectedMonths` equal to the corrected `targetMonths`
- WHEN `varianceMonths` (API) and `forecastColor` (frontend) are computed
- THEN the goal MUST be classified as on-pace (`varianceMonths` = 0, `forecastColor` = green), not as delayed

#### Scenario: API and frontend agree on the same goal

- GIVEN identical `now`/`targetDate`/progress inputs supplied to both the API `getGoalsForGroup` path and the frontend `useContributionSession` path
- WHEN each independently computes its comparison-operand `targetMonths`
- THEN both MUST produce the same `targetMonths` value

### Requirement: Contribution Split Test Fixture Reflects Corrected Divisor

`api/_tests/logic/savings.test.ts:11-36` MUST assert monthly-split values computed from the corrected divisor, not the buggy one.
(Previously: fixture asserted a 120/80 split computed from an inflated 5-month divisor.)

#### Scenario: Fixture asserts the corrected split

- GIVEN the existing test's remaining-amount and target-date inputs
- WHEN `calculateSavingsContributions` runs post-fix
- THEN the test MUST assert a 150/100 split derived from the corrected 4-month divisor
- AND the test MUST fail if it still asserts 120/80
