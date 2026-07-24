# Tasks: Savings-goal allocation/percentage parity (issue #160)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~70-100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Single-PR fix: widen `calculateSavingsContributions` weight source + reconciliation tests | PR 1 | `npm test -w api -- savings` | N/A — pure unit-level money math, no external process/service to exercise | Revert one commit (`api/_src/services/savings.ts` signature/weight + `api/_tests/logic/savings.test.ts` additions) |

## Phase 1: RED — Reconciliation Tests

- [x] 1.1 In `api/_tests/logic/savings.test.ts` (inside `describe("calculateSavingsContributions")`), add a test with two members passing both `share` and `percentage` asserting `monthlyContribution` is 72.75/177.25 (250 * 0.291 / 0.709 floored, no remainder) — MUST fail against current `m.share`-only math. 
- [x] 1.2 Add the exact issue #160 repro case (2-member group, `totalMonthlyNeed = 1000.00`, `share=[0.29,0.71]`, `percentage=[29.1,70.9]`) asserting `monthlyContribution` is exactly `291.00`/`709.00` and each divides back to its `percentage` within 1-cent tolerance — MUST fail pre-fix.
- [x] 1.3 Add an exact-sum assertion in the same test: `Σ monthlyContribution === totalMonthlyNeed` — passes both before and after (documents the preserved invariant, not a RED case).
- [x] 1.4 Run `npm test -w api -- savings` and confirm 1.1/1.2 fail with the current `m.share`-only implementation. Confirmed: 2 failed, 23 pre-existing passed.

## Phase 2: GREEN — Weight Source Change

- [x] 2.1 In `api/_src/services/savings.ts:25`, widen the `members` param type to `{ id: string; share: number; percentage?: number }[]`
- [x] 2.2 In `api/_src/services/savings.ts:47-61`, compute `const weight = m.percentage != null ? m.percentage / 100 : m.share;` and use `weight` in place of `m.share` in the `baseAmount` calc at line 55 (`totalMonthlyNeed * weight`)
- [x] 2.3 Leave the absorb-index selection at line 48 (`m.share > maxShare`) untouched — it must keep using `share`, not `weight`/`percentage`
- [x] 2.4 Run `npm test -w api -- savings` and confirm all Phase 1 tests are GREEN. Confirmed: 25/25 passed.

## Phase 3: REFACTOR — Non-Regression Verification

- [x] 3.1 Confirm existing share-only tests (`api/_tests/logic/savings.test.ts:11-99`, no `percentage` field) still pass unmodified — `weight` falls back to `m.share`, proving backward compatibility.
- [x] 3.2 Confirm no call-site edit needed: `SavingsService.getGoalsForGroup` (`api/_src/services/savings.ts:223-228`) already passes full `RoundedShare[]` (`incomeShares`) objects, which include `percentage`.
- [x] 3.3 Run the category-budget/rounding non-regression check: existing `shared/logic/rounding.ts`-consuming tests untouched by this change (no edits made to that file; confirm via `git diff` scope).
- [x] 3.4 Run `npm test -w api -- rounding shares` (or equivalent) to confirm `calculateIncomeShares`/`calculateMemberBudgetedTotals` wrapper output is unaffected.

## Phase 4: Full-Suite Verification

- [x] 4.1 Run `npm test -w api` — confirm no regressions in `getGoalsForGroup` integration coverage (cent-level amount shifts on existing fixtures are expected per design's Migration/Rollout note; verify no ceiling-warning boundary flip).
- [x] 4.2 Run `npm run typecheck -w api` — confirm the widened `members` param type resolves cleanly at the only call site.

## Requirement Traceability

- Spec "Percent-Dollar Reconciliation Invariant" → Tasks 1.1, 1.2, 2.1-2.2
- Spec "Category-Budget Rounding Non-Regression" → Tasks 3.1, 3.3, 3.4
- Spec "Reconciliation Test Coverage" → Tasks 1.1, 1.2
- Spec "Savings Contribution Money Math Input" (weight source) → Tasks 2.1-2.2
- Spec "Remainder absorption still applies to the highest-share member" → Task 2.3
- Spec "Two-member goal is fully reconciled end to end" → Task 1.2

## Threat Matrix

N/A — per design, no routing/shell/subprocess/VCS/PR-automation/executable-classification/process-integration boundary. No RED tests required beyond the reconciliation-invariant cases above.

## Status: 14/14 tasks complete. Ready for sdd-verify.
