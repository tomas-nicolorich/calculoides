# Design: Redesign savings-goal edit/adjust and add delete

## Technical Approach
Frontend-only refactor of the savings goal card surface. Three moves: (1) extract the
per-member allocation editor out of `SavingsGoalForm` into a standalone
`InlineAllocationEditor` that owns its own `useContributionSession` and saves via
`session.saveSession()`, rendered inline in each card when "Adjust" is toggled; (2) shrink
`SavingsGoalForm` to create + full-edit of goal *metadata only* (name/icon/target/saved/date)
and host its edit render inside a modal, deleting the duplicate `persistContributionOverrides`
helper and the whole allocation section from the form; (3) replace the standalone "✎ Edit Goal
Settings" button with the shared `RowMenu` ("⋯" → Edit + Delete) and add a delete-confirmation
`Dialog` wired to the already-existing `savingsGoalApi.delete(goalId)`. No backend, schema,
API-client, or `useContributionSession` changes — every primitive (`RowMenu`, `Dialog`,
`savingsGoalApi.delete`, `session.saveSession()`) already exists. Preserves the behavioral
invariant: **deleting a goal removes only the earmarking; the shared balance/pot is never
touched.**

## Architecture Decisions

### Decision: Two edit surfaces — inline Adjust vs modal Edit — with a hard split of concerns
**Choice**: The card has exactly two distinct edit affordances that never overlap:
- **Adjust (inline, in-card)** edits *allocations only* → new `InlineAllocationEditor`.
- **Edit (modal)** edits *goal metadata only* (name/icon/target/saved-so-far/date) → `SavingsGoalForm` hosted in a `Dialog`.

`SavingsGoalForm` **stops rendering the allocation section entirely** and loses its `mode`
prop; it becomes create-or-full-edit of metadata. Allocation editing lives *only* in
`InlineAllocationEditor`.
**Alternatives**: keep `SavingsGoalForm`'s three modes and merely host `mode="full"` (which
still renders `AllocationOverridesEditor`) in the modal — as the proposal's Approach section
literally phrased it.
**Rationale**: If the full-edit modal kept the allocation editor, allocations would be editable
in *two* places (modal + inline Adjust) — exactly the "competing surfaces" problem the proposal
flagged (Success Criteria / Risks). A clean split gives one canonical place per concern:
`inline = quick Adjust (allocations)`, `modal = full Edit (metadata)`, `dialog = Delete
confirm`. This *refines* the proposal's high-level "keeps its three modes" phrasing into the
buildable shape the proposal's own anti-goal (no competing surfaces) demands. It also collapses
two save paths into one per concern and removes `SavingsGoalForm`'s dependency on
`useContributionSession` altogether.

### Decision: Adjust stays toggle-based per card (not always-visible)
**Choice**: Keep an "ADJUST" button on each card that toggles `adjustingGoalId`. When
`adjustingGoalId === goal.id`, the read-only Monthly Allocation breakdown is replaced by
`InlineAllocationEditor` (editable inputs + Reset/Undo + Save/Cancel); otherwise the card shows
today's read-only breakdown.
**Alternatives**: render editable inputs always-visible in every card (no toggle).
**Rationale**: The mockup's interaction model is ambiguous between the two; per the phase brief,
pick the simpler option that preserves today's UX. Toggle-based keeps the default card compact
and read-only (matching the current one-goal-at-a-time editing session that
`useContributionSession` already models via a single active goal), avoids N simultaneous live
sessions in the list, and is a smaller diff. Always-visible can be revisited later without
touching the extracted component's contract.

### Decision: Full-edit modal primitive = `Dialog` (centered), not `ResponsiveDialog`
**Choice**: Host the full-edit `SavingsGoalForm` in the shared `Dialog` (`shared/ui/Dialog.tsx`),
opened from `RowMenu.onEdit`.
**Alternatives**: `ResponsiveDialog` (desktop-centered / mobile bottom-sheet).
**Rationale**: The *identical* form already renders inside a plain `Dialog` for the create path
on `SavingsPage` (`SavingsPage.tsx:76-92`), and the sibling Expenses/Transfers edit modals also
use `Dialog`. Using the same primitive keeps create and edit visually and structurally
consistent and is the lowest-risk choice — the form is already proven to fit `Dialog`'s
`max-w-md` centered popup. `ResponsiveDialog` (mobile sheet + internal scroll) is the fallback
if the icon-grid + 4-field form later proves too tall on small screens, but there is no evidence
it does today, so introducing a second modal style for edit would be inconsistent churn.

