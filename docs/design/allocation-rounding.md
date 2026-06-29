# Allocation & Rounding — Percentages, Income, Budget

Status: design agreed (grilling session 2026-06-28). Not yet implemented.

## Goal

- Member-share **percentages**: always 1 decimal, sum to **exactly 100.0** per category.
- **Money** (income / budget / expenses / quotas): always 2 decimals; member quotas sum to **exactly the category budget**.
- Leftover from rounding distributed by **largest-remainder (Hamilton)**, not dumped on one member.

## Domain decisions

### D1 — Percentages are income-derived, per-category
Per-member % comes from income proportion, renormalized over the category's
member subset (restricted categories → renormalized over their subset only).
No manual per-category override. Consequence: within one category, highest %
== highest income (renormalization is monotonic).

### D2 — Member eligibility per category
Effective members of a category = `restricted-subset ∩ (income > 0)`.

- Member with **income = 0** → excluded from the category member list **and**
  from allocation. Not shown in bars/quotas; shown **greyed/struck in the member
  picker** with hint "No income — not included" (discoverable, not invisible).
- **All** members of a category have income 0 → category renders an **empty
  state**: "No members with income in this category" + CTA to set member income.
  No calculation runs.
- Optional global banner only if *every* category is empty (fresh group).
- Because zero-income members are excluded, any category that calculates always
  has total weight > 0. **No divide-by-zero, no equal-split fallback.**
- **Single member** (with income > 0) → 100.0 / whole budget, naturally.

### D3 — Largest-remainder allocator (shared)
One function, called twice with different quantum:

```
largestRemainderAllocate(weights, total, quantum, tiebreak) -> values[]
```

Algorithm:
1. raw_i = weight_i / Σweights × total
2. floor each to `quantum`
3. deficit = (total − Σfloored) / quantum   // integer count of increments
4. sort members by fractional part (raw − floored) **descending**
5. +quantum to the top `deficit` members

- **Percentages:** total = 100.0, quantum = 0.1, weights = income.
- **Money quota:** total = category budget, quantum = 0.01 (one cent),
  weights = **precise income share** (D4). Applied independently from the % pass.

**Tiebreak** (equal fractional parts, e.g. equal incomes): highest raw weight
wins; final fallback = stable member order (id/createdAt) for determinism.
Same rule for both passes, applied independently.

### D4 — Quota driven by precise share
`quota` is computed from the **precise** income share, not the displayed 1-decimal
%, then reconciled to budget via the cent-quantum allocator.

**Invariant (by design): the displayed percentage is purely cosmetic.** It feeds
nothing downstream — money derives from precise shares, independently rounded. So
`displayed % × budget ≠ displayed quota` in general, and that is intentional.
Upside: percentage-rounding bugs can **never** cause money bugs. Do not "fix" this
by reconciling the two — that reintroduces the coupling we removed.

### D5 — Single source of truth
Backend is authoritative. API returns canonical `percentage` (1dp) and `quota`
(2dp) per member per category. Frontend **renders** those values; it does **not**
recompute. No live preview while editing. Delete the frontend's parallel math
(`dashboardUtils.ts` `categoryMemberShare`, which today computes 1dp % that don't
sum to 100). The shared allocator lives backend-side; frontend never imports it.

### D6 — Scope of the 1-decimal rule
Only **member-share %** → 1 decimal. **Progress %** (spent/budget,
`dashboardUtils.ts:13`) stays **integer** — coarse fill indicator.

## Implementation constraint (must-have)

**Allocate on scaled integers, never floats.** 0.1 and 0.01 are not representable
in floating point; float arithmetic breaks the exact-sum invariant and makes the
`deficit/quantum` increment count off-by-one.

- Percentages → work in **tenths** (integer): allocate to sum 1000, divide by 10
  on the way out.
- Money → work in **integer cents**: budget is `Decimal(12,2)` → cents first,
  allocate to sum `budgetCents`, divide by 100 out.

The current `rounding.ts:53` (`Number(rawShare*10000).toFixed(10)`) is a scar from
this exact problem — replace with integer arithmetic.

## Worked example (largest remainder absorbs)

Incomes A=2000, B=1750, C=1750 (Σ=5500). Raw %:
- A = 36.3636…  → floor 36.3, remainder beyond floor = .0636 → frac .636
- B = 31.8181…  → floor 31.8, remainder beyond floor = .0181 → frac .181
- C = 31.8181…  → floor 31.8, remainder beyond floor = .0181 → frac .181

Σfloored = 99.9 → deficit = 1 increment (0.1). Largest fractional part = A
(.636) > B = C (.181). **A gets +0.1 → 36.4.** Result: A 36.4, B 31.8, C 31.8 = 100.0.

> Note: the fractional part is measured **after** flooring to the 0.1 quantum, so
> B's tail is .181 (= .0181 / 0.1), not .818. An earlier draft mis-read this and
> claimed B absorbs → 36.3/31.9/31.8; that is arithmetically wrong.

## Worked example (non-highest member absorbs)

The algorithm is largest-remainder, so the +0.1 does **not** always land on the
highest %. Incomes A=5032, B=2484, C=2484 (Σ=10000). Raw %:
- A = 50.32  → floor 50.3, frac .2
- B = 24.84  → floor 24.8, frac .4
- C = 24.84  → floor 24.8, frac .4

Σfloored = 99.9 → deficit = 1. Largest fractional part = B and C (.4) > A (.2).
Tie between B and C → tiebreak: equal raw weight → stable order → B.
**B gets +0.1 → 24.9.** Result: A 50.3, B 24.9, C 24.8 = 100.0 — the increment went
to a **non-highest** member. Highest-% only wins as a *tiebreak*.

## Display sites to fix (verified inventory)

- `frontend/src/shared/ui/money/MemberBar.tsx:77` — `${(m.share).toString()}%` → `toFixed(1)`.
- `frontend/src/shared/ui/money/MemberBar.tsx:109` — `({m.share}%)` → `toFixed(1)`.
- `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx:220` — already `toFixed(1)` ✓.
- Currency via `formatCurrency` (2dp) ✓; progress % integer ✓ — unchanged.
- `MemberBar.tsx:83` uses share for bar **geometry**, not display text — leave.

## Backend touch points

- `shared/logic/rounding.ts` — replace `calculateRoundedShares` floor-then-dump with
  the integer largest-remainder allocator; 1dp percentages.
- `api/_src/services/calculation.ts` — `resolveRelevantShares` (subset renorm),
  quota from precise share + cent-quantum reconciliation to budget.
- `api/_src/services/budget.ts` — category balances exclude income=0 members,
  emit empty-state signal when subset empty.
- Income input already validated `z.number().nonnegative()` (validation.ts:14) ✓.

## Open at implementation time (not blockers)
- Exact field for stable tiebreak order (member `id` vs `createdAt`).
- Shape of the empty-state / partial-exclusion signal in the API response.
