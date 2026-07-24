# Proposal: Fix months-remaining off-by-one in savings income-split allocation (issue #159)

## Intent
The calendar-month difference used to schedule savings contributions over-counts by one: it treats the current partially-elapsed month and the deadline month as full contribution opportunities. The divisor is one too large, so required monthly contributions are understated and goals silently under-collect (repro: target 30000, current 2900, Aug-2027 from Jul-2026 → buggy 27100/13≈2084.62 under-collects to ≈27915; correct 27100/12≈2258.33). The same unadjusted formula is copy-pasted at 3 sites and has already drifted un-reviewed once — the duplication is the root cause, not just this instance.

## Scope
### In Scope
- Correct the off-by-one at all 3 confirmed sites: `savings.ts:31-33` (divisor for `totalMonthlyNeed`), `savings.ts:260-262` (`targetMonths`→`varianceMonths`), `useContributionSession.ts:158-167` (`targetMonths`→`forecastColor`).
- Extract a single shared `calculateMonthsRemaining(now, targetDate)` helper into `shared/` and replace the 3 inline formulas with it.
- Update `api/_tests/logic/savings.test.ts:11-36` fixtures from buggy 5-month-divisor values (120/80) to correct 4-month-divisor values (150/100).

### Out of Scope
- `shared/logic/projection.ts` `calculateProjectedMonths` — different semantics (forward `Math.ceil` projection); confirmed correct.
- Ceiling-warning flagging logic (`useContributionSession.ts:182-190`) — no shared code path; only downstream numeric amounts shift (correctly).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None (behavior-correcting bugfix; no spec-level requirement change).

## Approach
**Proposed direction: Approach 1 — shared helper (single source of truth).** Centralizing the `-1` month-arithmetic in `shared/` follows the existing convention (`shared/` already exports `calculateProjectedMonths`/`addMonths`, imported by both `api` and `frontend`). This eliminates the duplication that caused the bug class, so a future fix happens once. Fallback: Approach 2 (3x inline `-1` patch) if the team prefers minimal diff over de-duplication — rejected as default because it repeats the exact failure mode.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|---------------|
| Test fixture (120/80→150/100) mistaken for regression | High | Update fixtures in-change; call out explicitly in apply/verify |
| Semantic asymmetry: `-1` divisor (#1) vs comparison operand (#2/#3, compared against `Math.ceil` forward projection) | Med | **Design phase MUST pin correct boundary-value semantics per site** — do not assume identical; add on-pace boundary test |
| New (correct) ceiling warnings surface for existing goals | Med | Release note / QA pass; not a code regression |

## Rollback Plan
Revert the single commit; helper extraction + call-site swaps + test-fixture update are one atomic, self-contained change on `feat/savings-ceiling-aware-reset`.

## Success Criteria
- [ ] All 3 sites use the shared helper; no inline calendar-diff duplication remains.
- [ ] `savings.test.ts` asserts 150/100 and passes; repro case yields 2258.33/mo.
- [ ] Design resolves boundary semantics for divisor vs comparison uses.