### Decision: Delete uses the `Dialog` + `DialogFooter` confirm convention
**Choice**: A list-level confirmation `Dialog` driven by `goalToDeleteId: string | null`, mirror
of `ExpensesPage.tsx:530-556`. Title "Delete Goal"; description reassures the shared balance
stays intact; `DialogFooter` with Cancel (outline) + Delete (expense variant) → `handleDelete`
calls `savingsGoalApi.delete(goalId)`, then `onRefresh()`, then clears state.
**Alternatives**: inline `window.confirm`; a bespoke dialog.
**Rationale**: Matches the established Expenses/Transfers delete UX one-to-one, reuses existing
primitives, and gives the reassurance copy a natural home. `savingsGoalApi.delete` already
exists (`entities/savings-goal/index.ts:104`) and the backend cascade only removes
`SavingsGoalContribution` rows — no ledger/pot relation — so no backend work.

### Decision: Single save path via `session.saveSession()`; delete the duplicate helper
**Choice**: `InlineAllocationEditor` saves by calling `session.saveSession()` (which already
runs `diffContributionPersistence` → upsert override keys + delete reset members, with
`saveStart`/`saveSuccess`/`saveFailure` phase transitions — `useContributionSession.ts:207-237`).
`SavingsGoalForm`'s local `persistContributionOverrides` (current lines 16-33) is **deleted
entirely** once nothing calls it, along with the now-unused imports (`useContributionSession`,
`ContributionBreakdown`, `diffContributionPersistence`, and allocation-only UI imports).
**Alternatives**: keep `persistContributionOverrides` and call it from the inline editor.
**Rationale**: `persistContributionOverrides` duplicates `saveSession`'s exact diff/upsert/delete
logic but *bypasses* the reducer phase machine (no `saving`/`saveSuccess` transitions, no
`saveError` surface). Routing through `saveSession()` gives correct phase transitions, the
`saveError` channel, and one canonical persistence seam. The helper has no other caller after the
allocation section leaves `SavingsGoalForm`, so it is dead code and is removed.

## Components & Boundaries
| Component | File | Responsibility | Owns session? |
|-----------|------|----------------|---------------|
| `InlineAllocationEditor` (new) | `frontend/src/features/savings/InlineAllocationEditor.tsx` | Per-member allocation inputs, ceiling warnings, Reset/Undo, Save/Cancel — inline in a card | Yes: `useContributionSession(goal)` |
| `SavingsGoalForm` (shrunk) | `frontend/src/features/savings/SavingsGoalForm.tsx` | Create + full-edit of goal metadata only; no allocation, no `mode` prop | No |
| `SavingsGoalList` (rewired) | `frontend/src/features/savings/SavingsGoalList.tsx` | Renders cards, `RowMenu`, Adjust toggle, hosts edit modal + delete dialog | No (children do) |
| `RowMenu`, `Dialog`, `DialogFooter` | `shared/ui/*` | Reused unchanged | — |

### `InlineAllocationEditor` contract
```ts
interface InlineAllocationEditorProps {
  goal: SavingsGoal;
  onSaved: () => void | Promise<void>; // parent clears adjustingGoalId + refreshes
  onCancel: () => void;                // parent clears adjustingGoalId
}
// internally: const session = useContributionSession(goal);
// Save button: onClick={async () => { if (await session.saveSession()) await onSaved(); }}
// Cancel button: onClick={() => { session.cancelSession(); onCancel(); }}
```
Moves the current `AllocationOverridesEditor` JSX (SavingsGoalForm.tsx:48-139) verbatim (Reset,
per-member `Input` bound to `session.overrideAmounts`, `session.ceilingWarnings` badges, Undo
Reset) plus a Save/Cancel button row and `session.saveError` surface.

