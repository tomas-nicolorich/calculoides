# Tasks: Fix months-remaining off-by-one in savings income-split allocation (issue #159)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~90-130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk (default, none specified) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Single-PR fix: helper + 3 call sites + fixtures | PR 1 | `npm test -w api -- projection` and `npm test -w api -- savings` and `npm test -w frontend -- useContributionSession` | N/A — pure calendar-math unit change, no external process/service to exercise | Revert one commit (helper export + 3 call-site edits + fixture update) |

## Phase 1: Foundation — Shared Helper (Single Source of Truth)

- [x] 1.1 RED: add `describe("calculateMonthsRemaining")` to `api/_tests/logic/projection.test.ts` covering E1 (rawDiff 13 -> 12), E2 (rawDiff 1 -> 0, lump-sum boundary), E3 (rawDiff 0 -> -1, negative allowed), and an E4/E5 axis-consistency case (`calculateProjectedMonths` needing N periods vs. `calculateMonthsRemaining` offering N vs N-1 periods) — all fail, function doesn't exist yet
- [x] 1.2 GREEN: implement and export `calculateMonthsRemaining(now: Date, targetDate: Date): number` in `shared/logic/projection.ts` per design's `rawDiff - 1` formula
- [x] 1.3 REFACTOR: confirm no duplication with `calculateProjectedMonths`; keep signature pure/deterministic (no `Date.now()` inside)

## Phase 2: API Divisor Site #1 — Contribution Split

- [x] 2.1 RED: update `api/_tests/logic/savings.test.ts:11-36` to assert the corrected 150/100 split (was 120/80); add two boundary tests: target exactly one month out → lump sum, target within current month → lump sum
- [x] 2.2 GREEN: in `api/_src/services/savings.ts:6` add `calculateMonthsRemaining` to the `from "shared"` import; replace inline diff at lines 31-33 with the helper call
- [x] 2.3 REFACTOR: confirm the `monthsRemaining > 0` lump-sum branch (lines 36-40) is untouched

## Phase 3: API Comparison Site #2 — Variance/Forecast

- [x] 3.1 GREEN: in `api/_src/services/savings.ts:260-262` replace the inline `targetMonths` diff with `calculateMonthsRemaining(now, targetDate)`; leave `projectedMonths`/`varianceMonths` (264-266) unchanged
- [x] 3.2 VERIFY: no new test file needed here — DB-coupled `getGoalsForGroup` is covered indirectly by Phase 1's E4/E5 axis test plus existing `api/_tests/unit/handlers/savings-goals.test.ts` (full API suite re-run: 117/117 green)

## Phase 4: Frontend Comparison Site #3 — Forecast Color

- [x] 4.1 GREEN: in `frontend/src/entities/savings-goal/useContributionSession.ts:2` add `calculateMonthsRemaining` to the `from "shared"` import; replace the IIFE at lines 158-167 with `activeGoal ? calculateMonthsRemaining(new Date(), new Date(activeGoal.targetDate)) : 0`
- [x] 4.2 VERIFY (non-regression, per spec): re-run `useContributionSession.test.ts:194-239` (forecastColor) and `:241-471` (ceilingWarnings) unmodified — both must stay green (18/18 green, matches pre-fix baseline)

## Phase 5: Full-Suite Verification

- [x] 5.1 Run `npm test -w api -- savings` and `npm test -w api -- projection` — confirm all Phase 1/2 RED tests are now GREEN (23/23 and 12/12)
- [x] 5.2 Run `npm test -w frontend -- useContributionSession` — confirm forecastColor/ceilingWarnings regression suite green (18/18)
- [x] 5.3 Run `npm run typecheck` (api + frontend + shared) — confirm the new `shared` export resolves cleanly at both call sites (all clean, no errors)

## Requirement Traceability

- Spec "Single Source of Truth" → Tasks 1.1-1.3, 2.2, 3.1, 4.1
- Spec "Ceiling-Warning Non-Regression" → Task 4.2
- Spec "Monthly Contribution Divisor" → Tasks 2.1-2.3
- Spec "Variance and Forecast Comparisons" → Tasks 3.1-3.2, 4.1-4.2
- Spec "Contribution Split Fixture" → Task 2.1

## Deviation Note (discovered during apply, not in original tasks list)

`api/_tests/integration/savings.test.ts` (\"leaves proportionalAmount/actualAmount allocation values unchanged by the new remainingBalance field\") independently hardcoded the same 60/40-income-share cascade at the OLD buggy divisor (120/80 on a raw-diff-5 setup identical in shape to the Phase 2 fixture). This file was not listed in the tasks artifact's file-changes table. It broke as an expected consequence of the Phase 2 GREEN step (same cascade the design's \"Migration / Rollout\" section anticipates: \"existing goals... will show higher required contributions\"). Updated its two assertions from 120/80 to 150/100 with an inline comment pointing to issue #159. No new test scenarios were added there — only the two pre-existing hardcoded expected values were corrected to match the fixed divisor. All 5 phases otherwise match the design/tasks exactly; no other deviations.

All 13/13 tasks complete. Ready for sdd-verify.
