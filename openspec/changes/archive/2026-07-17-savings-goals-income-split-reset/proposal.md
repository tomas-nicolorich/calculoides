# Proposal: Ceiling-aware "Reset to Income Split" for savings goals

## Intent
Today "Reset to Income Split" splits `remainingToSave / monthsRemaining` by live income share with zero awareness of what each member can actually afford. Members can be handed a monthly contribution that exceeds their disposable income, giving a plan that looks fine but is unaffordable in practice. Make Reset ceiling-aware for **awareness only**: keep computing each member's share exactly as today, but compare it against that member's real affordability ceiling and surface a non-blocking per-member warning when the computed share exceeds the ceiling. The ceiling never changes anyone's allocation — it is purely a warning signal.

## Scope
### In scope
- Ceiling per member = dashboard "remaining balance" = `income − budgeted category commitments` (via `calculateCategoryBalances`), computed live at fetch/reset time.
- Ship each member's ceiling alongside the existing goal breakdown from the savings service (read-only).
- Per-member warning when a member's computed income-split share exceeds their ceiling. The allocation value is untouched — still the plain proportional share.
### Out of scope (confirmed non-goals)
- Any change to the split algorithm: no capping, no redistribution, no water-filling. `calculateSavingsContributions` is unchanged.
- Any goal-level/aggregate "won't reach target" warning derived from ceiling logic. (The existing `isLate`/`isNever` variance-from-target-date badges in `SavingsGoalList.tsx` are unrelated pre-existing behavior and stay as-is; they are not part of this change.)
- Persisting the ceiling in the DB (always live-computed).
- Blocking/validating Save against the ceiling — Save stays fully manual; the user can still manually edit/override any allocation.
- Accounting for other savings goals' commitments in the ceiling.
- Changing freeze-on-save / override-locking behavior. No delete-contribution endpoint.

## Capabilities
### New Capabilities
None (no new spec-level capability; extends existing savings-goal behavior).
### Modified Capabilities
- `savings-goals`: Reset-to-income-split now surfaces a non-blocking per-member "over affordability ceiling" warning. Allocation math is unchanged.

## Approach
**Decision 1 — where the ceiling lives (confirmed: server computes, ships down; client stays ADR-0001-compliant).** Extend `SavingsService.getGoalsForGroup` to reuse `calculateCategoryBalances` (category+expense+transfer inputs) and attach `remainingBalance` per member to each goal's breakdown. Client reset stays a pure in-memory recompute in `useContributionSession`, consistent with ADR-0001 (no server roundtrip per Reset click). Tradeoff: introduces cross-service coupling — the savings service now fetches category/expense/transfer data it never touched; mitigated by extracting/reusing the existing dashboard computation rather than duplicating it. ADR-0001 is extended (additive read-only data dependency), not violated. *(User-approved as-is.)*

**Decision 2 — per-member ceiling comparison (warning only, no algorithm change).** No new allocation-calculation function is needed and `calculateSavingsContributions` is **unchanged**. Reset keeps computing each member's share exactly as today: `remainingToSave / monthsRemaining`, split by live income share via `calculateIncomeShares`. Separately, after the existing split, compare each member's computed share against that member's ceiling (`income − budgeted`, shipped per Decision 1). This is a pure `computedShare > ceiling` check per member — a thin client-side (or thin server-side) display check. If a member's share exceeds their ceiling, flag THAT member only; their allocation value stays the plain proportional share (even though it exceeds the ceiling), and remains manually editable/overridable as always. No capping, no redistribution of any shortfall, no interaction between members. There is no aggregate goal-level "won't reach target" warning from this logic.

**Decision 3 — per-member warning UI.** Follow the existing `SavingsGoalList.tsx` Badge tone convention as the styling pattern (amber/warning tone), but scope it to the member row only: a lightweight inline text/badge near an over-ceiling member's row. No goal-level aggregate warning is added. No new UI subsystem.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `api/_src/services/savings.ts` | Modified | Attach per-member `remainingBalance`/ceiling to each goal's breakdown by wiring in `calculateCategoryBalances`. No split-function change. |
| `api/_src/services/calculation.ts` | Modified (likely) | Expose/reuse `calculateCategoryBalances` for the savings service |
| `frontend/src/entities/savings-goal/useContributionSession.ts` | Modified | Carry per-member ceiling + derived over-ceiling warning flag; reset recompute unchanged (no water-filling) |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | Modified | Consume ceilings; render per-member over-ceiling inline warning on the member row |
| `frontend/src/features/savings/SavingsGoalList.tsx` | None expected | Existing `isLate`/`isNever` badges are unrelated pre-existing behavior and stay as-is |
| `prisma/schema.prisma` | None expected | Ceiling is live-computed; no new fields |
| Tests: `api/_tests/logic/savings.test.ts`, `api/_tests/integration/savings.test.ts`, `useContributionSession.test.ts`, `SavingsGoalForm.test.tsx` | Modified | Cover ceiling in response, per-member over-ceiling warning trigger, and that allocation values are unchanged |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cross-service coupling (savings now depends on category/expense/transfer data) | High | Reuse existing `calculateCategoryBalances`; keep read-only; document coupling (ADR-0001 amendment) |
| Client/server projection drift (ADR-0001) | Med | Keep ceiling data server-shipped; recompute stays client-side per ADR; add mirrored tests |
| Ceiling staleness vs freeze-on-save | Low | Ceiling live at fetch; Save freezing behavior intentionally unchanged |
| Extra query cost on goal fetch | Low | Single batched fetch reusing dashboard path |

## Edge cases (warning triggers)
- Multiple members simultaneously over their ceiling → each shows their own independent per-member warning; no interaction or redistribution between them.
- Ceiling below a member's computed/current allocation → warn for that member; allocation left as-is.
- Income share of 0% → member gets 0 share; 0 never exceeds a non-negative ceiling, so no warning.
- Goal already overdue / `monthsRemaining ≤ 0` → existing lump-sum semantics; ceilings likely all breached; warn per member, values unchanged.
- Negative/zero remaining balance (over-budget member) → ceiling ≤ 0; any positive share exceeds it, so that member warns.
- Single member group → the one member simply warns if over ceiling; nothing else to compare against.

## Rollback Plan
Feature is additive and non-persistent (no migration). Revert the touched service/UI changes; `getGoalsForGroup` returns to prior breakdown shape and Reset falls back to plain income-split. No DB state to unwind.

## Dependencies
- Existing `calculateCategoryBalances` (category/expense/transfer computation) available to the savings service.

## Success Criteria
- [ ] Reset computes each member's share exactly as today (no capping/redistribution); `calculateSavingsContributions` unchanged.
- [ ] Each member whose computed share exceeds their ceiling shows an independent, non-blocking per-member warning; allocation value stays the plain proportional share.
- [ ] Members not over their ceiling are unaffected — no warning, no changed allocation.
- [ ] Per-member over-ceiling warning follows the existing Badge tone convention, scoped to the member row.
- [ ] Save behavior (freeze-on-save, per-member `customAmount` row, manual override) is unchanged.
- [ ] Ceiling is never persisted and never blocks Save.

## Resolved questions
- ADR-0001 amendment: **Resolved — add it.** The user confirmed ADR-0001 should carry an amendment documenting the additive category/expense/transfer data dependency (ceiling for warning display only, not a server-side allocation decision, not a reversal of client-side projection). Added as `## Amendment (2026-07-17)` in `docs/adr/0001-savings-calculator-client-side-projection.md`.
