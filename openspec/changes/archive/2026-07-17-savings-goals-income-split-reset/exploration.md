# Exploration: Reset-to-income-split allocation logic for savings goals

## Current State

**"Reset to Income Split" is a purely client-side, no-op-on-the-server operation.** Confirmed by design in `docs/adr/0001-savings-calculator-client-side-projection.md` (ADR-0001, Accepted): "The undo feature for 'Reset to Income Split' is also purely local state — it restores the pre-reset custom values from in-memory snapshot without a server read." The projection formula is deliberately duplicated client/server and must be kept in sync per the ADR.

Trigger → state → save flow:
- UI button: `frontend/src/features/savings/SavingsGoalForm.tsx:34-45` inside `AllocationOverridesEditor` — calls `session.resetToIncomeSplit()`.
- Reducer: `frontend/src/entities/savings-goal/useContributionSession.ts:78-85`, case `"resetToIncomeSplit"` — captures `preResetSnapshot = state.overrideAmounts`, then sets `overrideAmounts: {}`. It does NOT compute anything; it just clears local overrides so the UI falls back to displaying each member's already-server-computed `item.proportionalAmount` (`overrideAmounts[memberId] ?? item.proportionalAmount`, SavingsGoalForm.tsx:69).
- `undoReset` (useContributionSession.ts:86-94) restores `preResetSnapshot`.
- **Save always writes an explicit euro amount**: both `saveSession` (useContributionSession.ts:194-217) and `handleSubmit` (SavingsGoalForm.tsx:174-200) call `savingsGoalApi.upsertContribution(goalId, memberId, overrideAmounts[id] ?? proportionalAmount)` for EVERY member, even after a reset with no manual edits. This upserts a `SavingsGoalContribution` row with a fixed `customAmount`, which permanently sets `isOverridden = true` for that member (a contribution row now exists in DB). There is no "delete contribution" endpoint to truly revert to dynamic/live income-split tracking — once saved, that amount is frozen until the user resets+saves again. This conflicts with "should always reset to the CURRENT percentage allocations" if income/shares change later without the user revisiting Reset.

**Server-side computation that ALREADY does most of what the user wants** (no ceiling, no goal-in-time framing beyond simple months):
- `api/_src/services/savings.ts` `calculateSavingsContributions(targetAmount, currentAmount, targetDate, members[{id,share}])` (lines 14-73): computes `remainingToSave = targetAmount - currentAmount`, `monthsRemaining` (calendar-month diff from now to targetDate, floor semantics — 0 or negative months means "due now, one lump sum"), `totalMonthlyNeed = remainingToSave / monthsRemaining`, then splits by each member's income `share` (0..1) with a "remainder absorption" pass onto the highest-share member so cents sum exactly. **No ceiling/cap exists anywhere in this function.**
- `SavingsService.getGoalsForGroup` (savings.ts:122-211) calls the above, merges in persisted `SavingsGoalContribution` overrides, and returns each goal's `breakdown[]` = `{memberId, share, percentage, proportionalAmount, actualAmount, isOverridden}`. `varianceMonths`/`isNever`/`projectedDate` are derived via `shared/logic/projection.ts` `calculateProjectedMonths`/`addMonths` (ceil-based).
- Client mirrors the projection math for instant feedback: `computeProjectedMonths` in `useContributionSession.ts:37-50` (per ADR-0001).

### Data model (prisma/schema.prisma)

