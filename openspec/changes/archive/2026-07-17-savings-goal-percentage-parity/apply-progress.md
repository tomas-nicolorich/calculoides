# Apply Progress: Savings-goal allocation/percentage parity (issue #160)

**Mode**: Strict TDD (RED → GREEN → REFACTOR)

## Completed Tasks (14/14 original + 1 follow-up)

All 15 tasks complete. Implemented in single PR (size well under 400-line budget).

- [x] Phase 1 (1.1-1.4): Reconciliation tests RED then GREEN (72.75/177.25 split + exact 291/709 repro case + sum invariant)
- [x] Phase 2 (2.1-2.4): Weight source changed from `share` to `percentage/100` with fallback; all 25 tests pass
- [x] Phase 3 (3.1-3.4): Non-regression verification; category-budget rounding untouched; call sites need no edits
- [x] Phase 4 (4.1-4.2): Full suite verification; 120 tests pass (was 119), typecheck clean
- [x] Follow-up (F.1-F.6): Added remainder-absorption test to exercise genuine non-zero-remainder branch (closes verify-phase CRITICAL coverage gap); verified via standalone math that 333.33 target with 333.31 pre-absorption sum requires the absorption to reach 333.33 final

**Test Results**: api 120/120, frontend 267/267. All spec scenarios pass.

**Files Changed**: `api/_src/services/savings.ts` (widened param, weight formula), `api/_tests/logic/savings.test.ts` (3 new tests including remainder-absorption)

**Non-Changes Confirmed**: No edits to ceiling-warning logic, reducer state, rounding.ts, or frontend spec. Only numeric amounts shift by cents where remainder absorption applies.

**Arithmetic Correction**: Task 1.1 initially stated expected values 72.50/177.50, but the formula `250 * 0.291 = 72.75` (not 72.50). Corrected to 72.75/177.25 in the actual test. (The old 72.50/177.50 was actually the pre-fix share-only result, which would have produced a false-positive RED.)

Ready for re-verify.
