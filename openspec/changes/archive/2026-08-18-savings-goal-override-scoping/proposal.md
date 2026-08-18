# Proposal: Scope savings-goal contribution overrides to intentional edits

## Intent
Editing a savings goal (target amount/date) currently freezes every member's contribution at its old value. `SavingsGoalForm.handleSubmit` re-persists a `SavingsGoalContribution` override (`customAmount`) for EVERY member in `goal.breakdown` on every save — even untouched members — using the stale `item.proportionalAmount` fallback. Once an override exists, the backend (`SavingsService.getGoalsForGroup` `finalContributions` merge) permanently prefers `override.customAmount` over recalculating from live income/target `base`, so most edits appear to have no effect. Fixes #161 (follows #159/#160 on same branch).

## Scope
### In Scope
- Fix `handleSubmit` `isEditing` branch: persist overrides only for members the user actually customized this session.
- Fix `handleSubmit` `isAllocationOnly` branch: same scoping rule.
- Preserve pre-existing intentional overrides (seeded into `session.overrideAmounts` from `isOverridden` members at `sessionStart`).

### Out of Scope
- Backend `SavingsService` merge logic (correct as-is).
- `#159`/`#160` months-remaining and share/percentage fixes (already merged).
- `useContributionSession.saveSession` unless design finds it shares the same defect.
- New per-member "reset to base" UI.

## Capabilities
### New Capabilities
- None (bugfix).
### Modified Capabilities
- None at openspec level (no `openspec/specs`). Behavioral contract: an override record must exist ONLY when a member has an explicit custom amount.

## Approach
`session.overrideAmounts` already carries exactly the intentional-override members (pre-existing `isOverridden` seeds + live edits). Iterate `Object.entries(session.overrideAmounts)` and upsert only those, instead of mapping `goal.breakdown` with the `?? item.proportionalAmount` fallback. Untouched members get no override → backend recalculates from `base`.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/savings/SavingsGoalForm.tsx` handleSubmit | Modified | Scope upsert loop to override keys |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|---------------|
| Reset-to-income-split regression | Med | After `resetToIncomeSplit` empties `overrideAmounts`, scoped save persists nothing → stale DB overrides may survive. Design/spec MUST define how a reset CLEARS existing override records (delete endpoint vs sentinel) without regressing the confirmed flow |
| Backend lacks override-delete path | Med | Verify `upsertContribution`/API can remove an override |

## Rollback Plan
Single-file frontend revert; no schema/migration.

## Success Criteria
- [ ] Editing target amount/date recalculates untouched members from live income shares.
- [ ] Only explicitly edited members get override records.
- [ ] Reset-to-income-split still clears overrides (verify).

## Proposal question round (needs user review)
1. When a user hits "Reset to Income Split" and saves, should existing override records be DELETED so members revert to base — and does the API support deletion, or only upsert?
2. Does `useContributionSession.saveSession` (separate save path) share this defect and need the same fix, or is it out of scope?
3. TDD note: strict TDD project-wide — downstream phases must write failing tests first.
