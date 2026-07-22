# Design: Scope savings-goal contribution overrides to intentional edits

## Technical Approach
Two-part fix. (1) Replace the "map full `goal.breakdown` with `overrideAmounts[id] ?? proportionalAmount`" persistence at all three save call sites with a diff computed from a single pure helper: upsert only members present in `overrideAmounts`, delete DB rows for members that WERE overridden (`breakdown[].isOverridden === true`) but are no longer in `overrideAmounts`. (2) Add the missing backend delete capability (service method + method-dispatch route + client method), since only upsert exists today and `customAmount` is non-nullable (no null sentinel). Backend `getGoalsForGroup` merge is unchanged — removing a row makes it recompute `base`. Implements spec requirements "Scoped Override Persistence on Save" and "Override Clearing on Reset".

## Architecture Decisions

### Decision: Where "clear on reset" is decided
**Choice**: A pure helper `diffContributionPersistence(breakdown, overrideAmounts)` returning `{ toUpsert: {memberId,amount}[]; toDelete: memberId[] }`. Delete set = `{ b.memberId | b.isOverridden } \ keys(overrideAmounts)`.
**Alternatives**: reducer-tracked "reset" flags in `useContributionSession`; ad-hoc diffing inline per call site.
**Rationale**: `breakdown[].isOverridden` already encodes prior DB state; `overrideAmounts` already encodes intent (seeded from `isOverridden` at sessionStart, emptied by reset, restored by undo). Diffing the two derives delete/upsert with no new state. One pure function → one TDD seam reused by all three call sites; covers reset (empty map → delete all prior), undo (restored → upsert), and no-preexisting (not in delete set) without special cases.

### Decision: Backend delete shape
**Choice**: New peer service method `SavingsService.deleteContribution(goalId, memberId)` using `prisma.savingsGoalContribution.deleteMany` (idempotent no-op when absent), with the same goal/member/group-ownership validation as `upsertContribution`. New leaf handler `savings-contribution-delete`. Introduce a `savings-contribution` method dispatcher (mirrors existing `routes.savings`) routing POST→upsert, DELETE→delete; repoint vercel.json.
**Alternatives**: overload `upsertContribution` with a delete flag; branch on method inside the existing leaf handler; `prisma...delete` (throws P2025 when missing).
**Rationale**: Peer method + method dispatcher matches the established `routes.savings` pattern and keeps leaf handlers single-purpose. `deleteMany` satisfies spec scenario D (reset member with no prior row = clean no-op). Reusing route indirection avoids inventing a new endpoint style.

## Data Flow
    Form/Hook save
      diffContributionPersistence(breakdown, overrideAmounts)
        ├ toUpsert → savingsGoalApi.upsertContribution → POST  /savings/contribution
        └ toDelete → savingsGoalApi.deleteContribution → DELETE /savings/contribution
                          │ (savings-contribution dispatcher)
                          └→ SavingsService.deleteContribution → deleteMany
    next getGoalsForGroup read → no override row → actualAmount = base

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `frontend/src/entities/savings-goal/contributionDiff.ts` | Create | Pure `diffContributionPersistence` helper |
| `frontend/src/entities/savings-goal/index.ts` | Modify | Add `savingsGoalApi.deleteContribution` (DELETE), export helper |
| `frontend/src/entities/savings-goal/useContributionSession.ts` | Modify | `saveSession` uses diff (upsert override keys, delete reset members) |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | Modify | Both `handleSubmit` branches (`isEditing`, `isAllocationOnly`) use diff helper |
| `api/_src/services/savings.ts` | Modify | Add `deleteContribution(goalId, memberId)` peer to `upsertContribution` |
| `api/_src/handlers/transactions.ts` | Modify | Add `savings-contribution-delete` leaf + `savings-contribution` method dispatcher |
| `vercel.json` | Modify | `/api/savings/contribution` → `action=savings-contribution` |
| `prisma/schema.prisma` | None | No migration — rows deleted, `customAmount` stays non-nullable |

## Interfaces / Contracts
```ts
// contributionDiff.ts
function diffContributionPersistence(
  breakdown: ContributionBreakdown[],
  overrideAmounts: Record<string, number>,
): { toUpsert: { memberId: string; amount: number }[]; toDelete: string[] };
// client
savingsGoalApi.deleteContribution(goalId, memberId): Promise<undefined>; // DELETE, no body
// service
SavingsService.deleteContribution(goalId: string, memberId: string);
```

## Testing Strategy (TDD seams)
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `diffContributionPersistence` — untouched excluded, edited upserted, reset→delete, undo→upsert, no-preexisting→no delete | pure fn, table-driven |
| Unit | `SavingsService.deleteContribution` — deletes row, group-ownership guard, no-op when absent | mocked prisma |
| Unit | `savings-contribution` dispatcher + delete handler — POST→upsert, DELETE→delete, 405 else, IdSchema validation | handler test |
| Unit | `savingsGoalApi.deleteContribution` — DELETE to correct URL | client mock |
| Component | `SavingsGoalForm` both branches + `saveSession` — upsert only override keys, delete reset members | RTL |
| Integration | `api/_tests/integration/savings.test.ts` — `getGoalsForGroup` recomputes `base` after delete | live prisma |

## Threat Matrix
N/A — no shell, subprocess, VCS/PR automation, or executable-file classification. New DELETE endpoint inherits `withAuth` and the same group-ownership guard as upsert.

## Migration / Rollout
No migration required. `customAmount` stays non-nullable; clearing removes the row.

## Non-Regression
Does NOT touch `calculateSavingsContributions`/`getGoalsForGroup` months/share math (#159/#160) or what "Reset to Income Split" computes — only removal of the stale DB row after a saved reset.

## Open Questions
- [ ] None blocking.
