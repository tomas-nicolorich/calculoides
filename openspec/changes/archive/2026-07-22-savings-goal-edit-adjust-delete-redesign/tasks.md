# Tasks: Redesign savings-goal edit/adjust and add delete

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420-520 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Extract `InlineAllocationEditor` + shrink `SavingsGoalForm` + row-menu/modal/delete rewire in `SavingsGoalList` | PR 1 (single) | `npm test -w frontend -- --run InlineAllocationEditor SavingsGoalForm SavingsGoalList` | RTL suite: create → edit modal → adjust inline → delete confirm, on live-fixture goal data | Revert `InlineAllocationEditor.tsx` (delete file) + revert `SavingsGoalForm.tsx`/`SavingsGoalList.tsx` to prior commit; no backend/schema touched |

**PR-slicing note**: the proposal flagged a possible 2-slice split — (1) delete flow, (2) adjust/edit refactor + save-path unification. Given the final design, that split no longer holds: `SavingsGoalList`'s state-model rewire (`goalToEdit`/`adjustingGoalId`/`goalToDeleteId`) replaces the *same* `editingGoalId`/`adjustingGoalId` pair in one motion, and `RowMenu` wires both `onEdit` and `onDelete` from the same call site (lines 107-134 of the current file are touched by both slices simultaneously). Splitting would force one PR to introduce `RowMenu` with only `onDelete` wired (an incomplete, half-migrated card header) and the second PR to retrofit `onEdit`, re-touching the exact same JSX block twice for no isolation benefit — the two "slices" are not independently shippable without an awkward half-state. Recommendation: **single PR**, but flag as Medium risk (420-520 lines including test moves) and ask the user to confirm before `sdd-apply` given it sits above the 400-line default budget once `InlineAllocationEditor.test.tsx` (migrated cases) lands.

## Phase 1: Extract InlineAllocationEditor (allocation editing owns its own session)

- [x] 1.1 [RED] Copy allocation/reset/undo/ceiling-warning test cases from `SavingsGoalForm.test.tsx` into new `frontend/src/features/savings/InlineAllocationEditor.test.tsx`, retargeted at an `<InlineAllocationEditor goal={goal} onSaved={fn} onCancel={fn} />` component (not yet created) — expect failures
- [x] 1.2 [GREEN] Create `frontend/src/features/savings/InlineAllocationEditor.tsx`: move `AllocationOverridesEditor` JSX (`SavingsGoalForm.tsx:48-139`) verbatim, own `const session = useContributionSession(goal)`, add Save (`onClick={async () => { if (await session.saveSession()) await onSaved(); }}`) and Cancel (`session.cancelSession(); onCancel();`) buttons, surface `session.saveError`
- [x] 1.3 [REFACTOR] Confirm 1.1 passes unchanged in intent (Reset to Income Split, per-member `Input`, ceiling `Badge`, Undo Reset all render/behave identically)

## Phase 2: Shrink SavingsGoalForm to metadata-only

- [x] 2.1 [RED] Update `SavingsGoalForm.test.tsx`: delete allocation/reset/override test cases (moved to Phase 1), add/keep assertion that `persistContributionOverrides` and allocation UI (`AllocationOverridesEditor`, per-member `Input`, "Monthly Allocation" label) are absent from rendered output and from the module — expect failures against current form
- [x] 2.2 [GREEN] In `SavingsGoalForm.tsx`: delete `persistContributionOverrides` (lines 16-33), `AllocationOverridesEditor` (lines 48-139), the `mode` prop, `isAllocationOnly`, the `useContributionSession`/`ContributionBreakdown`/`diffContributionPersistence` imports, and the allocation render block (lines 341-347); `handleSubmit` keeps only create (`savingsGoalApi.create`) and full-edit (`savingsGoalApi.update`) branches
- [x] 2.3 [REFACTOR] Confirm remaining `SavingsGoalForm.test.tsx` cases (create, full-edit metadata) still pass; verify no residual references to `mode`/`AllocationOverridesEditor` in the file (note: `SavingsGoalList.tsx` still references `mode="allocation"` — resolved in Phase 5, tracked by the typecheck failure above)

## Phase 3: SavingsGoalList state-model rewire — delete flow

