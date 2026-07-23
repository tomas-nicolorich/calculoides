# Design: Fix months-remaining off-by-one in savings income-split allocation (issue #159)

Note: sdd-spec ran in parallel; `sdd/.../spec` not yet in Engram at design time. Designed directly from proposal (#21) + exploration (#20) against current source on `feat/savings-ceiling-aware-reset`. No spec-level requirement change (behavior-correcting bugfix).

## Technical Approach
Extract one pure helper `calculateMonthsRemaining(now, targetDate)` into `shared/logic/projection.ts` (already exports `calculateProjectedMonths`/`addMonths`, already imported by both api and frontend via `from "shared"`). It encodes the `-1` adjustment once and replaces all 3 drift-prone inline calendar-diff formulas. Approach 1 from the proposal (single source of truth); Approach 2 (3x inline `-1`) rejected — repeats the copy-paste failure mode that caused the bug.

## Load-bearing decision: does `-1` mean the same thing at the divisor site (#1) as at the comparison sites (#2/#3)? YES — one helper, one signature (option a).

**Why they are the same axis.** All three start from the identical raw expression `rawDiff = (target.Y-now.Y)*12 + (target.M-now.M)`, which ignores day-of-month and over-counts by 1 (it treats both the partially-elapsed current month and the deadline month as full contribution opportunities). Site #1 uses it as a divisor: `remaining / opportunities = per-period amount`. Sites #2/#3 compare it against `projectedMonths = Math.ceil(remaining / rate)` — which INVERTS the same relation back to a count of contribution periods. Divisor and comparison operand live on one axis: "number of monthly contribution opportunities until the deadline." So the same `rawDiff - 1` is correct for all three, with no per-site adjustment.

**Boundary values traced:**
- E1 (repro, divisor #1): now 2026-07-17, target 2027-08 → rawDiff 13. Buggy 27100/13=2084.62 → collects ~27915 ≠ 30000 (under). Fixed 27100/12=2258.33 → ~30000. `-1` correct; deadline offers 12 opportunities.
- E2 (mid-month, 1 out, #1): now 07-17, target 2026-08-05 → rawDiff 1. Fixed adjusted=0 → `> 0` false → existing lump-sum fallback fires (correct for imminent deadline; no negative divisor).
- E3 (same-month, #1): rawDiff 0 → adjusted -1, still `> 0` false → lump sum. No regression, no negative division (guard is `> 0`).
- E4 (on-pace, #2/#3): goal contributing exactly site-#1 rate → projectedMonths = adjustedMonths. Before fix targetMonths=rawDiff → variance -1 ("1mo ahead" for an on-time goal) and slack-green. After fix targetMonths=adjusted → variance 0 (correctly on time), tight green at `<=` boundary.
- E5 (just-behind, proves #3 needs `-1`): needs 13 periods, deadline offers 12 (rawDiff 13). projectedMonths 13. Before: 13<=13 → green (WRONG). After: 13<=12 → amber (CORRECT). This count-vs-count case is the strongest evidence the comparison operand is on the contribution-opportunity axis, identical to the divisor.

Negative returns are intended and safe everywhere: #1 guards `> 0`→lump sum; #2/#3 a negative targetMonths correctly reads as behind pace (amber/red, large positive variance). No clamping.

## Helper signature / location
`shared/logic/projection.ts`:
```ts
export function calculateMonthsRemaining(now: Date, targetDate: Date): number {
  return (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth()) - 1;
}
```
Takes `now` as a param (pure, deterministic for unit tests); both api sites already have `now` in scope.

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `shared/logic/projection.ts` | Modify | Add `calculateMonthsRemaining`; export it |
| `api/_src/services/savings.ts:6,30-33` | Modify | Add to `from "shared"` import; replace inline diff with helper (site #1). Downstream `> 0` branch unchanged |
| `api/_src/services/savings.ts:260-262` | Modify | `targetMonths = calculateMonthsRemaining(now, targetDate)` (site #2). `projectedMonths`/`varianceMonths` unchanged |
| `frontend/src/entities/savings-goal/useContributionSession.ts:2,158-167` | Modify | Add to `from "shared"` import; replace IIFE with `activeGoal ? calculateMonthsRemaining(new Date(), new Date(activeGoal.targetDate)) : 0` (site #3) |
| `api/_tests/logic/savings.test.ts:11-36` | Modify | 4-month divisor: 1000/4=250 → expect 150/100 (was 120/80); fix comment `-> 250/month total` |

## Ceiling-warning confirmation (explicit)
`useContributionSession.ts:182-190` `ceilingWarnings` compares `overrideAmounts[id] ?? b.proportionalAmount` vs `b.remainingBalance` — it does NOT read `monthsRemaining`/`targetMonths`. Code path UNAFFECTED. Only the numeric value of `b.proportionalAmount` (server-derived from site-#1 `totalMonthlyNeed`) shifts upward, so warnings fire more often — the mathematically correct cascade, not a code regression.

## Testing Strategy
| Layer | What | Approach |
|-------|------|----------|
| Unit | `calculateMonthsRemaining` | Direct: rawDiff-1 across E1-E3 incl. negative/zero returns |
| Unit | site #1 divisor | Correct 150/100 fixture (E1 repro yields 2258.33/mo) |
| Unit | on-pace / just-behind comparison | NEW boundary test locking E4 (variance 0, green) and E5 (amber) — mitigates the proposal's flagged asymmetry risk |
| Regression | frontend ceiling + variance tests | Re-run; fixtures hardcode `proportionalAmount`/`varianceMonths`, remain green |

Test hardening note (optional): `savings.test.ts` builds target via `setMonth(+5)`; on 31-day anchors month-rollover can shift rawDiff. Recommend anchoring day=1 to remove latent flakiness; not required by the fix.

## Threat Matrix
N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout
No data migration. Single atomic commit (helper + 3 call sites + test fixture); revert = full rollback. Release note: existing goals with `monthsRemaining>0` will show higher required contributions and may surface new (correct) ceiling warnings.

## Open Questions
None blocking. Spec (parallel) expected to align; if it diverges on the comparison semantics, E5 is the arbitration case.