### `SavingsGoalForm` after shrink
```ts
interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;          // present = full-edit, absent = create
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
  // REMOVED: mode?: "full" | "allocation"
}
// handleSubmit: create -> savingsGoalApi.create; edit -> savingsGoalApi.update. No override persistence.
```

## State Model — `SavingsGoalList`
Replaces the current `editingGoalId` / `adjustingGoalId` pair with:
```ts
const [goalToEdit, setGoalToEdit]     = useState<SavingsGoal | null>(null); // full-edit MODAL target
const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null); // inline Adjust toggle
const [goalToDeleteId, setGoalToDeleteId]   = useState<string | null>(null); // delete-confirm target
```
- `goalToEdit` (object, mirroring Expenses' `expenseToEdit`) drives a single list-level edit
  `Dialog` (`open={goalToEdit !== null}`) hosting `SavingsGoalForm goal={goalToEdit}`. The
  previous per-card inline edit render (lines 35-50) is removed.
- `adjustingGoalId` toggles the inline `InlineAllocationEditor` inside the matching card,
  replacing that card's read-only breakdown (current lines 188-226).
- `goalToDeleteId` drives the delete-confirm `Dialog`.

## Wiring
### RowMenu (per card, replaces ✎ button)
```tsx
<RowMenu
  onEdit={() => setGoalToEdit(goal)}          // opens full-edit modal for this goal
  onDelete={() => setGoalToDeleteId(goal.id)} // opens delete-confirm dialog for this goal
/>
```
The standalone "✎ Edit Goal Settings" `Button` (lines 107-120) is deleted. The "ADJUST" button
(lines 121-134) stays and toggles `setAdjustingGoalId(goal.id)`.

### Full-edit modal (rendered once, list level)
```tsx
<Dialog open={goalToEdit !== null} onOpenChange={(o) => { if (!o) setGoalToEdit(null); }}
        title="Edit Goal" description="Update this goal's details.">
  {goalToEdit && (
    <SavingsGoalForm groupId={goalToEdit.groupId} goal={goalToEdit}
      onSuccess={() => { setGoalToEdit(null); void onRefresh?.(); }}
      onCancel={() => setGoalToEdit(null)} />
  )}
</Dialog>
```

### Delete-confirm dialog (rendered once, list level)
```tsx
<Dialog open={goalToDeleteId !== null} onOpenChange={(o) => { if (!o) setGoalToDeleteId(null); }}
        title="Delete Goal"
        description="This removes the goal and its earmarking only — your shared balance stays intact.">
  <DialogFooter>
    <Button variant="outline" onClick={() => setGoalToDeleteId(null)}>Cancel</Button>
    <Button variant="expense" onClick={() => { if (goalToDeleteId) void handleDelete(goalToDeleteId); }}>
      Delete Goal
    </Button>
  </DialogFooter>
</Dialog>
// handleDelete: await savingsGoalApi.delete(id); setGoalToDeleteId(null); await onRefresh?.();
```

## Data Flow
    Card "ADJUST" toggle → adjustingGoalId=goal.id → <InlineAllocationEditor goal={goal}>
       session.overrideMember / resetToIncomeSplit / undoReset  (local reducer)
       Save → session.saveSession()
                 diffContributionPersistence(breakdown, overrideAmounts)
                   ├ toUpsert → savingsGoalApi.upsertContribution (POST)
                   └ toDelete → savingsGoalApi.deleteContribution (DELETE)
               → onSaved() → setAdjustingGoalId(null) + onRefresh()

    RowMenu "Edit" → setGoalToEdit(goal) → <Dialog><SavingsGoalForm goal></Dialog>
       Save → savingsGoalApi.update (metadata only) → onSuccess → close + refresh

    RowMenu "Delete" → setGoalToDeleteId(goal.id) → <Dialog confirm>
       Delete → savingsGoalApi.delete(goalId)  (cascade: SavingsGoalContribution only)
              → refresh   (shared balance/pot untouched)

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `frontend/src/features/savings/InlineAllocationEditor.tsx` | Create | Extracted allocation editor owning `useContributionSession`; Save via `session.saveSession()` |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | Modify | Delete `persistContributionOverrides` + `AllocationOverridesEditor` + `mode` prop + allocation render + session imports; metadata create/edit only |
| `frontend/src/features/savings/SavingsGoalList.tsx` | Modify | New state trio; `RowMenu`; remove ✎ button + inline edit render; keep Adjust toggle → `InlineAllocationEditor`; edit `Dialog`; delete-confirm `Dialog` |
| `frontend/src/features/savings/InlineAllocationEditor.test.tsx` | Create | Tests moved from `SavingsGoalForm.test.tsx` allocation/reset/warning cases (TDD) |
| `frontend/src/features/savings/SavingsGoalForm.test.tsx` | Modify | Drop allocation/reset/override cases (now in InlineAllocationEditor); keep metadata create/edit |
| `frontend/src/features/savings/SavingsGoalList.test.tsx` | Modify | Add RowMenu-wiring, delete-confirm, Adjust-inline, edit-modal cases |
| `frontend/src/shared/ui/RowMenu.tsx`, `Dialog.tsx` | None | Reused as-is |
| `frontend/src/entities/savings-goal/*` | None | `delete`, `deleteContribution`, `saveSession` already exist |
| `api/*`, `prisma/schema.prisma`, `vercel.json` | None | No backend change |

## Testing Strategy (TDD seams — Strict TDD enabled, write failing tests first)
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Component | Delete: RowMenu "Delete" → confirm `Dialog` shows reassurance copy → Delete calls `savingsGoalApi.delete(goal.id)` exactly once + refresh; Cancel does NOT call | RTL, mocked `savingsGoalApi` |
| Component | Invariant: after delete, no call touches shared-balance/pot APIs (assert only `savingsGoalApi.delete` fired; no upsert/transfer calls) | RTL, spy assertions |
| Component | RowMenu wiring: "Edit" opens edit `Dialog` for the *correct* goal (title/fields reflect that goal id, not another card's) | RTL, multi-goal fixture |
| Component | Inline Adjust save (`InlineAllocationEditor`): editing a member + Save calls `session.saveSession()` producing correct upsert(override keys)/delete(reset members) diffs; Reset→delete-all; Undo→restore-upsert | RTL, mocked upsert/delete client |
| Component | Full-edit modal does NOT render allocation inputs (assert no per-member override `Input` / "Monthly Allocation" editor inside the edit `Dialog`) — guards the competing-surfaces regression | RTL negative assertion |
| Component | `SavingsGoalForm` metadata edit still calls `savingsGoalApi.update` and no longer references `persistContributionOverrides`/override persistence | RTL, mocked client |
| Migration | Move existing allocation/ceiling-warning/reset/undo cases from `SavingsGoalForm.test.tsx` to `InlineAllocationEditor.test.tsx` unchanged in intent | test relocation |

## Threat Matrix
N/A — no shell, subprocess, VCS/PR automation, or executable-file classification. Delete reuses
the existing `withAuth` + group-ownership-guarded backend DELETE; no new endpoint or permission
surface is introduced.

## Migration / Rollout
Frontend-only; no schema/migration/env change. Ships behind no flag. Rollback = revert the two
modified feature files + drop the new `InlineAllocationEditor.tsx`; shared primitives untouched.

## Non-Regression
- `useContributionSession`, `diffContributionPersistence`, `savingsGoalApi.*`, and the
  allocation/ceiling/reset math are untouched — only the *host component* of the allocation UI
  moves.
- Create path (`SavingsPage` → `Dialog` → `SavingsGoalForm` with no goal) keeps working: create
  never rendered the allocation section, so removing it changes nothing for create.
- Read-only card breakdown (percentages, actual amounts, "Custom" badge, projected date) is
  unchanged except that it is swapped for the editor only while a card is in Adjust mode.

## Open Questions
- [ ] None blocking. (Adjust always-visible vs toggle resolved to toggle; modal primitive
  resolved to `Dialog`.)
