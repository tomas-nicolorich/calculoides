# Proposal: Redesign savings-goal edit/adjust and add delete

## Intent
Savings goal cards expose two separate header controls — a "✎ Edit Goal Settings" icon button and an "ADJUST" button — and offer **no way to delete a goal from the UI**, even though the backend delete path already exists end-to-end. This is inconsistent with Expenses and Transfers, which already use a shared "⋯" row menu (Edit + Delete) with a delete-confirmation dialog. Align savings goals with that convention (per the reviewed `app/savings.jsx` Claude Design mockup): collapse Edit into a "⋯" row menu, add Delete with a reassuring confirmation, and turn "Adjust" into inline in-card allocation editing. Delete only removes the goal's earmarking — the shared balance/pot is never touched.

## Scope
### In Scope
- Replace the standalone "✎ Edit Goal Settings" button with the shared `RowMenu` ("⋯" → Edit + Delete) on each goal card.
- Add a delete-confirmation `Dialog` whose description explicitly reassures "shared balance stays intact" and wire it to the already-existing `savingsGoalApi.delete(goalId)`.
- Convert "Adjust" into inline in-card allocation editing (editable per-member amount inputs rendered directly in the card) instead of swapping the card into a separate form view.
- Cleanup: remove `SavingsGoalForm`'s local `persistContributionOverrides` duplicate and delegate to `session.saveSession()` (single save path, correct phase transitions).

### Out of Scope
- **Any backend change.** DELETE dispatch, `SavingsService.deleteGoal`, Prisma cascade, and `savingsGoalApi.delete` all already exist and are confirmed safe (only `SavingsGoalContribution` cascades; no relation to shared-balance ledger).
- Rewriting `useContributionSession` — its public API/behavior stays fixed; only `SavingsGoalForm`'s duplicate save helper is retired in favor of the hook's own `saveSession()`.
- The allocation/ceiling math, income-split, and reset behavior (unchanged).

## Capabilities
### New Capabilities
- None (no new `openspec/specs` capability; frontend UX redesign over existing behavior).
### Modified Capabilities
- None at openspec spec level. Behavioral invariant to preserve and test: **deleting a savings goal removes only the earmarking (goal row + its contribution cascade) and never mutates the shared balance/pot.**

## Approach
**Open question — full-edit form: inline vs modal. Decision: move `mode="full"` into a `Dialog`/`ResponsiveDialog` modal.**
Rationale: "Adjust" is becoming the new inline in-card surface. Keeping full-edit *also* inline in the same card would create two competing inline modes fighting over the same card region with duplicated toggle state, crowding the card and pushing the list around when opened. A modal gives the richer full-edit fields (target amount/date + allocation) room without disturbing the list, and matches the row-menu convention already used in Expenses/Transfers, where menu actions surface in dialogs (Delete is a `Dialog` there too). Net mental model: **inline = quick Adjust; modal = full Edit; dialog = Delete confirm.**

Mechanics: `SavingsGoalList` renders `RowMenu` per card (`onEdit` opens the full-edit modal; `onDelete` sets `goalToDelete` and opens the confirm `Dialog`). The `adjustingGoalId` path stays inline in-card. `SavingsGoalForm` keeps its three modes but its `mode="full"` render is hosted inside the modal; its duplicate `persistContributionOverrides` is deleted and replaced by `session.saveSession()`.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/savings/SavingsGoalList.tsx` | Modified | Add `RowMenu`; add `goalToDelete` state + delete-confirm `Dialog`; open full-edit in modal; keep Adjust inline |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | Modified | Remove duplicate `persistContributionOverrides`; delegate to `session.saveSession()`; `mode="full"` hosted in modal |
| `frontend/src/shared/ui/RowMenu.tsx`, `Dialog.tsx` | Reused | Existing primitives — no changes |
| `api/*`, `prisma/schema.prisma`, `frontend/src/entities/savings-goal/*` | None | Delete path + API client already exist |
| Tests (new/modified, TDD-first) | Added | Delete flow, inline-adjust extraction, row-menu wiring, full-edit modal, save-path unification |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Delete accidentally implies touching shared balance | Low | Backend already isolates delete; add explicit test asserting shared balance unchanged after delete; reassurance copy in dialog |
| Save-path unification regresses phase transitions | Med | Delegate to `session.saveSession()` (already the canonical path); TDD test asserts phases + persisted overrides match prior behavior |
| Two inline modes conflict if Edit not moved to modal | Med | Resolved by decision above — Edit is modal, Adjust is inline |
| Diff exceeds review budget | Med | See below |

## Delivery / Review Budget
Estimated authored diff ≈ **350–500 changed lines** (UI wiring + new tests under strict TDD). Under this session's 800-line cap but likely above the 400-line default budget once tests land. PR strategy is **ask-on-risk**: `sdd-tasks` should forecast the split and, if the forecast is Medium/High, recommend two slices — (1) delete flow (RowMenu + confirm Dialog + delete tests), (2) adjust/edit refactor (inline Adjust extraction + full-edit modal + save-path unification). Strict TDD is enabled: `sdd-apply` MUST write failing tests first for the delete flow, the inline-adjust extraction, the row-menu wiring, and the save-path unification.

## Rollback Plan
Frontend-only, no schema/migration. Revert the two touched feature files; `RowMenu`/`Dialog` are pre-existing and untouched. No DB state to unwind (delete is a real backend op but adding UI to trigger it introduces no new persistence).

## Dependencies
- Existing `RowMenu`, `Dialog`, `savingsGoalApi.delete`, and `useContributionSession.saveSession()` (all present).

## Success Criteria
- [ ] Each goal card shows a "⋯" row menu (Edit + Delete); the standalone "✎ Edit Goal Settings" button is gone.
- [ ] Delete opens a confirmation dialog reassuring the shared balance stays intact, and on confirm removes only the goal earmarking.
- [ ] A test asserts the shared balance/pot is unchanged after a goal delete.
- [ ] "Adjust" edits allocations inline in the card; full "Edit" opens in a modal.
- [ ] `SavingsGoalForm` no longer has a duplicate save helper — it uses `session.saveSession()`.