- [x] 3.1 [RED] Add `SavingsGoalList.test.tsx` cases: `RowMenu` "Delete" opens confirm dialog without calling `savingsGoalApi.delete`; confirm calls `savingsGoalApi.delete(goalId)` exactly once + triggers `onRefresh`; cancel calls neither; dialog description contains reassurance copy about the shared balance — expect failures (no `RowMenu`/dialog yet)
- [x] 3.2 [GREEN] In `SavingsGoalList.tsx`: add `goalToDeleteId: string | null` state, add list-level delete-confirm `Dialog`/`DialogFooter` (title "Delete Goal", description reassuring shared balance stays intact, Cancel outline + Delete `variant="expense"` → `handleDelete` calling `savingsGoalApi.delete(id)` then `onRefresh()` then clearing state), matching `ExpensesPage.tsx:530-556`
- [x] 3.3 [RED] Add test: after delete, only `savingsGoalApi.delete` was called — no `upsertContribution`/`deleteContribution`/transfer/expense API touched (guards the shared-balance-isolation invariant, spec scenario "Shared balance is unaffected by goal deletion")
- [x] 3.4 [GREEN] Wire `RowMenu` `onDelete={() => setGoalToDeleteId(goal.id)}` per card; confirm 3.3 passes with no extra calls (RowMenu rendered with `onDelete` only for now; `onEdit` wiring lands in Phase 4)

## Phase 4: SavingsGoalList state-model rewire — edit modal + RowMenu

