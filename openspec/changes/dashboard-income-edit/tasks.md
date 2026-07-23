# Tasks: Dashboard Income Inline Edit

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend auth widening -> PR 2 frontend hook + widget + wiring |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Widen `GroupService.updateMemberIncome` auth + regression/integration tests | PR 1 | `npm test -w api -- --run group.test.ts groups.test.ts` | `api/_tests/integration/groups.test.ts` PUT `/members/:id/income` (mocked prisma) | Revert `api/_src/services/group.ts` to `isOwner \|\| isSelf`; independently shippable (no frontend depends on it yet) |
| 2 | `useIncomeSession` + `groupApi.updateMemberIncome` + `IncomeOverview` edit mode + `DashboardPage` wiring | PR 2 (base: PR 1) | `npm test -w frontend -- --run useIncomeSession IncomeOverview index.test` | RTL: toggle -> edit inputs -> Confirm -> `onRefresh` fired, on live fixture members | Revert `useIncomeSession.ts` (delete), `IncomeOverview.tsx`, `entities/group/index.ts`, `DashboardPage.tsx` to prior commit; card reverts to read-only |

## Phase 1: Backend Authorization Widening

- [x] 1.1 [RED] `api/_tests/logic/group.test.ts`: add `describe("updateMemberIncome")` — owner updates any member (regression), non-owner shared-group member updates another member's income, requester in a different group is rejected, member not found is rejected — expect the shared-group-member case to FAIL against current `isOwner || isSelf`
- [x] 1.2 [GREEN] `api/_src/services/group.ts` `updateMemberIncome` (lines 118-143): replace `isSelf` with `isMember = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: requesterId, groupId: member.groupId } } })`; guard becomes `if (!isOwner && !isMember) throw ...`
- [x] 1.3 [REFACTOR] Update error message to "Unauthorized: not a member of this group"; confirm 1.1 passes
- [x] 1.4 [Verify] `api/_tests/integration/groups.test.ts`: add PUT `/members/:id/income` scenarios — non-owner shared-group member succeeds (200), outsider member of a different group rejected (error, income unchanged), negative income rejected by `UpdateIncomeSchema` (no data change)

## Phase 2: Frontend API Wrapper

- [x] 2.1 [RED] `frontend/src/entities/group/index.test.ts` (new): `groupApi.updateMemberIncome(memberId, income)` sends `PUT /members/{memberId}/income` with `{ income }` body, returns typed `Member` — expect failure (wrapper absent)
- [x] 2.2 [GREEN] `frontend/src/entities/group/index.ts`: add `updateMemberIncome: (memberId: string, income: number) => apiClient.fetch<Member>(\`/members/${memberId}/income\`, { method: "PUT", body: JSON.stringify({ income }) })` to `groupApi`

## Phase 3: useIncomeSession Hook

- [x] 3.1 [RED] `frontend/src/entities/member/useIncomeSession.test.ts` (new): session start snapshots current incomes; `overrideIncome(memberId, amount)` updates map and derived share % recomputes live; NaN/negative `overrideIncome` is a no-op; `saveSession()` calls `groupApi.updateMemberIncome` only for changed members (`Promise.all`), then resolves to idle; `saveSession()` failure sets `saveError`, reverts to `editing`, preserves inputs; `cancelSession()` restores the start snapshot with no API call — expect failures (hook absent)
- [x] 3.2 [GREEN] Create `frontend/src/entities/member/useIncomeSession.ts`: reducer mirroring `useContributionSession` (phases `idle`/`editing`/`saving`, `overrideAmounts` map, `saveError`), derived live share % selector, `saveSession` diffs `overrideAmounts` against the start snapshot and calls `groupApi.updateMemberIncome` only for changed members
- [x] 3.3 [REFACTOR] Confirm 3.1 passes; align exported `IncomeSession` interface naming with design (`phase`, `overrideAmounts`, `shares`, `saveError`, `overrideIncome`, `saveSession`, `cancelSession`)

## Phase 4: IncomeOverview Edit-Mode UI

