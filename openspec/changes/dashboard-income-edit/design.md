# Design: Dashboard Income Inline Edit

## Technical Approach

Make the read-only `IncomeOverview` card editable inline, mirroring the just-landed
savings-goal precedent (`InlineAllocationEditor` + `useContributionSession`): a single
edit-mode toggle swaps every member row's amount for a €-prefixed numeric input, footer
Close/Confirm persists via the existing `update-income` route, and `refreshSummary()`
recomputes derived figures. Backend authorization for `GroupService.updateMemberIncome`
is widened from owner/self to any member of the target's group. No schema, endpoint, or
summary-recompute changes — persistence and live recomputation already exist server-side.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Editor structure | Reuse `InlineAllocationEditor` shape: one `isEditing` toggle, all rows become inputs at once, footer actions | Per-row pencil toggle | Consistency with shipped precedent; minimal edit-mode diff (Learned from savings redesign) |
| Session state | Small reducer hook `useIncomeSession(members)` mirroring `useContributionSession` (override map keyed by memberId, phase idle/editing/saving, saveError) | Plain `useState` per field | Matches project template; testable; batched save |
| Live share % | Derive in-hook from `overrideAmounts` (sum → per-member %), display only; no persistence | Call backend on keystroke | Shares are never persisted; server recomputes on refresh |
| Persistence | `groupApi.updateMemberIncome(memberId, income)` → `PUT /members/:id/income` | New endpoint/service method | Route + service already exist; only auth changes |
| Refresh | Widget calls injected `onRefresh` (= dashboard `refreshSummary`) after all saves resolve | Optimistic local mutation | Derived figures (shares, quotas, ceilings) live server-side only |
| Backend auth | Membership lookup on target's group; owner OR member allowed | Keep isOwner\|\|isSelf | Product decision: any member edits any member |

## Data Flow

    IncomeOverview (isEditing) ──► useIncomeSession (overrideAmounts, %)
         │  Confirm                         │
         ▼                                  │
    groupApi.updateMemberIncome(id, income) │ (Promise.all per changed member)
         │  PUT /members/:id/income         │
         ▼                                  │
    updateMemberIncome (auth: shared group) ─► prisma.groupMember.update
         │  success
         ▼
    onRefresh() = refreshSummary() ──► GET /summary recomputes shares/quotas/ceilings

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `api/_src/services/group.ts` | Modify | Replace `isOwner\|\|isSelf` in `updateMemberIncome` with owner-or-shared-member check |
| `frontend/src/entities/group/index.ts` | Modify | Add `updateMemberIncome(memberId, income)` wrapper to `groupApi` |
| `frontend/src/entities/member/useIncomeSession.ts` | Create | Reducer session hook (override map, phase, saveError) |
| `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx` | Modify | Add header toggle, per-row inputs, live %, footer, `groupId`+`onRefresh` props |
| `frontend/src/pages/dashboard/ui/DashboardPage.tsx` | Modify | Pass `groupId` and `onRefresh={handleRefresh}` to `IncomeOverview` |

## Interfaces / Contracts

Backend auth (target member already fetched with `group`):

```ts
const isOwner = member.group.ownerId === requesterId;
const isMember = await prisma.groupMember.findUnique({
  where: { userId_groupId: { userId: requesterId, groupId: member.groupId } },
});
if (!isOwner && !isMember) throw new Error("Unauthorized: not a member of this group");
```

Frontend wrapper (returns updated `Member`; `memberId` = `summary.members[].id`, confirmed
to be the `groupMember.id` in `transactions.ts:415`):

```ts
updateMemberIncome: (memberId: string, income: number) =>
  apiClient.fetch<Member>(`/members/${memberId}/income`, {
    method: "PUT",
    body: JSON.stringify({ income }),
  }),
```

Error handling: client rejects `NaN`/negative before dispatch; server keeps
`UpdateIncomeSchema` (`z.number().nonnegative()`) and returns 403 on non-member. Hook
stores `saveError`; on failure phase reverts to `editing`, inputs preserved (mirrors
`saveFailure`). `refreshSummary()` runs only after all saves resolve.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useIncomeSession` reducer: override, live %, save success/failure revert | Vitest, mock `groupApi` |
| Component | Toggle→inputs, live %, Confirm calls wrapper + onRefresh, negative rejected | RTL on `IncomeOverview` |
| Integration | `updateMemberIncome` allows non-owner member, 403 for outsider | `api/_tests/integration` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollback = revert frontend commit (card back to read-only) and
restore `isOwner || isSelf`.

## Open Questions / Considerations

- **Design-system tension**: user requested the "frontend-design" Claude Design skill, but
  that skill targets unbranded work; Calculoides has an established system (`DESIGN.md` +
  `InlineAllocationEditor` visual language). This design prioritizes consistency with the
  existing tokens/precedent over new aesthetic direction — flagged per instruction, not
  silently overridden.
- Owners may not have a `groupMember` row (list route treats owner/member separately), so
  the owner-OR-member check is retained rather than membership-only.
- Concurrent edits are last-write-wins; `refreshSummary` reconciles (accepted, Low risk).
