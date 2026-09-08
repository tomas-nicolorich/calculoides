# Verification Report — savings-goal-override-scoping (issue #161)

**Change**: Scope savings-goal contribution overrides to intentional edits. Branch `feat/savings-ceiling-aware-reset` (uncommitted working-tree changes at verify time — no commit made yet for this change).

**Mode**: Full artifact set (spec + design + tasks + apply-progress), Strict TDD active.

### Task Completeness
19/19 tasks marked `[x]` across 5 phases — verified genuinely done by re-reading each artifact (not trusting marks blindly):
- Phase 1 (pure diff helper `contributionDiff.ts`): present, matches design interface exactly, 6 table-driven test cases including the mixed 4-member scenario. All pass.
- Phase 2 (backend delete): `SavingsService.deleteContribution` present with identical group-ownership guard pattern as `upsertContribution`, uses `deleteMany` (idempotent). 5 unit tests (delete, no-op-absent, goal-not-found, member-not-found, cross-group-mismatch) — all real Prisma-mock assertions, no tautologies.
- Phase 2 dispatcher: `routes["savings-contribution"]` added — POST→upsert, DELETE→delete, else 405. `vercel.json` rewrite repointed to `action=savings-contribution`. Handler tests cover all 3 branches plus 400 on missing params.
- Phase 3 (frontend client): `savingsGoalApi.deleteContribution` added, DELETE with no body, correct URL. Client test present.
- Phase 4 (call-site wiring): ALL THREE call sites verified fixed — `SavingsGoalForm.handleSubmit` `isEditing` branch, `isAllocationOnly` branch (both via shared `persistContributionOverrides` helper, deduped in refactor step 4.7 as claimed), and `useContributionSession.saveSession`. All three call `diffContributionPersistence` and dispatch `Promise.all([...toUpsert.map(upsert), ...toDelete.map(delete)])`.
- Phase 5 (regression + integration): RTL regression tests for reset→save (delete), undo→save (upsert restored value, asserts input still shows original value proving #159/#160 math untouched), untouched-member-no-call. Integration test does delete then simulates re-list, asserts `getGoalsForGroup` merge recomputes `actualAmount === proportionalAmount`, `isOverridden === false` — confirms merge logic itself was NOT modified (design claim verified: zero diff in `calculation.ts`/`shared/`).

### Spec Requirement Compliance
| Requirement | Status | Evidence |
|---|---|---|
| Scoped Override Persistence on Save (3 call sites) | ✅ COMPLIANT | All 3 sites use `diffContributionPersistence`; untouched-member-no-call tests pass at both form branches and hook level |
| saveSession scoping parity | ✅ COMPLIANT | `useContributionSession.test.ts` "saveSession scoping" describe block — 4 tests, all pass |
| Override Clearing on Reset (delete capability) | ✅ COMPLIANT | Backend `deleteContribution` + `savings-contribution-delete` route + client method all new and tested; save-after-reset deletes row (RTL + hook tests); save-after-undo upserts, does not delete |
| No null-sentinel / no migration | ✅ COMPLIANT | Zero diff in `prisma/schema.prisma`; `customAmount` still non-nullable `Decimal @db.Decimal(12,2)` |
| Reset member with no pre-existing row → no-op delete | ✅ COMPLIANT | Covered in `contributionDiff.test.ts` (\"does not delete a reset member that had no pre-existing override row\") and backend \"no-op when absent\" test |

### Non-Regression (#159 months-remaining, #160 share/percentage)
✅ VERIFIED — `git diff --stat` shows **zero changes** to `api/_src/services/calculation.ts` or `shared/` in this change. `calculateSavingsContributions` (percentage-weighted) and `calculateMonthsRemaining` usage in `getGoalsForGroup` untouched. Dedicated regression test in `SavingsGoalForm.test.tsx` explicitly asserts the reset/undo cycle never recalculates proportional/percentage fields (input still shows original override value 350 after undo, before any save).

### Reset to Income Split / Undo Reset flow
✅ VERIFIED still correct — reducer `resetToIncomeSplit`/`undoReset` actions in `useContributionSession.ts` unchanged in logic (still snapshot/restore via `preResetSnapshot`); only the save-time persistence dispatch changed (now diff-based instead of unconditional full-breakdown upsert). RTL tests exercise the actual click flow (Reset button → Save → assert delete call; Reset → Undo Reset → Save → assert upsert with restored value, no delete).

### Test Execution (actual re-run by verifier, not trusted from apply-progress)
- `npm test -w api` → **27 files / 131 tests passed**, exit 0. Matches apply-progress claim exactly.
- `npm test -w frontend` → **44 files / 267 tests passed**, exit 0. Matches apply-progress claim exactly.
- `npm run typecheck -w frontend` → clean, exit 0.

### Assertion Quality Audit (Strict TDD)
Reviewed all new/modified test files (`contributionDiff.test.ts`, `savings-delete-contribution.test.ts`, integration `savings.test.ts` new describe block, handler `savings-goals.test.ts` new describe blocks, `useContributionSession.test.ts` new describe block, `SavingsGoalForm.test.tsx` new describe block + rewritten test, `index.test.ts`). No tautologies, no ghost loops, no assertion-without-production-call, no ratio of mocks > 2x assertions. All tests render/invoke real production code paths and assert distinguishable expected values (different member IDs/amounts per case, not all-empty). One pre-existing `SavingsGoalForm.test.tsx` test was intentionally rewritten because it encoded the OLD buggy behavior (untouched member getting upserted) — this is a correct, spec-mandated behavior change, not a hidden regression; confirmed by reading the diff.

**Assertion quality**: ✅ All assertions verify real behavior.

### Diff Size / Scope Check (size:exception delivery)
- Actual measured diff (api + frontend + vercel.json, tracked + new untracked files, via `git diff --shortstat` with `git add -N` for new files): **14 files changed, 949 insertions(+), 27 deletions(-)** = ~976 changed lines.
- Tasks artifact forecast was "~550-650" lines, accepted as `size:exception` (High risk, single PR, user-approved, no chaining).
- **WARNING**: actual diff is ~50% larger than the forecast (976 vs ~600 midpoint). Not scope creep in a "wrong feature" sense — file list matches the design's File Changes table exactly (10 tracked + 4 new test/helper files, no unrelated files) — but the size exception was approved against a lower estimate. Flag for orchestrator/user awareness: the already-large exception is materially bigger than what was approved.
- Unrelated pre-existing modifications in working tree (`CLAUDE.md`, `package.json`, `package-lock.json` — `allowScripts` config change) are NOT part of this change's scope and were correctly excluded from the diff-size calculation; they predate this SDD session.

### Issues Found
**CRITICAL**: None.

**WARNING**:
1. Actual diff size (~976 lines) exceeds the tasks-phase forecast (~550-650 lines) by roughly 50%, even though the same `size:exception` single-PR delivery was approved. The file set itself matches the design exactly (no scope creep in content), but the magnitude of the accepted exception should be re-confirmed with the user/orchestrator before archiving, since the original approval was implicitly bounded by the smaller estimate.
2. All changes are currently uncommitted working-tree modifications on `feat/savings-ceiling-aware-reset` — no commit has been created yet for this change. Archive/PR workflow will need a commit step before this can be reviewed/merged.

**SUGGESTION**: None.

### Final Verdict: PASS WITH WARNINGS
All spec requirements implemented and test-verified at runtime. All 19 tasks genuinely complete. Zero regressions in #159/#160 math (verified via zero diff in the relevant calculation files plus passing regression tests). Reset/Undo Reset flow intact. Full test suites pass with counts matching apply-progress claims exactly. Only warnings are process/scale-related (diff size vs. forecast, and the change being uncommitted), not correctness defects.