- [x] 4.1 [RED] `frontend/src/widgets/dashboard/ui/IncomeOverview.test.tsx` (new): header pencil toggles every row into a `€`-prefixed numeric `Input` with live % recompute while typing; Close discards without calling `updateMemberIncome`, restores original values; Confirm calls `updateMemberIncome` once per changed member then `onRefresh`, returns to view mode; negative/non-numeric input blocks Confirm dispatch with an inline message; a failed Confirm (network/5xx) shows an inline error, keeps edit mode open with last confirmed values, and does not call `onRefresh`; empty `members` renders no rows and no error in edit mode — expect all failures (component still read-only)
- [x] 4.2 [GREEN] `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`: add `groupId`/`onRefresh` props, header pencil `IconButton` driving `useIncomeSession(members)`, per-row `€`-prefixed `Input` in edit mode bound to `overrideIncome`, footer Close (`cancelSession()`) / Confirm (`await saveSession(); onRefresh?.()`), render `saveError`, block Confirm dispatch on NaN/negative
- [x] 4.3 [REFACTOR] Confirm 4.1 passes; verify edit-mode styling matches `InlineAllocationEditor` conventions (`Input`, footer button variants)

## Phase 5: Dashboard Wiring

- [x] 5.1 [GREEN] `frontend/src/pages/dashboard/ui/DashboardPage.tsx` (~line 196-202): pass `groupId={groupId}` and `onRefresh={handleRefresh}` to `<IncomeOverview>`
- [x] 5.2 [Verify] Manually confirm `handleRefresh` (dashboard's `refreshSummary`) runs after Confirm and shares/quotas/ceilings update without a page reload

## Phase 6: Regression & Full Suite Verification

- [x] 6.1 [Regression] `npm test -w api -- --run group.test.ts groups.test.ts` and `npm test -w frontend -- --run useIncomeSession IncomeOverview index.test`
- [x] 6.2 [Verify] `npm run typecheck -w api -w frontend`; full `npm test -w api` and `npm test -w frontend`

## Phase 7: Verify Follow-up (closing sdd-verify gaps, verify-report Engram #79)

- [x] 7.1 [Characterization test] `api/_tests/logic/group.test.ts`: add "persists only the raw income column — no derived share/quota/ceiling field is written" to `describe("updateMemberIncome")` — asserts `prisma.groupMember.update`'s `data` payload has exactly the `income` key, closing CRITICAL gap "Derived values are not persisted" (service-layer half)
- [x] 7.2 [Characterization test] `api/_tests/integration/summary.test.ts`: add `describe("Dashboard summary — derived values are computed live, never persisted")` with two tests — (a) decoy `share`/`percentage: 999` fields injected into the mocked DB row are ignored, share is derived purely from `income`; (b) a fresh summary call after a simulated income change (1000/1000 -> 3000/1000) recomputes `totalIncome` and per-member `share` live (50/50 -> 75/25), closing CRITICAL gap "Derived values are not persisted" (recompute-on-refresh half)
- [x] 7.3 [Characterization test] `api/_tests/logic/group.test.ts`: add "two members editing the same income concurrently — last write wins, no conflict error" to `describe("updateMemberIncome")` — two sequential `updateMemberIncome` calls by different requesters on the same target member, asserts both resolve without throwing and the second call's value is what's returned/persisted, closing CRITICAL gap "Two members edit the same income concurrently, last-write-wins"
- [x] 7.4 [Cleanup] Remove dead `groupId?: string` from `IncomeOverviewProps` in `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx` (confirmed unused in component body, grep confirmed no other caller depends on it) and its `groupId={groupId ?? ""}` pass-through at `frontend/src/pages/dashboard/ui/DashboardPage.tsx:202`, closing WARNING "`IncomeOverviewProps.groupId` is dead"
- [x] 7.5 [Verify] Full suite + typecheck re-run: `npm test -w api -- --run` (145/145, was 141/141 — +4 new: 2 characterization tests in `group.test.ts` + 2 in `summary.test.ts`), `npm test -w frontend -- --run` (297/297, unchanged — prop removal only, no new frontend test needed), `npm run typecheck -w api` (clean), `npm run typecheck -w frontend` (clean)

Explicitly out of scope for Phase 7 (per orchestrator instruction, unchanged):
- Pre-existing 403->500 gap in `api/_src/handlers/members.ts`'s `update-income` route (verify-report WARNING 1) — pre-existing, unrelated to this change's diff
- `spec.md` "row stays open with last confirmed value" vs actual "preserves attempted value" wording mismatch (verify-report WARNING 3) — documentation reconciliation, not code, deferred to archive report

## Status: ALL PHASES COMPLETE (including Phase 7 verify follow-up)

- api full suite: 145/145 passing (was 141/141 before Phase 7)
- frontend full suite: 297/297 passing (unchanged)
- typecheck (api + frontend): clean
