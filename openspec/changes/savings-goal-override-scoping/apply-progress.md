# Apply Progress: Scope savings-goal contribution overrides (issue #161) — COMPLETE (19/19)

**Mode**: Strict TDD (RED → GREEN → REFACTOR)
**Delivery**: size:exception single PR on feat/savings-ceiling-aware-reset, all work uncommitted/unpushed

## Completed Tasks (19/19)

All 19 tasks across 5 phases complete. Implements full two-part fix: diff-based scoped persistence + backend delete capability.

**Phase 1**: Pure diff helper `diffContributionPersistence` (frontend/src/entities/savings-goal/contributionDiff.ts) — 6 table-driven tests, all pass.

**Phase 2**: Backend delete capability — `SavingsService.deleteContribution` (mocked prisma tests, 5 cases), `savings-contribution` dispatcher (POST/DELETE/405, 3 cases), `vercel.json` rewrite for new dispatcher. Full API suite 131/131 pass.

**Phase 3**: Frontend client method `savingsGoalApi.deleteContribution` (DELETE, no body). Client test present.

**Phase 4**: All three call sites wired — `SavingsGoalForm.handleSubmit` `isEditing` branch, `isAllocationOnly` branch (both via new shared `persistContributionOverrides` helper, deduped in refactor), and `useContributionSession.saveSession`. All use diff-based dispatch (upsert override keys only, delete reset members).

**Phase 5**: Regression tests for reset→save (delete) and undo→save (upsert restored value). Integration test: delete then re-list asserts `getGoalsForGroup` merge (untouched) recomputes `base`.

**Test Results**: api 131/131, frontend 267/267. All spec requirements pass.

**Files Changed**: 8 backend files (service, handler, route, tests), 6 frontend files (helper, index, form, hook, tests), 1 config (vercel.json).

**Non-Changes Confirmed**: Zero diff in `calculateSavingsContributions`, `calculateMonthsRemaining`, `calculateRoundedShares`. Ceiling-warning logic untouched.

Ready for sdd-verify.