- [x] 4.1 [RED] Add `SavingsGoalList.test.tsx` cases: `RowMenu` "Edit" opens a `Dialog` hosting `SavingsGoalForm goal={goal}` for the *correct* goal in a multi-goal fixture (title/fields reflect that goal, not another card's); modal has no per-member override `Input`/"Monthly Allocation" section (guards competing-surfaces regression) — expect failures
- [x] 4.2 [GREEN] Replace `editingGoalId` with `goalToEdit: SavingsGoal | null` in `SavingsGoalList.tsx`; remove the standalone "✎ Edit Goal Settings" `Button` (lines 107-120) and the old inline edit render branch (lines 35-50); add `RowMenu onEdit={() => setGoalToEdit(goal)}` per card; add list-level edit `Dialog` (`open={goalToEdit !== null}`) hosting `SavingsGoalForm groupId={goalToEdit.groupId} goal={goalToEdit}` with `onSuccess`/`onCancel` clearing `goalToEdit` (+ refresh on success)
- [x] 4.3 [REFACTOR] Confirm 4.1 passes; verify `RowMenu` replaces both the old ✎ button and any remaining raw edit affordance

## Phase 5: Inline Adjust wiring to InlineAllocationEditor

- [x] 5.1 [RED] Add `SavingsGoalList.test.tsx` case: toggling "ADJUST" on a card renders `InlineAllocationEditor` inside that card body (per-member inputs, Reset/Undo, ceiling badges) in place of the read-only breakdown, without swapping the whole card for a form view; Save calls `session.saveSession()` and clears `adjustingGoalId` on success; Cancel clears `adjustingGoalId` without saving — expect failures (still renders old `mode="allocation"` `SavingsGoalForm`)
- [x] 5.2 [GREEN] In `SavingsGoalList.tsx`: replace the `adjustingGoalId === goal.id` branch (old lines 52-68, rendering `SavingsGoalForm mode="allocation"`) with `<InlineAllocationEditor goal={goal} onSaved={() => { setAdjustingGoalId(null); void onRefresh?.(); }} onCancel={() => setAdjustingGoalId(null)} />` rendered inside the card body, replacing the read-only Monthly Allocation breakdown (old lines 188-226) only while active; keep the "ADJUST" toggle button (old lines 121-134) wired to `setAdjustingGoalId(goal.id)`
- [x] 5.3 [REFACTOR] Confirm 5.1 passes; confirm modal Edit and inline Adjust are mutually exclusive per goal (spec scenario) — opening one for a goal does not also show the other for the same card

## Phase 6: Regression & Non-Regression Verification

- [x] 6.1 [Regression] Run full `SavingsGoalList.test.tsx` + `SavingsGoalForm.test.tsx` + `InlineAllocationEditor.test.tsx` suites together; confirm no duplicate/orphaned test cases and no references to the removed `mode` prop remain anywhere in `frontend/src/features/savings/`
- [x] 6.2 [Verify] Confirm `useContributionSession`, `diffContributionPersistence`, and `savingsGoalApi.*` were not modified (design's non-regression guarantee) — no diff expected in `frontend/src/entities/savings-goal/*`
- [x] 6.3 [Verify] Manually trace create path (`SavingsPage` → `Dialog` → `SavingsGoalForm` with no `goal`) still works unchanged — create never rendered the allocation section, so Phase 2's removal should produce zero create-path behavior change
- [x] 6.4 Run `npm run typecheck -w frontend` and full `npm test -w frontend` to confirm no regressions outside the touched files

## Status: 19/19 tasks complete.

## Addendum (post-verify fix): Requirement 1 Scenario 1.2 coverage gap

`sdd-verify` returned a FAIL verdict with 1 CRITICAL finding: spec Scenario "Other goals are unaffected" (Requirement 1, `specs/savings-goal-management/spec.md`) had no covering test — the `delete flow` describe block in `SavingsGoalList.test.tsx` only ever used a single-goal fixture. This addendum closes that gap; it does not reopen the phase plan above.

- [x] A.1 [RED] Add `SavingsGoalList.test.tsx` test in `describe("delete flow")`: render the existing `multiGoals` two-goal fixture (hoisted from the `edit modal` describe block to module scope for reuse), delete goal 1 via the row-menu confirm dialog, assert goal 2's rendered name/breakdown/percentage/progress amounts are unchanged and `savingsGoalApi.delete` was called exactly once with `"goal-1"` and never with `"goal-2"` — confirmed this test can FAIL by temporarily mutating `handleDelete` in `SavingsGoalList.tsx` to also call `savingsGoalApi.delete("goal-2")` (2 tests failed as expected), then reverted the mutation
- [x] A.2 [GREEN] No production change required — `handleDelete` in `SavingsGoalList.tsx` already deletes only by the target `goalId`; reverted the temporary mutation and confirmed the new test passes (23/23 in `SavingsGoalList.test.tsx`, 278/278 full frontend suite, typecheck clean)

Status: addendum complete, coverage gap closed, ready for re-verification.

## Addendum B (post-apply review fix): handleDelete error handling gap

A post-apply bounded 4R code review converged on one real CRITICAL/WARNING gap in
`SavingsGoalList.tsx`'s `handleDelete`: it had no try/catch, so a rejected
`savingsGoalApi.delete(goalId)` (network error / non-2xx) left the confirm dialog open
forever with no feedback, and the Delete/Cancel buttons had no loading/disabled gating.
This addendum closes that gap only; it does not reopen the phase plan above or touch the
separate, lower-severity `onOpenChange` mid-request race or naming-inconsistency SUGGESTION
(both explicitly out of scope).

- [x] B.1 [RED] Added `SavingsGoalList.test.tsx` case in `describe("delete flow")`:
  "shows an error and does not call onRefresh when savingsGoalApi.delete rejects" — mocks
  `savingsGoalApi.delete` to reject with `Error("Network error")`, drives the confirm-delete
  flow, asserts the error message renders and `onRefresh` is not called. Confirmed failing
  against pre-fix code: `1 failed | 23 passed (24)` plus an unhandled-rejection error (no
  catch existed).
- [x] B.2 [GREEN] In `SavingsGoalList.tsx`: added `deleteLoading`/`deleteError` state; wrapped
  `savingsGoalApi.delete(goalId)` in try/catch/finally (same error-extraction pattern as
  `SavingsGoalForm.tsx`'s `handleSubmit`) — success clears error, closes dialog, calls
  `onRefresh?.()`; failure sets `deleteError`; `finally` clears `deleteLoading`. Rendered
  `deleteError` inside the delete-confirm `Dialog` and disabled both Cancel and Delete Goal
  buttons while `deleteLoading` (Delete Goal label shows "Deleting..."). Confirmed
  `SavingsGoalList.test.tsx`: `24/24` passing, full frontend suite `279/279` (45 files,
  was 278), `npm run typecheck -w frontend` clean.

Status: addendum B complete, ready for re-verification.