- `GroupMember.income: Decimal(12,2)` — the ONLY income field, group-scoped, monthly. No per-goal or per-member percentage field is stored anywhere; percentages are always derived live from `income` via `calculateIncomeShares` (api/_src/services/calculation.ts:16-18) → `shared/logic/rounding.ts` `calculateRoundedShares` / `largestRemainderAllocate` (exact-sum-to-100 largest-remainder/Hamilton apportionment, issue #128/#129 invariants documented in comments).
- `SavingsGoal` — id, groupId, name, icon, targetAmount, currentAmount, targetDate, timestamps. No urgency/priority/ceiling fields.
- `SavingsGoalContribution` — `@@unique([goalId, memberId])`, `customAmount: Decimal` — the ONLY persisted override, a flat euro amount (not a percentage, not a ceiling flag). This is what "isOverridden" is derived from.

### Remaining balance / available-to-save per member

**Not computed anywhere in the savings module** — confirmed, matches the user's own assumption. HOWEVER, an equivalent concept already exists elsewhere and is NOT wired to savings:
- `api/_src/handlers/transactions.ts` (dashboard summary handler, lines ~396-471) computes per member, across ALL categories: `totalRemainingQuota` = sum of `calculateCategoryBalances(...).remainingQuota` (income-weighted category quota minus that member's expenses in the category, adjusted for transfers) and `totalBudgetedQuota`. Returned as `membersSummary[].remainingQuota` / `.budgeted`.
- `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx` displays exactly `member.income - member.budgeted` per member — i.e., "disposable income after committed category budgets." This is the closest existing analog to the user's "remaining balance" / ceiling concept, but it lives entirely in the dashboard/transactions handler and is invisible to the savings service. `calculateCategoryBalances` itself lives in `api/_src/services/calculation.ts:65-134` and needs `{category, members, expenses, transfers}` inputs the savings service does not currently fetch.
- Building the requested ceiling means either (a) reusing/extracting this category-balance computation inside `SavingsService`, or (b) shipping remaining-balance data down as part of the goal breakdown response so the client can compute the ceiling locally (more consistent with ADR-0001's "client owns projection, server recomputes on save" philosophy, since remaining-balance-per-member requires category/expense/transfer data the client doesn't have today).

### Target date / time-to-goal usage

Already used server-side exactly as the user describes (see `calculateSavingsContributions` above): total needed ÷ months-remaining-to-targetDate, then split by income share. This is the base to extend with a ceiling, not something to build from scratch.

### Ceiling/cap logic

**None exists today.** `calculateSavingsContributions` has zero awareness of what a member can actually afford; a member's `share` can produce any `monthlyContribution` value with no bound.

### Existing warning/messaging UI conventions (for the new "you're over your ceiling" message)

- `frontend/src/features/savings/SavingsGoalList.tsx` badge pattern (lines 70-151): `isNever` → tone `"expense"` (red)/label "Never"; `isLate` (`varianceMonths > 0`) → tone `"transfer"` (amber)/label `Delayed Nmo`; else → tone `"income"` (green)/"On Track". Mirrored by `projectedColorClass` (red/amber/emerald text).
- Form-level error banner: `SavingsGoalForm.tsx:315-319` — small bordered box, `text-brand-expense`/`dark:text-red-400`, shown when local `error` state is set.
- Dashboard `BudgetCategories.tsx` uses "101% spent" percentage-over-budget copy as an over-budget precedent.
- No existing per-member "can't afford this" warning pattern in savings UI — this would be new UI, but should follow the Badge tone convention above rather than inventing a new visual language.

### Related tests

- `frontend/src/entities/savings-goal/useContributionSession.test.ts` — covers `resetToIncomeSplit` (captures `preResetSnapshot`, clears `overrideAmounts` to `{}`), `undoReset`, and `forecastColor` (green/amber/red/neutral vs `targetMonths`). No ceiling/remaining-balance/warning coverage (doesn't exist).
- `frontend/src/features/savings/SavingsGoalForm.test.tsx` / `SavingsGoalList.test.tsx` — form save flow and list badges (Never/Delayed/On Track) fixtures using `varianceMonths`/`isNever`. No click-test for the "Reset to Income Split" button itself (only the hook is unit-tested).
- `api/_tests/logic/savings.test.ts` — unit tests for `calculateSavingsContributions` (proportional split by share, zero members, goal-already-reached) and `calculateProjectedMonths`/`addMonths` (normal, zero/negative contributions → Infinity + 100yr date, BUG-035/036). No ceiling coverage.
- `api/_tests/integration/savings.test.ts` — integration tests for the goal CRUD/contribution endpoints; no reset/ceiling/remaining-balance assertions.

### Open questions / ambiguities to raise before writing a proposal

1. **Persistence semantics conflict**: Save always writes a fixed `customAmount` contribution row for every member (even freshly reset ones), so `isOverridden` becomes permanently true and future income changes won't auto-reflect. The user wants reset to "always reset to the CURRENT percentage allocations" — does that mean Save-after-Reset should DELETE the contribution row (need a new endpoint) instead of upserting the computed value, so the member stays dynamically tracked? Or is "reset" only meant to affect the current editing session?
2. **Where does the ceiling computation run — client or server?** ADR-0001 established client-side projection specifically to avoid server roundtrips on every keystroke. The remaining-balance/ceiling data requires category+expense+transfer data that today only exists in the dashboard's transactions handler and isn't shipped to the savings goal endpoints. Extending `getGoalsForGroup`'s response to include each member's remaining balance (read-only, computed at goal-fetch time) seems most consistent with the existing architecture — confirm this is acceptable, and confirm the ADR should be extended/superseded rather than silently violated.
3. **Definition of "remaining balance of each user" for the ceiling** — is it exactly the dashboard's `income - budgeted` figure (i.e., money not already committed to category budgets), or something narrower/broader (e.g., also subtracting existing savings-goal commitments to OTHER goals, or actual spend-to-date vs budgeted)? The dashboard concept doesn't currently account for a member's contributions to other savings goals.
4. **Ceiling breach UX**: user wants "allow the value over the ceiling so the user can fix it manually" — does the warning block Save, or just show inline (non-blocking) messaging? Is it per-member (each member sees their own breach) or surfaced once for the whole goal card?
5. **"Reset to Income Split" scope**: today Reset clears ALL member overrides in the session at once. Should the new ceiling-aware version still be a single "reset all" action, or does per-member ceiling capping imply some members get auto-capped while others don't, needing per-member partial-reset semantics?
6. **Rounding/remainder interaction**: `calculateSavingsContributions` currently absorbs rounding remainder onto the highest-share member. Once a ceiling can redirect a capped member's shortfall elsewhere (to "always try to arrive on time"), the remainder-absorption + redistribution logic will need a new, more complex algorithm (iterative capping akin to `largestRemainderAllocate` but with per-member max constraints) — worth scoping as its own design task.
7. **Historical/monthly recompute**: does the ceiling need to be recalculated freshly each time the goal list is fetched (since spend changes month to month), or only recalculated on explicit Reset click? Given `SavingsGoalContribution` freezes amounts once saved (see Q1), this interacts directly with staleness.

### Ready for Proposal

Yes, with the above 7 open questions surfaced to the user in a clarifying-questions round first — several (Q1, Q2, Q6) materially change scope/effort (new DELETE-contribution endpoint, new shared cross-service remaining-balance computation, and a capped-allocation algorithm beyond simple largest-remainder) and should be resolved before `sdd-propose` scopes the change.
