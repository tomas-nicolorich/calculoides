# Dashboard Income

No prior spec file exists; requirements below are ADDED.

## ADDED Requirements

### Requirement: [API] Any Group Member May Edit Any Member's Income

Any group member MUST be able to update any other member's income via `update-income`, not only the income owner or group owner (supersedes `isOwner || isSelf` in `GroupService.updateMemberIncome`).

#### Scenario: Non-owner edits another member's income
- GIVEN A and B share a group; A is not owner
- WHEN A calls `update-income` for B with a valid income
- THEN the request succeeds and B's income updates

#### Scenario: Requester outside target's group is rejected
- GIVEN C is in a different group than B
- WHEN C calls `update-income` for B
- THEN the request is rejected with an authorization error; B's income is unchanged

### Requirement: [API+Frontend] Income Input Must Be Non-Negative

Negative or non-numeric income MUST be rejected server-side (`UpdateIncomeSchema`, `z.number().nonnegative()`) and client-side before submission.

#### Scenario: Server rejects negative income
- WHEN `update-income` is called with a negative value
- THEN it is rejected by `UpdateIncomeSchema`; no data changes

#### Scenario: Client blocks invalid input before submit
- GIVEN an active row holds a negative or non-numeric value
- WHEN the user attempts to confirm
- THEN no save call is dispatched; an inline validation message shows

### Requirement: [Frontend] Derived Figures Refresh Live, Never Persisted

Shares, quotas, and budget ceilings MUST be recomputed via `refreshSummary()` after every successful save. They MUST NOT be persisted; they are always computed from current incomes.

#### Scenario: Summary refreshes after save
- WHEN a save resolves
- THEN `refreshSummary()` is called and shares/quotas/ceilings reflect the new value without a page reload

#### Scenario: Derived values are not stored
- WHEN the group summary is queried after an income update
- THEN shares/quotas/ceilings are computed from stored incomes, not a persisted derived field

### Requirement: [Frontend] Single Header Toggle Drives Card Edit Mode

One header pencil toggle MUST switch every row into an editable `€`-prefixed input, with footer Close/Confirm; per-row toggles MUST NOT be required. Share % MUST recompute live from local values as inputs change.

#### Scenario: Header toggle activates edit mode for all rows
- WHEN the header pencil is toggled on
- THEN every row becomes editable and Close/Confirm appear

#### Scenario: Share % updates as the user types
- WHEN a member's income input changes in edit mode
- THEN all rows' share % recompute immediately, unsaved

#### Scenario: Confirm saves changed rows, exits edit mode
- WHEN Confirm is pressed with changed incomes
- THEN `updateMemberIncome` runs per changed row, `refreshSummary()` runs after, and the card returns to view mode

#### Scenario: Close discards without saving
- WHEN Close is pressed with unsaved changes
- THEN no `updateMemberIncome` calls are made; original values show

### Requirement: [Frontend] Concurrency and Failure Handling

The most recent successful save MUST win (last-write-wins), refreshing the summary each time. Changes MUST NOT apply optimistically before server confirmation; on failure, an error MUST show and the row stays open with the user's attempted (unsaved) input value.

#### Scenario: Two members edit the same income concurrently
- GIVEN A and B both edit X's income
- WHEN A saves first and B saves after with a different value
- THEN B's value persists and both see it via `refreshSummary()` on next refresh

#### Scenario: Save request fails over the network
- WHEN a confirmed edit's API call fails (network error or 5xx)
- THEN an error shows, the row stays open, and no derived figures change

### Requirement: [Frontend] Empty Group Renders No Editable Rows

Zero editable rows, and no error, MUST render when a group has no members.

#### Scenario: Empty group in edit mode
- WHEN the card is toggled into edit mode for a group with no members
- THEN no rows render and no error is thrown
