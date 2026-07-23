# Delta for Savings Goals

No prior formal spec observation exists in Engram for `savings-goals`; this delta is written against current shipped behavior as described in the proposal (`sdd/savings-goals-income-split-reset/proposal`). The MODIFIED requirement below documents that baseline explicitly (rather than copying an unavailable prior spec block) so it is not lost.

## ADDED Requirements

### Requirement: Per-Member Affordability Ceiling Exposure

The savings service MUST compute each member's affordability ceiling live (never persisted) as `income − budgeted category commitments`, via the same `calculateCategoryBalances` computation used by the dashboard's `RemainingBalance.tsx`. `SavingsService.getGoalsForGroup` (or equivalent) MUST include each member's ceiling alongside the existing goal/member breakdown in the API response.

#### Scenario: Ceiling matches dashboard remaining balance

- GIVEN a group member with income and budgeted category commitments
- WHEN the goals endpoint is fetched
- THEN that member's ceiling equals `income − budgeted category commitments`, the same figure the dashboard shows as remaining balance

#### Scenario: Ceiling is never persisted

- GIVEN a goals fetch has already returned ceilings once
- WHEN the underlying income or budget changes and goals are fetched again
- THEN the ceiling is recomputed live from current data, not read from stored state

## MODIFIED Requirements

### Requirement: Reset to Income Split Allocation

When a user triggers "Reset to Income Split" for a savings goal, the system MUST compute each member's monthly contribution as `remainingToSave / monthsRemaining`, split proportionally by each member's live income share via `calculateIncomeShares`. This calculation MUST NOT be capped, redistributed, or otherwise altered by any affordability ceiling. Reset MUST remain a point-in-time action: a previously-reset member's allocation MUST NOT retroactively change if income or budget data changes later; a new Reset click is required to recompute.

(Previously: Reset performed this same calculation with no affordability awareness and no ceiling comparison step of any kind.)

#### Scenario: Standard proportional split (unchanged)

- GIVEN a goal with a positive `remainingToSave` and `monthsRemaining`
- WHEN Reset to Income Split is triggered
- THEN each member's share is `remainingToSave / monthsRemaining` weighted by their live income share, identical to pre-change behavior

#### Scenario: Reset does not retroactively update after income changes

- GIVEN a member was reset to income split under a prior income figure
- WHEN that member's income changes afterward
- THEN their existing allocation is unchanged until the user clicks Reset again

#### Scenario: Goal already overdue

- GIVEN `monthsRemaining ≤ 0` for a goal
- WHEN Reset to Income Split is triggered
- THEN the existing lump-sum split semantics apply unchanged, split by live income share

## ADDED Requirements

### Requirement: Per-Member Over-Ceiling Warning

After the Reset to Income Split allocation is computed (per the requirement above), the system MUST compare each member's computed share against that member's ceiling. WHEN a member's computed share exceeds their ceiling, the system MUST display a non-blocking warning scoped to that member only. The warning MUST NOT alter the member's allocation value — it remains the plain proportional share. The warning MUST NOT block or validate Save, and the member's allocation MUST remain manually editable. Warnings across members MUST be independent, with no redistribution and no aggregate goal-level warning derived from this check.

#### Scenario: Member's share exceeds ceiling

- GIVEN a member's computed income-split share is greater than their ceiling
- WHEN Reset to Income Split completes
- THEN that member's row shows a warning, and their allocation value stays the unchanged proportional share

#### Scenario: Ceiling is zero or negative (over-budget member)

- GIVEN a member whose budgeted category commitments meet or exceed their income (ceiling ≤ 0)
- WHEN Reset to Income Split completes and that member's share is positive
- THEN that member shows a warning, since any positive share exceeds a non-positive ceiling

#### Scenario: Income share of 0%

- GIVEN a member with 0% live income share
- WHEN Reset to Income Split completes
- THEN that member's computed share is 0, which does not exceed a non-negative ceiling, so no warning is shown

#### Scenario: Multiple members over ceiling simultaneously

- GIVEN two or more members each have a computed share exceeding their own ceiling
- WHEN Reset to Income Split completes
- THEN each affected member shows their own independent warning, with no interaction, aggregation, or redistribution between them

#### Scenario: Single-member group

- GIVEN a savings goal with exactly one group member
- WHEN Reset to Income Split completes and that member's share exceeds their ceiling
- THEN that member shows a warning with nothing else to compare against

#### Scenario: Save is never blocked by the ceiling

- GIVEN one or more members are shown an over-ceiling warning after Reset
- WHEN the user clicks Save
- THEN the save proceeds normally with the plain proportional (or manually edited) allocation values, unaffected by the warning
