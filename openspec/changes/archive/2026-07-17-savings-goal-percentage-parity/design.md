# Design: Savings-goal allocation/percentage parity (issue #160)

## Technical Approach
Reconcile displayed member `percentage` with computed `monthlyContribution` in the savings-goal income-split path by driving the money math from the finer 1dp `percentage` value (÷100) instead of the coarser 2dp `share`. The fix is confined to `calculateSavingsContributions` in `api/_src/services/savings.ts`. `calculateRoundedShares` (shared/logic/rounding.ts) and the wrapper `calculateIncomeShares` (calculation.ts) stay untouched — the category-budget `share`/`percentage` split is intentional and preserved (spec: Category-Budget Rounding Non-Regression). The remainder-absorption invariant (contributions sum exactly to `totalMonthlyNeed`) is retained.

## Architecture Decisions

### Decision: Weight source at the savings boundary
**Choice**: Inside `calculateSavingsContributions`, compute each member's proportional weight as `m.percentage / 100`, falling back to `m.share` only when `percentage` is absent.
**Alternatives considered**: (a) Reconcile at the caller (`getGoalsForGroup`) by post-adjusting amounts — rejected: spreads the invariant across two functions, harder to test. (b) Change `calculateRoundedShares` to emit a single value — rejected: violates the hard category-budget constraint.
**Rationale**: Single source of truth (`percentage`) for both the number the UI shows and the money it derives. Production always supplies `percentage` (via `RoundedShare`), so money math is always percentage-driven; the `share` fallback is a defensive default that keeps existing share-only unit tests green.

### Decision: Signature shape / backward compatibility
**Choice**: Widen the members param to `{ id: string; share: number; percentage?: number }[]`; weight = `m.percentage != null ? m.percentage / 100 : m.share`.
**Alternatives considered**: Require `percentage` (drop `share`) — rejected: forces churn on existing money-math unit tests that pass only `share` and would need every case rewritten; also misaligns with spec wording "whenever both are available."
**Rationale**: Minimal, backward-compatible, matches the spec's MODIFIED requirement. The call site already passes full `RoundedShare` objects (`incomeShares`), so no caller edit is needed.

### Decision: Remainder-absorption target unchanged
**Choice**: Keep selecting the absorb index via `m.share > maxShare` (highest-share member, first-on-tie).
**Rationale**: Spec requires leftover cents absorbed onto the highest-share member "unchanged from current behavior." Highest share == highest percentage member (both monotonic in income), so weighting by percentage while selecting absorb target by share is consistent and preserves exact prior tie behavior.

## Data Flow
    getGoalsForGroup
      └─ calculateIncomeShares → RoundedShare[] {id, share, percentage}   (unchanged)
           └─ calculateSavingsContributions(target, current, date, shares)
                weight_i = percentage_i / 100        ← changed (was share_i)
                base_i   = floor(totalMonthlyNeed * weight_i * 100)/100
                remainder = totalMonthlyNeed − Σbase  → added to highest-share member
           └─ finalContributions {percentage, proportionalAmount}   → UI reconciles

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `api/_src/services/savings.ts` | Modify | Widen param to include optional `percentage`; use `percentage/100` as weight; keep share-based absorb index and remainder logic |
| `api/_tests/logic/savings.test.ts` | Modify | Add reconciliation test (issue #160 repro); assert `monthlyContribution/totalMonthlyNeed == percentage/100` within 1-cent tolerance per member; keep existing share-only cases |
| `shared/logic/rounding.ts` | Unchanged | MUST NOT change (category-budget constraint) |
| `api/_src/services/calculation.ts` | Unchanged | Wrapper already returns percentage |

## Interfaces / Contracts
```ts
export function calculateSavingsContributions(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
  members: { id: string; share: number; percentage?: number }[],
): MemberContribution[]
```

## Testing Strategy
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Percent-dollar reconciliation (repro: 29.1%); 2-member 291/709 on 1000; exact-sum invariant; single/zero-member; zero-income equal split | Extend `api/_tests/logic/savings.test.ts` with share+percentage members; assert 1-cent tolerance and Σ == totalMonthlyNeed |
| Unit | Category-budget non-regression | Existing `calculateRoundedShares`/category tests must pass unchanged |
| Integration | `getGoalsForGroup` breakdown amounts reconcile with displayed percentage | Existing suite green; amounts shift by cents (expected) |

## Edge Cases
- **Remainder cents**: percentages sum to exactly 100.0 ⇒ weights sum to exactly 1.0; per-member floor leftover absorbed onto highest-share member — invariant preserved.
- **Ceiling-aware reset (this branch)**: `remainingBalanceById`/ceiling warnings in `getGoalsForGroup` consume the corrected `proportionalAmount`/`actualAmount`; no code change there, but a cent-level amount shift could flip a warning exactly at a boundary — verify no integration regression, treat corrected amounts as source of truth.
- **Zero remainingToSave**: early return of 0 contributions — percentage unused, safe.
- **Zero/single member**: `[]` / single member gets 100% weight — share and percentage both 1.0, identical result.
- **Zero-income group**: `totalIncome==0` yields equal share and equal-split percentage; `percentage/100` stays consistent.

## Threat Matrix
N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout
No migration. Single-file revert of `api/_src/services/savings.ts` (+ its test) rolls back; no schema/data change.

## Open Questions
None.
