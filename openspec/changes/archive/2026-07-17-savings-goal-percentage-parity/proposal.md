# Proposal: Savings-goal allocation/percentage parity (issue #160)

## Intent
Per-member dollar amounts on a savings goal's income-split allocation don't reconcile with the percentages shown beside them. Money math uses `m.share` (2dp, highest-earner absorption) while the UI displays `percentage` (1dp, largest-remainder). Two independently-rounded values from `calculateRoundedShares` describe the same income split, so displayed percent and dollar amount for a member visibly disagree (repro: A shown 29.1% but allocated from a coarser share). Fixing it restores user trust in the savings breakdown.

## Scope

### In Scope
- Make savings-goal contribution math and displayed percentage derive from ONE source of truth so amounts reconcile with percentages.
- Scope the fix to the savings-goal boundary only (`calculateSavingsContributions` and/or its caller in `SavingsService.getGoalsForGroup`).
- Cover it with a unit test reproducing the mismatch (percent-vs-dollar reconciliation invariant).

### Out of Scope
- Any change to `calculateRoundedShares` behavior for category budgets — the `share`/`percentage` split is intentional and used elsewhere (issue author constraint).
- Category-budget allocation, overrides logic, projections/variance math, ceiling-warning logic.
- Frontend display components (they already read the returned `percentage`).

## Capabilities
### New Capabilities
- None
### Modified Capabilities
- `savings-goal-allocation`: contribution money math must be consistent with the displayed member percentage (single source of truth at the savings boundary).

## Approach
Prefer feeding the finer 1dp `percentage` (÷100) into savings money math instead of the coarser `share`, so displayed percent and computed dollars come from the same rounded value. `calculateSavingsContributions` already re-absorbs its own remainder onto the highest share, and percentages sum to exactly 100.0, so the exact-sum invariant is preserved. `calculateRoundedShares` stays untouched. Spec/design phases pick between (a) pass `percentage/100` as the share, or (b) reconcile at the boundary.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `api/_src/services/savings.ts` | Modified | Drive contribution math from `percentage`, not `share` |
| `shared/logic/rounding.ts` | Unchanged | Must NOT change (category-budget constraint) |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|---------------|
| Regressing category-budget rounding | Low | Fix confined to savings service; rounding.ts untouched |
| Shifting existing goal contribution amounts | Med | Expected/desired; cover with reconciliation test |

## Rollback Plan
Single-file revert of `api/_src/services/savings.ts` (and its test); no schema/data migration involved.

## Dependencies
- None

## Success Criteria
- [ ] Displayed member percentage and dollar amount reconcile for the repro case
- [ ] Contributions still sum exactly to the monthly total
- [ ] `calculateRoundedShares` and category-budget behavior unchanged
- [ ] New unit test asserts percent-vs-dollar parity

## Notes
Delivery: small, one-file change plus test — well within a single small PR. `ask-on-risk` needs no escalation.
Execution mode auto: no interactive question round run; assumptions above taken directly from the fully-specified issue.
