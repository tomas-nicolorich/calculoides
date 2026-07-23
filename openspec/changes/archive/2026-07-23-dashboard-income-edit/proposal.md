# Proposal: Dashboard Income Inline Edit

## Intent

The dashboard Income Overview widget (`frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`) is read-only. Members must leave the dashboard to change incomes, and stale incomes silently skew every derived figure (shares, quotas, budget ceilings). Add an inline edit flow so any group member can edit any member's monthly income directly from the card, with all dependent numbers refreshing live.

## Scope

### In Scope
- Header pencil toggle switches the card into edit mode; rows become `€`-prefixed numeric inputs with live-recomputed share % next to each name; footer Close/Confirm.
- Persist edits via existing `update-income` action; refresh derived data through `refreshSummary()`.
- Reducer-based session hook + editor component, mirroring the savings-goal precedent.
- New `groupApi.updateMemberIncome(memberId, income)` frontend wrapper.
- **Backend authorization loosening** (required, not optional): allow any authenticated group member to edit any member's income.

### Out of Scope
- Owner-only / self-only restrictions (explicitly deferred; product decision: all members edit all).
- Adding `ownerId` to the `Summary` type — not needed without per-owner gating.
- Income history/audit, create/delete of members, projection/diff logic.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `dashboard-income`: income becomes editable inline by any group member; authorization widened from owner/self to any member.

## Approach

- **Backend**: relax `GroupService.updateMemberIncome` (`api/_src/services/group.ts`) from `isOwner || isSelf` to "requester is a member of the target's group". No new endpoint — `update-income` route and `prisma.groupMember.update` are unchanged. Negative input already rejected by `UpdateIncomeSchema` (`z.number().nonnegative()`).
- **Frontend**: follow `InlineAllocationEditor` + `useContributionSession` precedent, simplified (per-member override amount + save; no diff/forecast). Local `isEditing` state, `onRefresh` prop calling `refreshSummary()`. Add wrapper to existing `groupApi`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `api/_src/services/group.ts` | Modified | Loosen income auth to any group member |
| `frontend/.../ui/IncomeOverview.tsx` | Modified | Add edit-mode toggle + inputs |
| `frontend/src/entities/group/index.ts` | Modified | Add `updateMemberIncome` wrapper |
| `frontend/src/entities/member/*` (new session hook) | New | Reducer session for income edits |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Loosened auth lets any member overwrite incomes | Med | Explicit product decision; scoped to group members only |
| Concurrent edits: last-write-wins | Low | Acceptable; `refreshSummary()` reconciles on save |
| Invalid/negative input | Low | Client validation + server `nonnegative` guard |

## Rollback Plan

Revert the frontend feature commit (widget reverts to read-only) and restore the `isOwner || isSelf` check in `updateMemberIncome`. No schema/data migration involved.

## Dependencies

- None (backend persistence and summary recomputation already exist).

## Success Criteria

- [ ] Any group member can edit any member's income from the dashboard card.
- [ ] Share % updates live while typing; all summary figures refresh after save.
- [ ] Negative/invalid income is rejected client- and server-side.
- [ ] Empty group renders no editable rows without error.
