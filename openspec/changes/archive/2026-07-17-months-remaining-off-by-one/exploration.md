# Exploration: months-remaining off-by-one (GitHub issue #159)

## Current State

`calculateSavingsContributions()` (`api/_src/services/savings.ts:31-33`) computes a raw calendar-month difference and divides `remainingToSave` by it directly with no adjustment:

```
const monthsRemaining =
  (targetDate.getFullYear() - now.getFullYear()) * 12 +
  (targetDate.getMonth() - now.getMonth());
```

This value is used as a divisor (`remainingToSave / monthsRemaining`) whenever `monthsRemaining > 0`, otherwise the code already falls back to paying the full remaining amount immediately (`monthsRemaining <= 0` branch, unchanged since BUG-028). Because the calendar diff over-counts (it treats the current partially-elapsed month, plus the deadline month itself, as full contribution opportunities), the divisor is one too large, understating the required monthly contribution. Repro from the issue: target 30000, current 2900, targetDate Aug 2027 from "now" July 2026 → buggy `27100/13 ≈ 2084.62/mo`, which under-collects (`2084.62*12+2900 ≈ 27915 ≠ 30000`). Correct is `27100/12 ≈ 2258.33/mo`.

The exact same unadjusted formula is duplicated two more times:

1. `api/_src/services/savings.ts:260-262` inside `getGoalsForGroup`, as `targetMonths`, which feeds `varianceMonths = projectedMonths - targetMonths` (line 266), returned to the client and rendered by `frontend/src/features/savings/SavingsGoalList.tsx:32,149` ("Delayed Nmo" / late flag).
2. `frontend/src/entities/savings-goal/useContributionSession.ts:158-167`, also as `targetMonths`, compared against `localProjectedMonths` to derive `forecastColor` (green/amber/red) at lines 169-176.

All three are still present verbatim in current code on `feat/savings-ceiling-aware-reset` — the issue's root cause and file/function references are accurate, no drift since filing (only line numbers were added here; the issue itself didn't cite line numbers).

`calculateProjectedMonths` (`shared/logic/projection.ts:1-10`) is a distinct, correctly-scoped formula: `Math.ceil((targetAmount - currentAmount) / totalMonthly)`, a forward projection from the current contribution rate — it does not compute a calendar deadline diff and is confirmed out of scope, matching the issue's explicit exclusion.

### Constraint: ceiling-warning flagging must not regress

The "Ceiling-aware Reset to Income Split" feature (prior SDD cycle, `sdd/savings-goals-income-split-reset/*`) added `ceilingWarnings` in `useContributionSession.ts:182-190`. It is a pure derived value comparing each member's effective contribution (`overrideAmounts[id] ?? proportionalAmount`) against `remainingBalance` — it does **not** read `monthsRemaining`/`targetMonths` at all, so the off-by-one fix does not touch that comparison's code path directly.

However, `proportionalAmount` is populated server-side from `calculateSavingsContributions`'s `totalMonthlyNeed`, which location #1 fixes. Correcting the divisor will **increase** monthly contribution amounts for any goal with `monthsRemaining > 0` (smaller denominator → larger quotient), which will make `ceilingWarnings` fire *more* often, not less — this is the mathematically correct cascade (accurate higher required contributions are more likely to exceed a member's ceiling), not a defect in the ceiling logic itself. Existing frontend `ceilingWarnings` tests (`useContributionSession.test.ts:241-471`) all use hardcoded `proportionalAmount`/`remainingBalance` fixture values directly in the mock `SavingsGoal.breakdown`, not derived from the buggy formula, so those tests remain valid and green regardless of the fix — they are not testing the regression surface. Confirm this explicitly in verify/apply: ceiling-warning *logic* is untouched, but real numeric warnings will shift for existing goals once contribution amounts become accurate.

### Affected Areas

- `api/_src/services/savings.ts:31-33` (`calculateSavingsContributions`) — divisor for `totalMonthlyNeed`; must apply `-1` before the existing `> 0` immediate-payment branch check (verified: for a 1-calendar-month-out target, `-1` yields `0`, correctly triggering the existing immediate lump-sum fallback — no new negative-divisor risk).
- `api/_src/services/savings.ts:260-262` (`getGoalsForGroup`, `targetMonths`) — feeds `varianceMonths` (line 266), returned in the API response and rendered by `SavingsGoalList.tsx`.
- `frontend/src/entities/savings-goal/useContributionSession.ts:158-167` (`targetMonths`) — feeds `forecastColor` (lines 169-176).
- `api/_tests/logic/savings.test.ts:11-36` — existing unit test for `calculateSavingsContributions` hardcodes 5-months-away / 200 total-monthly expectations (120/80 split) computed from the *buggy* formula; this test's expected values must be updated as part of the fix (4-month divisor → 250 total-monthly → 150/100 split), otherwise it will fail (correctly) after the fix.
- `frontend/src/entities/savings-goal/useContributionSession.test.ts:194-217` — `forecastColor` green-path test (24 months out) — checked, not boundary-sensitive to the `-1` shift, but should be re-run.
- `frontend/src/features/savings/SavingsGoalList.tsx:32,149` and its test — `varianceMonths` display; test fixtures hardcode `varianceMonths` directly (not computed), so unaffected by the fix, but the real computed value changes.
- No other call sites found for `monthsRemaining`/`targetMonths`/`varianceMonths` repo-wide (verified via full-repo grep).

