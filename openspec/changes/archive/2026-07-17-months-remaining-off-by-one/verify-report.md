# Verification Report — months-remaining-off-by-one (issue #159)

**Verdict**: PASS WITH WARNINGS (0 CRITICAL, 3 WARNING, 1 SUGGESTION)
Ready for `sdd-archive`: YES.

### Mode
Full artifact set present (spec + design + tasks + apply-progress). Strict TDD active — independently re-ran all test commands rather than trusting apply-progress narrative.

### Task Completeness (13/13)
All 13 tasks across 5 phases verified against actual diff (not just narrative):
- 1.1-1.3: `calculateMonthsRemaining` added/exported in `shared/logic/projection.ts` (`rawDiff - 1`) — confirmed via `git diff HEAD`.
- 2.1-2.3: `api/_src/services/savings.ts` divisor site swapped to helper; `monthsRemaining > 0` lump-sum guard untouched — confirmed.
- 3.1-3.2: `api/_src/services/savings.ts` `getGoalsForGroup` `targetMonths` swapped to helper; `projectedMonths`/`varianceMonths` formulas untouched — confirmed.
- 4.1-4.2: `frontend/.../useContributionSession.ts` IIFE replaced with helper call; `ceilingWarnings` block (lines 179-186) byte-identical to pre-fix, and `useContributionSession.test.ts` has ZERO diff (confirmed via `git diff HEAD`) — matches spec's non-regression requirement exactly.
- 5.1-5.3: full suite + typecheck run — see below.

### Independent Test Execution (re-run by verifier, not trusted from report)
| Command | Result |
|---|---|
| `npm test -w api -- projection` | 12/12 passed |
| `npm test -w api -- savings` (3 files matched) | 23/23 passed |
| `npm test -w api` (full) | 117/117 passed, 26 files |
| `npm test -w frontend -- useContributionSession` | 18/18 passed |
| `npm test -w frontend` (full) | 249/249 passed, 42 files |
| `npm run typecheck` (turbo: api+frontend+shared) | clean, 0 errors |
| `npx eslint` on all 6 changed files | 0 issues |

All figures match apply-progress claims — independently confirmed, no discrepancy in pass/fail counts.

### Spec Compliance Matrix (5 requirements / 11 scenarios)
| Requirement / Scenario | Status | Evidence |
|---|---|---|
| Single Source of Truth — identical output across 3 call sites | PASS | Same `calculateMonthsRemaining` imported at all 3 sites (source diff); only one definition exists in repo (grep confirmed no orphaned duplicate formula remains, except the unrelated `projectedMonths` forward-projection calc which is intentionally different semantics per design) |
| Ceiling-Warning: code path untouched | PASS | `useContributionSession.ts:179-186` diff shows zero change |
| Ceiling-Warning: existing tests pass unmodified | PASS | `useContributionSession.test.ts` has 0 diff; 18/18 green |
| Divisor E1 (multi-month, 150/100) | PASS | `api/_tests/logic/savings.test.ts` fixture updated + green |
| Divisor E2 (exactly 1 month out → lump sum) | PASS | New boundary test, green |
| Divisor E3 (within current month → lump sum) | PASS | New boundary test, green |
| Variance/Forecast: on-pace not misclassified | WARNING | Only verified at pure-function level (`projection.test.ts` E4/E5 axis test proving `calculateProjectedMonths === calculateMonthsRemaining` at the boundary); no runtime test exercises actual `varianceMonths`/`forecastColor` computation at that exact E4/E5 boundary through `SavingsService.getGoalsForGroup` or the hook. Underlying formulas are trivial one-liners and confirmed unchanged, so risk is low, but strictly the scenario lacks a direct covering test at the integration layer. |
| Variance/Forecast: API/frontend agree | PASS (structural) | Both sites import the same shared helper — architecturally guaranteed, not independently cross-tested, but no separate implementations exist to drift |
| Contribution Split Fixture corrected | PASS | 150/100 asserted and green |

### Design Coherence
Implementation matches design doc exactly: helper signature, location, all 3 call-site edits, boundary semantics (negative returns unclamped, `> 0` guard preserved), and the documented deviation (an undocumented second hardcoded 120/80 cascade in `api/_tests/integration/savings.test.ts`, discovered during apply and corrected to 150/100) is legitimate, necessary, and correctly fixed — verified by diff and passing tests.

### Issues

**CRITICAL**: None.

**WARNING**:
1. Spec scenario "On-pace goal is not misclassified as delayed" (E4/E5) is only covered by a pure-function-level test, not a runtime test through the actual `varianceMonths`/`forecastColor` code paths at the exact boundary. Low risk (trivial unchanged arithmetic) but technically an undertested scenario per strict spec-to-test mapping.
2. `api/_tests/integration/savings.test.ts`'s `targetDate` fixture (`new Date(); setMonth(+5)`) is not anchored to day=1, unlike the hardened `api/_tests/logic/savings.test.ts` fixture. The design's optional flakiness-hardening note wasn't applied symmetrically to this second file that hit the identical raw-diff-5 cascade discovered during apply.
3. apply-progress's TDD Cycle Evidence table attributes the "21/21 baseline → 23/23 green" count for tasks 2.1-2.3 to `api/_tests/logic/savings.test.ts` alone; that file actually contains only 14 tests. The 21/23 figures correspond to the combined 3-file `-- savings` pattern test run (logic + integration + handler tests), not the single named file. Minor reporting imprecision — the aggregate numbers themselves are accurate (independently reproduced) but mis-attributed to one file in the table.

**SUGGESTION**:
1. All changes remain uncommitted in the working tree (`git status` shows the 6 core files as modified with no commit yet) — not a defect, but relevant before archive/PR packaging.

### Assertion Quality Audit
No tautologies, ghost loops, or smoke-test-only patterns found in new/modified test code (`projection.test.ts` new describe block, `savings.test.ts` new tests, `integration/savings.test.ts` corrected assertions). All assertions are concrete numeric value checks tied to real production-code calls.

### Final Verdict
**PASS WITH WARNINGS**. 0 CRITICAL issues block archive. 3 WARNINGs are informational/robustness notes for the record, not blockers. Recommend `sdd-archive`.
