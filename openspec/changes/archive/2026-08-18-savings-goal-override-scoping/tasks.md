# Tasks: Scope savings-goal contribution overrides to intentional edits

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (originally) |
| Suggested split | PR1 backend delete capability -> PR2 pure diff helper + frontend client -> PR3 call-site wiring + regression |
| Delivery strategy | size:exception — single PR approved by user, no chaining |
| Chain strategy | resolved: single PR on feat/savings-ceiling-aware-reset |

Decision needed before apply: No (resolved)
Chained PRs recommended: No — user approved size:exception single PR
Chain strategy: resolved: single PR
400-line budget risk: High (accepted)

### Suggested Work Units (all delivered in one PR)

| Unit | Goal | Focused test command | Runtime harness | Result |
|------|------|----------------------|-----------------|---------|
| 1 | `SavingsService.deleteContribution` + `savings-contribution` dispatcher + route | `npm test -w api -- --run _tests/unit/services/savings-delete-contribution.test.ts _tests/unit/handlers/savings-goals.test.ts` | `api/_tests/integration/savings.test.ts` (mocked prisma, delete then re-read) | PASS |
| 2 | `diffContributionPersistence` helper + `savingsGoalApi.deleteContribution` client | `npm test -w frontend -- --run contributionDiff src/entities/savings-goal/index.test.ts` | pure fn + mocked client | PASS |
| 3 | Wire `SavingsGoalForm` (`isEditing`, `isAllocationOnly`) + `useContributionSession.saveSession` to the diff helper; regression coverage | `npm test -w frontend -- --run SavingsGoalForm useContributionSession` | extended RTL suite asserting save-time delete/upsert | PASS |

## Phase 1: Foundation — Pure Diff Helper

- [x] 1.1 [RED] `contributionDiff.test.ts`: untouched member excluded, edited member upserted, reset member (`isOverridden` true, absent from `overrideAmounts`) → `toDelete`, undo-restored member → `toUpsert` not `toDelete`, reset member with no pre-existing row → not in `toDelete`
- [x] 1.2 [GREEN] Create `frontend/src/entities/savings-goal/contributionDiff.ts` implementing `diffContributionPersistence(breakdown, overrideAmounts)` to pass 1.1
- [x] 1.3 [REFACTOR] Align exported types with design interface; export helper from `frontend/src/entities/savings-goal/index.ts`

## Phase 2: Backend Delete Capability

- [x] 2.1 [RED] Unit test `SavingsService.deleteContribution` (mocked prisma): calls `deleteMany`, enforces group-ownership guard, no-op when row absent
- [x] 2.2 [GREEN] Add `deleteContribution(goalId, memberId)` to `api/_src/services/savings.ts`
- [x] 2.3 [RED] Handler test: `savings-contribution` dispatcher — POST→upsert, DELETE→delete, other methods→405, `IdSchema` validation
- [x] 2.4 [GREEN] Add `savings-contribution-delete` leaf + `savings-contribution` dispatcher in `api/_src/handlers/transactions.ts`
- [x] 2.5 [GREEN] Update `vercel.json`: `/api/savings/contribution` → `action=savings-contribution`

## Phase 3: Frontend API Client

- [x] 3.1 [RED] Client test: `savingsGoalApi.deleteContribution` sends DELETE to correct URL, no body
- [x] 3.2 [GREEN] Add `deleteContribution(goalId, memberId)` to `frontend/src/entities/savings-goal/index.ts`

## Phase 4: Call-Site Integration

- [x] 4.1 [RED] `useContributionSession.saveSession` test: only `overrideAmounts` keys upsert; reset-then-save member deletes; undo-then-save upserts; no-preexisting reset causes no delete (spec: saveSession scoping parity)
- [x] 4.2 [GREEN] Update `saveSession` to use `diffContributionPersistence` for upsert/delete dispatch
- [x] 4.3 [RED] RTL test: `SavingsGoalForm` `isEditing` branch — untouched member no call, reset member deletes, edited member upserts
- [x] 4.4 [GREEN] Update `handleSubmit` `isEditing` branch to use `diffContributionPersistence`
- [x] 4.5 [RED] RTL test: `SavingsGoalForm` `isAllocationOnly` branch — same scenarios as 4.3
- [x] 4.6 [GREEN] Update `handleSubmit` `isAllocationOnly` branch to use `diffContributionPersistence`
- [x] 4.7 [REFACTOR] Deduped identical `isEditing`/`isAllocationOnly` diff-persistence blocks into shared `persistContributionOverrides` helper in `SavingsGoalForm.tsx`

## Phase 5: Regression & Integration Verification

- [x] 5.1 [Regression] Extend existing "Reset to Income Split"/""Undo Reset" RTL suite: save-after-reset deletes override row, save-after-undo re-upserts restored value; assert computed base/percentage values unchanged (guards #159/#160)
- [x] 5.2 [RED] Integration test `api/_tests/integration/savings.test.ts`: after `deleteContribution`, `getGoalsForGroup` recomputes `actualAmount` from live `base`
- [x] 5.3 [Verify] Confirmed 5.2 passes with no `getGoalsForGroup` merge-logic change (design: merge is unchanged); no fix needed

## Status: 19/19 tasks complete. Full regression: api 27 files/131 tests passed, frontend 44 files/267 tests passed.