### Approaches

1. **Shared helper function, single source of truth** — extract a `calculateMonthsRemaining(now, targetDate)` (or similar) function into `shared/` (or a local util imported by both `api/_src/services/savings.ts` and `frontend/src/entities/savings-goal/useContributionSession.ts`), encoding the `-1` adjustment once, and replace all 3 inline formulas with a call to it.
   - Pros: Eliminates the duplication that caused this bug class in the first place; a future fix only needs to happen once; testable in isolation.
   - Cons: Touches a shared module boundary (api/frontend both import from `shared/`) — slightly larger diff; need to confirm `shared/` is already an import target for both sides (it is — `shared` package already exports `calculateProjectedMonths`/`addMonths` and is imported by both files, so this follows an existing pattern).
   - Effort: Low-Medium.

2. **Inline `-1` fix at all 3 call sites, no extraction** — apply the exact same `-1` edit independently at each of the 3 locations, per the issue's literal suggestion.
   - Pros: Minimal diff, fastest, matches issue's proposed fix exactly.
   - Cons: Leaves the duplication in place — the next unrelated change to one copy (as apparently already happened once) can silently reintroduce drift between the 3 formulas; issue itself frames the duplication as the underlying design smell.
   - Effort: Low.

### Recommendation

Approach 1 (shared helper). The bug exists *because* the same formula was copy-pasted 3 times and one/some copies drifted un-reviewed; a inline 3x fix (Approach 2) repeats that exact failure mode and only postpones the next regression. `shared/logic/projection.ts` already establishes the convention of centralizing month-arithmetic helpers consumed by both `api` and `frontend` — adding `calculateMonthsRemaining` there is consistent with the existing architecture and low incremental effort over Approach 2.

### Risks

- **Existing unit test must change alongside the fix**: `api/_tests/logic/savings.test.ts` asserts `120/80` monthly-split values computed from the buggy 5-month divisor; the fix will correctly change these to values computed from a 4-month divisor. This is expected, but must be caught explicitly in apply/verify, not treated as an unrelated regression.
- **Semantic asymmetry between locations #2/#3 and #1**: location #1's `monthsRemaining` is a *divisor* feeding a lump-sum vs. spread-payment branch; locations #2/#3's `targetMonths` is a *comparison operand* against `projectedMonths` (itself computed by the untouched, differently-scoped `calculateProjectedMonths`, which counts forward contribution periods via `Math.ceil`). Applying an identical `-1` to all three (as the issue directs) keeps them internally consistent with each other, but the correctness of comparing a `-1`-adjusted calendar deadline against a `Math.ceil`-based forward projection was not independently re-derived here — treat the issue's "apply consistently" directive as the fix contract, but flag this as an assumption to sanity-check with a boundary-value test (e.g., a goal exactly on pace) during design/apply.
- **Downstream ceiling-warning numeric shift**: `ceilingWarnings` logic itself does not change, but real proportional-contribution amounts will increase for goals with `monthsRemaining > 0`, which may surface *new* (correct) ceiling warnings for existing goals in production/staging data. Not a code regression, but worth a release note / QA pass since it's user-visible behavior change tied to the just-shipped ceiling feature.
- **Engram retrieval limitation**: `mem_search`/`mem_get_observation` tools were not available in this exploration's toolset, so the prior `sdd/savings-goals-income-split-reset/*` design artifacts could not be pulled directly from Engram; this exploration instead verified the ceiling-aware reset behavior directly against current source (`useContributionSession.ts`), which is ground truth, but any prior *design rationale* documented only in that Engram topic (not in code/comments) was not cross-checked.

### Ready for Proposal

Yes. Root cause is confirmed accurate against current code (issue is not stale), all 3 locations and their exact current line numbers are identified, the non-regression constraint on ceiling-warning flagging is understood and does not block the fix (no shared code path, only a downstream numeric cascade), and the one existing test requiring an update alongside the fix is identified. Recommend `sdd-propose` proceed with Approach 1 (shared helper) as the default, calling out Approach 2 as the fallback if the team prefers minimal diff over de-duplication.
