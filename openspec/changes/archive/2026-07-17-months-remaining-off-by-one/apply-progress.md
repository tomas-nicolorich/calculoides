# Apply Progress: Fix months-remaining off-by-one (issue #159) — COMPLETE (13/13)

**Mode**: Strict TDD (RED → GREEN → REFACTOR)
**Delivery**: single PR on feat/savings-ceiling-aware-reset, all work uncommitted/unpushed

## Completed Tasks (13/13)

All tasks across 5 phases completed per design and tasks artifacts. Work implements the full `calculateMonthsRemaining` shared helper approach with all 3 call sites updated.

- [x] Phase 1 (1.1-1.3): `calculateMonthsRemaining` added to `shared/logic/projection.ts`, 4 boundary tests RED then GREEN
- [x] Phase 2 (2.1-2.3): API divisor site (#1) swapped, fixture corrected 120/80 → 150/100
- [x] Phase 3 (3.1-3.2): API comparison site (#2) swapped, full API suite 117/117 green
- [x] Phase 4 (4.1-4.2): Frontend comparison site (#3) swapped, non-regression 18/18 green
- [x] Phase 5 (5.1-5.3): Full suite verification, all tests pass, typecheck clean

**Test Results**: api 117/117, frontend 249/249, typecheck clean. No regressions.

**Files Changed**: `shared/logic/projection.ts`, `api/_src/services/savings.ts` (2 call sites), `frontend/src/entities/savings-goal/useContributionSession.ts` (1 call site), `api/_tests/logic/projection.test.ts`, `api/_tests/logic/savings.test.ts`, `api/_tests/integration/savings.test.ts`

**Non-Changes Confirmed**: No edits to ceiling-warning logic, reducer state, or frontend spec. Only numeric amounts shift upward (correct).

Ready for sdd-verify.
