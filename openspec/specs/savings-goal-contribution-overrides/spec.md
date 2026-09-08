# Delta for savings-goal-contribution-overrides

## ADDED Requirements

### Requirement: Scoped Override Persistence on Save

The system MUST persist a `SavingsGoalContribution` override record ONLY for members present as keys in `session.overrideAmounts` at save time. It MUST NOT create or update an override for any member absent from that map, even if `goal.breakdown` contains that member.

This applies to all three current/duplicated save call sites: `SavingsGoalForm.handleSubmit` `isEditing` branch, `SavingsGoalForm.handleSubmit` `isAllocationOnly` branch, and `useContributionSession.saveSession`. `saveSession` is verified as unreachable from any current UI call site (not invoked by `SavingsGoalForm`, exercised only by its own unit tests) but shares the identical `overrideAmounts[id] ?? proportionalAmount`-over-full-`breakdown` defect and is public hook API; it is folded into this fix's scope rather than excluded, since the change is a same-pattern edit to a reducer/hook file already touched by the Override Clearing requirement below, and leaving known-duplicated buggy logic in tested public API is a foreseeable regression source.

#### Scenario: Untouched member is not persisted as an override

- GIVEN a goal being edited where member A has no entry in `session.overrideAmounts`
- WHEN the form is saved (edit or allocation-only mode)
- THEN no `upsertContribution` call is made for member A

#### Scenario: Explicitly edited member is persisted

- GIVEN member B has an entry in `session.overrideAmounts` from a live edit or a pre-existing `isOverridden` seed
- WHEN the form is saved
- THEN `upsertContribution` is called for member B with that value

#### Scenario: saveSession scoping parity

- GIVEN `useContributionSession.saveSession` is invoked directly with a partial `overrideAmounts` map
- WHEN save completes
- THEN only members present in `overrideAmounts` receive an `upsertContribution` call

### Requirement: Override Clearing on Reset

The system MUST delete any existing `SavingsGoalContribution` row for a member whose override was reset via "Reset to Income Split" and whose reset was then saved (not undone), so that member's `actualAmount` reverts to computed `base` on next read.

Verified: no delete/clear capability exists today — `savingsGoalApi` and the backend `savings-contribution-upsert` handler expose only upsert; `SavingsGoalContribution.customAmount` is a non-nullable column, so no null-sentinel option exists. This requirement therefore includes adding: a backend delete path (service method + handler route) and a frontend API client method, in addition to the frontend call-site fix. This expands the diff beyond the single-file estimate in the proposal (see risk).

Reset's own recalculation of `base`/live income-split values is unchanged by this requirement — only how a stale override row is removed.

#### Scenario: Save after reset clears prior override

- GIVEN member C has a pre-existing override row and `resetToIncomeSplit()` has emptied `overrideAmounts` for C
- WHEN the session is saved
- THEN the existing override row for C is deleted
- AND subsequent reads compute member C's `actualAmount` from live `base`

#### Scenario: Undo reset before save keeps the override

- GIVEN member C was reset then `undoReset()` restored the entry to `overrideAmounts`
- WHEN the session is saved
- THEN member C's override row is upserted with the restored value, not deleted

#### Scenario: Reset member with no pre-existing override is a no-op delete

- GIVEN member D had no override row before reset
- WHEN the session is saved after reset
- THEN no delete call is made for member D (nothing to clear)

## Non-Regression Constraints

- MUST NOT alter `calculateMonthsRemaining` / months-remaining computation (#159).
- MUST NOT alter share/percentage money-math reconciliation (#160).
- MUST NOT alter the computed values "Reset to Income Split" produces — only how leftover DB rows are cleared.
