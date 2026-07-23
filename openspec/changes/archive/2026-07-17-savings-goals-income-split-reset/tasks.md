# Tasks: Ceiling-aware "Reset to Income Split" (warning-only)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|---|---|---|---|---|---|
| 1 | Ceiling helper + savings service | PR1 | `npm test -w api -- savings` | api/_tests/integration/savings.test.ts (Supabase test env) | Revert calculation.ts+savings.ts; breakdown loses remainingBalance |
| 2 | Summary handler dedup (risk) | PR2 | `npm test -w api -- transactions` | existing summary integration tests | Revert transactions.ts only; summary keeps inline loop |
| 3 | Frontend types+selector+badge | PR3 | `npm test -w frontend -- savings-goal` | SavingsGoalForm.test.tsx (jsdom) | Revert 3 frontend files; UI loses warning badge |

## Phase 1: Foundation — Ceiling Helper (api)
- [x] 1.1 RED `api/_tests/logic/savings.test.ts`: cases for `calculateMemberBudgetedTotals` — no categories, restricted-category subset, zero-income excluded, over-budget negative ceiling, transfers shift budgeted. (Spec: Per-Member Affordability Ceiling Exposure) — DONE in PR1 (branch `feat/savings-ceiling-helper`). 5 cases added, confirmed RED (`TypeError: not a function`) before implementation.
- [x] 1.2 GREEN `api/_src/services/calculation.ts`: add+export `calculateMemberBudgetedTotals`, reusing `calculateCategoryBalances`. — DONE in PR1. All 5 tests GREEN, no regressions in transfers/shares/budget logic tests.

## Phase 2: Server Response Shape
- [x] 2.1 RED `api/_tests/integration/savings.test.ts`: `breakdown[].remainingBalance = income-budgeted`, matches `summary` handler for same data, allocations unchanged. (Spec: Ceiling matches dashboard remaining balance; Ceiling is never persisted) — DONE in PR1. 2 cases added, confirmed RED (`expected undefined to be 540/360`) before implementation.
- [x] 2.2 GREEN `api/_src/services/savings.ts`: fetch categories/expenses/transfers; call helper; attach `remainingBalance` per breakdown member. — DONE in PR1. All 4 integration tests GREEN (2 pre-existing + 2 new). `calculateSavingsContributions` untouched.

## Phase 3: Dedup Refactor — RISK (existing dashboard behavior)
- [x] 3.1 [RISK] `api/_src/handlers/transactions.ts`: refactor `summary` handler to reuse `calculateMemberBudgetedTotals` instead of its inline per-member loop (L411-471). Behavior-preserving — verified with existing + new characterization summary integration tests, no output change. — DONE in PR2 (branch `feat/savings-transactions-dedup`, based on `feat/savings-ceiling-helper`). Added a fixed-fixture characterization test (`api/_tests/integration/summary.test.ts`) asserting exact `members[].budgeted`/`remainingQuota`/totals BEFORE refactoring (passed against pre-refactor code — safety net), then refactored `budgeted` computation to call the shared helper; re-ran same test, still 4/4 identical. Full `transactions`-scoped and full `npm test -w api` suite green (111/111), typecheck clean.

## Phase 4: Frontend Types
- [x] 4.1 `frontend/src/entities/savings-goal/index.ts`: add `remainingBalance: number` to `ContributionBreakdown`. — DONE in PR3 (branch `feat/savings-ceiling-warning-ui`, based on `feat/savings-transactions-dedup`).

## Phase 5: Derived Warnings (client)
- [x] 5.1 RED `useContributionSession.test.ts`: share>ceiling true; share<=ceiling false; post-reset uses proportional; 0% income share false; ceiling<=0+positive share true; multiple members flagged independently; overdue lump-sum true; `overrideAmounts` never mutated. (Spec: Per-Member Over-Ceiling Warning, all scenarios) — DONE in PR3. 7 new tests added under `describe("ceilingWarnings..."`); confirmed RED (`expected undefined to deeply equal {...}`) — 7 failed, 11 pre-existing passed, before implementation.
- [x] 5.2 GREEN `useContributionSession.ts`: derive `ceilingWarnings: Record<string, boolean>` in hook body (not reducer): `(override ?? proportional) > remainingBalance` per member. — DONE in PR3. Reducer, `ContributionSessionState`, and actions untouched — verified by dedicated "never mutates overrideAmounts" test. 18/18 GREEN.

## Phase 6: Warning UI
- [x] 6.1 RED `SavingsGoalForm.test.tsx`: amber badge renders only on flagged member row; correct tone; input value unchanged. — DONE in PR3. 3 new tests added (renders-only-on-flagged-row, absence-when-within-balance, input-value-unaffected); confirmed RED (`getAllByText(/over balance/i)` found 0 elements) before implementation — 1/3 failed for the right reason (the other 2 already held true structurally, which is expected for negative/unaffected-value assertions).
- [x] 6.2 GREEN `SavingsGoalForm.tsx`: render `<Badge tone="transfer" size="sm" uppercase>Over Balance</Badge>` per over-ceiling row, title/aria "Exceeds available balance". — DONE in PR3. Badge wrapped with UserDisplay in a flex row; `Input` value logic (`overrideAmounts[id] ?? proportionalAmount`) untouched. 15/15 GREEN.

## Phase 7: Verification
- [x] 7.1 Run `npm test -w api`, `npm test -w frontend`, `npm run typecheck` — full suite green, no regression in existing summary/dashboard tests. — DONE after PR3. `npm test -w api`: 26 files/111 tests passed. `npm test -w frontend`: 42 files/249 tests passed. `npm run typecheck` (root, turbo, all 3 packages): clean. `npm test -w frontend -- savings`: 4 files/46 tests passed.
- [x] 7.2 Confirm no `prisma/schema.prisma` or `shared/validation.ts` changes were introduced (explicit non-changes per design). — CONFIRMED for full PR1+PR2+PR3 scope: `git diff --stat feat/savings-transactions-dedup -- prisma/ shared/` is empty for PR3; PR1/PR2 apply-progress already confirmed no prior changes to those paths either.

## Status
9/9 top-level tasks complete (Phase 1-7, all done across PR1+PR2+PR3). All three branches (`feat/savings-ceiling-helper`, `feat/savings-transactions-dedup`, `feat/savings-ceiling-warning-ui`) created, uncommitted/unpushed, ready for review, stacked in that order per stacked-to-main chain strategy.
