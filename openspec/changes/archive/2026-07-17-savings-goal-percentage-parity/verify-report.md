# Verification Report — Issue #160

**Change**: savings-goal-percentage-parity
**Verdict**: PASS (0 CRITICAL, 0 WARNING new; 1 pre-existing non-blocking WARNING carried over)

### IMPORTANT — correction to launch-prompt premise
The prompt framing this task claimed "no spec, design, or tasks artifacts were ever created for this change." This is FALSE per Engram (project calculoides): the full SDD chain already exists and was already archived on 2026-07-17 — proposal id #29, spec id #31, design id #32, tasks id #33 (14/14), apply-progress id #34 (14/14 + 1 follow-up), verify-report id #35 (PASS, independent re-run), archive-report id #36. Commit 508f701 (2026-07-17 18:21:44 +0000) IS the commit produced by that already-completed chain — this is not a fix committed outside SDD. This verify pass is therefore a redundant re-verification of an already-archived change, re-run independently in a later session as instructed.

### Independent checks performed this session
1. Read `api/_src/services/savings.ts` (current state) — `calculateSavingsContributions` widened `members` param to include optional `percentage`; `weight = m.percentage != null ? m.percentage / 100 : m.share` (line 58); absorb-index selection still keyed on `share` (line 48, unchanged). Matches proposal's chosen approach (feed percentage/100 into money math, keep absorption keyed on share).
2. Read `api/_tests/logic/savings.test.ts` — contains the 3 SDD-added tests: percentage-vs-share divergence (72.75/177.25), exact issue #160 repro (291.00/709.00, sum invariant + tolerance check), and remainder-absorption follow-up test (67.33/110.99/155.01, sum=333.33). All assert real values with production-code call, no tautologies, no ghost loops.
3. Read `shared/logic/rounding.ts` `calculateRoundedShares` — untouched; only consumer is `api/_src/services/calculation.ts` and `api/_tests/logic/rounding.test.ts`, neither touched by this fix. Category-budget share/percentage split behavior confirmed unaffected.
4. `npm test -w api` → 26 test files, 120 tests, all passed, exit 0.
5. `npm run typecheck -w api` → clean, exit 0.
6. `npm run typecheck -w shared` → clean, exit 0.
7. Golden/snapshot sweep repo-wide: zero `.snap` files (`fd -e snap`), zero real `toMatchSnapshot` usages (only vitest's own `.d.ts` type defs matched). Old mismatched dollar amounts (72.5/177.5) appear only once, in a code comment documenting the pre-fix buggy behavior — not a hard-coded stale assertion. No golden-test regression risk.
8. `git diff --stat` on the fix commit: only `api/_src/services/savings.ts` (+11/-2), `api/_tests/logic/savings.test.ts` (+125 lines new), and `README.md` (+81, docs addition) changed — scope confined to the savings boundary as the proposal required.

### Verdict
**PASS.** The fix genuinely resolves issue #160: displayed percentage and computed dollar amount now derive from the same 1dp `percentage` value (weight = percentage/100), reconciling exactly for the repro case (29.1% → 291.00 of 1000, not the old share-only 290.00). Remainder absorption still targets the highest-`share` member, unchanged. `calculateRoundedShares` and category-budget math are provably untouched (file diff shows zero changes; only consumer/tests for it remain green). No golden/snapshot regression risk found repo-wide.

**Safe to close issue #160**: Yes.

**Non-blocking note (carried over from prior verify #35)**: the reconciliation test's tolerance check uses percentage-point tolerance (≤0.1) rather than a literal dollar one-cent tolerance mentioned in spec text; both reconcile exactly (0 error) in the current test case so this doesn't affect correctness — cosmetic wording nuance only.
