# Savings Goal Management Specification

## Purpose

UI lifecycle for savings goal cards: delete (with confirmation), edit (modal), adjust (inline allocation editing). Replaces the standalone edit button and the missing delete path. Allocation/ceiling math is out of scope (see `savings-income-split-allocation`).

## Requirements

### Requirement: Goal Deletion Is Isolated to the Goal and Its Overrides

The system MUST delete only the target `SavingsGoal` row and its cascading `SavingsGoalContribution` rows. It MUST NOT alter the shared balance/pot, any other goal, expense, transfer, or settlement.

#### Scenario: Shared balance is unaffected by goal deletion

- GIVEN a goal with $500 saved and a shared balance of $2000
- WHEN the goal is deleted
- THEN the shared balance remains $2000; no expense/transfer/settlement is modified

#### Scenario: Other goals are unaffected

- GIVEN goals A and B in the same group
- WHEN goal A is deleted
- THEN goal B's amounts, overrides, and breakdown are unchanged

### Requirement: Deletion Requires Explicit Confirmation

The system MUST show a confirmation dialog before calling `savingsGoalApi.delete`. A single click on row-menu "Delete" MUST NOT itself issue the call.

#### Scenario: Delete opens a dialog, not an immediate call

- GIVEN a goal card's "⋯" row menu
- WHEN "Delete" is selected
- THEN a confirmation dialog opens; `savingsGoalApi.delete` is not yet called

#### Scenario: Confirming issues exactly one delete call

- GIVEN the confirmation dialog is open
- WHEN the user confirms
- THEN `savingsGoalApi.delete(goalId)` is called exactly once; the dialog closes

#### Scenario: Cancelling issues no call

- GIVEN the confirmation dialog is open
- WHEN the user cancels
- THEN no delete call is made; the goal remains listed

#### Scenario: Dialog copy states the balance is unaffected

- GIVEN the confirmation dialog is rendered
- WHEN its description is inspected
- THEN it states the shared balance/pot is not affected by the deletion

### Requirement: Row Menu Is the Single Entry Point for Edit and Delete

Each goal card MUST expose Edit and Delete through one "⋯" `RowMenu`. The standalone "✎ Edit Goal Settings" button MUST be removed.

#### Scenario: Row menu replaces the standalone edit button

- GIVEN a rendered goal card
- WHEN its header is inspected
- THEN no standalone "Edit Goal Settings" button exists; a `RowMenu` with `onEdit`/`onDelete` is present

#### Scenario: Row-menu Edit opens the full-edit modal

- GIVEN a goal card's row menu
- WHEN "Edit" is selected
- THEN a modal opens with name, icon, target amount, current amount, and target date fields

### Requirement: Adjust Renders Inline In-Card Allocation Editing

Activating Adjust MUST render per-member override inputs, "Reset to Income Split", "Undo Reset", and ceiling-warning badges inside the goal card body, without swapping the card for a separate `SavingsGoalForm` view. Driven by `useContributionSession`'s existing public API (`overrideMember`, `resetToIncomeSplit`, `undoReset`, `ceilingWarnings`, `saveSession`) without changing that hook's behavior.

#### Scenario: Adjust stays inline in the card

- GIVEN a goal card
- WHEN "Adjust" is activated
- THEN per-member inputs, "Reset to Income Split", and ceiling badges render inside that card; the card is not replaced by a separate form

#### Scenario: Hook behavior is unchanged

- GIVEN the same sequence of `overrideMember`/`resetToIncomeSplit`/`undoReset` calls as before this change
- WHEN `ceilingWarnings` and `localProjectedMonths` are computed
- THEN their values are identical to pre-change behavior

### Requirement: Single Save Path for Contribution Overrides

Inline-adjust saves MUST go through `useContributionSession.saveSession()` only. `SavingsGoalForm`'s local `persistContributionOverrides` duplicate MUST be removed; no code path may re-implement its upsert/delete decision.

#### Scenario: Inline-adjust save delegates to saveSession

- GIVEN a member's override was changed inline
- WHEN the user saves
- THEN `session.saveSession()` is invoked; `persistContributionOverrides` no longer exists in `SavingsGoalForm`

#### Scenario: Upsert/delete parity is preserved

- GIVEN the same override state (some overridden, some reset) as under the old `persistContributionOverrides` path
- WHEN saved via `saveSession()`
- THEN the same members receive `upsertContribution` and the same members receive `deleteContribution` as before this change

### Requirement: Modal Edit and Inline Adjust Do Not Duplicate Allocation Editing

The full-edit modal MUST NOT render per-member override inputs, "Reset to Income Split", or "Undo Reset". Those remain reachable only via inline Adjust.

#### Scenario: Full-edit modal has no allocation-override inputs

- GIVEN the full-edit modal is open for a goal
- WHEN its fields are inspected
- THEN no per-member override inputs or reset controls are present

#### Scenario: Modal and inline Adjust are mutually exclusive per goal

- GIVEN a single goal card
- WHEN the full-edit modal is open for that goal
- THEN inline Adjust is not simultaneously active for the same goal
