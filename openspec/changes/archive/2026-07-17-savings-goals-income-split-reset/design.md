# Design: Ceiling-aware "Reset to Income Split" (warning-only)

## Technical Approach
Ship each member's live affordability ceiling (`income − budgeted`, identical to the dashboard `RemainingBalance` widget and the `summary` handler's per-member `budgeted`) alongside the existing goal breakdown. The split algorithm is UNCHANGED (`calculateSavingsContributions` untouched, no capping/redistribution). The over-ceiling signal is a pure derived DISPLAY flag computed client-side: `effectiveShare > remainingBalance` per member. ADR-0001 stays intact (client keeps in-memory recompute; ceiling is an additive read-only field on the initial fetch, already amended 2026-07-17).

## Architecture Decisions

### Decision: Where the ceiling is computed and shipped
| Option | Tradeoff | Decision |
|---|---|---|
| SavingsService inlines the per-category `calculateCategoryBalances` loop | Duplicates the exact loop already living in the `summary` handler (transactions.ts L411-471) | Rejected |
| Extract a pure helper `calculateMemberBudgetedTotals(members, categories, expenses, transfers)` into `calculation.ts`; both SavingsService and `summary` handler reuse it | Small refactor of summary handler; single tested source of truth; satisfies proposal "reuse, not duplicate" | **Chosen** |

Helper returns `{ memberId, budgeted }[]` (sum of `totalQuota` across non-restricted + linked categories, transfers included, zero-income excluded). Ceiling = `income − budgeted`. SavingsService fetches categories/expenses(month)/transfers(month) like the summary handler and calls the helper. Refactoring `summary` to reuse it is IN this PR to keep one implementation; if blast radius is a concern it may stay handler-local, but the shared helper is mandatory.

### Decision: Response DTO shape
Attach `remainingBalance: number` to each `breakdown[]` entry (next to the member's share). No new top-level field; no aggregate. `getGoalsForGroup` return shape gains exactly this one number per member.

### Decision: No output Zod schema change
`savings-goals-list` returns `getGoalsForGroup` raw (no response Zod validation). `SavingsGoalSchema` (validation.ts L76) is an ENTITY/INPUT schema; the breakdown is never Zod-validated outbound. Input schemas (`CreateSavingsGoalSchema`, `UpsertContributionSchema`) unchanged. **No shared/validation.ts change.**

### Decision: Client flag is a derived selector, NOT reducer state
The reducer only holds `overrideAmounts` and has no access to `breakdown`/ceiling. Compute `ceilingWarnings: Record<string, boolean>` in the hook body (like `localProjectedMonths`/`forecastColor`), NOT in the `resetToIncomeSplit` case. Reducer, `ContributionSessionState`, and actions stay unchanged — guarantees `overrideAmounts` and computed splits are never mutated by the warning. After Reset, `overrideAmounts = {}`, so effective = `proportionalAmount` (the income-split share) and the flag reflects the reset shares automatically.

## Data Flow
    Prisma (GroupMember.income, Category, Expense, Transfer)
       → SavingsService.getGoalsForGroup
       → calculateMemberBudgetedTotals (reuses calculateCategoryBalances)
       → ceiling = income - budgeted  →  breakdown[].remainingBalance
       → savings-goals-list  →  useSavingsGoals (React Query, live each fetch)
       → SavingsGoal.breakdown  →  useContributionSession
       → derived ceilingWarnings[memberId] = (override ?? proportional) > remainingBalance
       → SavingsGoalForm member row → amber Badge
Ceiling is live-computed on every fetch, never cached/persisted separately; no extra staleness surface (freeze-on-save unchanged).

## File Changes
| File | Action | Description |
|---|---|---|
| `api/_src/services/calculation.ts` | Modify | Add pure `calculateMemberBudgetedTotals`; export it |
| `api/_src/services/savings.ts` | Modify | Fetch categories/expenses/transfers; attach `remainingBalance` per breakdown member |
| `api/_src/handlers/transactions.ts` | Modify | `summary` reuses the new helper (dedup) |
| `frontend/src/entities/savings-goal/index.ts` | Modify | Add `remainingBalance: number` to `ContributionBreakdown` |
| `frontend/src/entities/savings-goal/useContributionSession.ts` | Modify | Derive+expose `ceilingWarnings`; reducer/state unchanged |
| `frontend/src/features/savings/SavingsGoalForm.tsx` | Modify | Render amber Badge per over-ceiling member row |
| `prisma/schema.prisma` | **None** | Ceiling live-computed; no field added (explicit non-change) |
| `shared/validation.ts` | **None** | Breakdown not Zod-validated outbound (explicit non-change) |

## Interfaces / Contracts
```ts
interface ContributionBreakdown { /* ...existing... */ remainingBalance: number; }
// hook adds:
ceilingWarnings: Record<string, boolean>; // memberId → effectiveShare > remainingBalance
```
UI: `<Badge tone="transfer" size="sm" uppercase>Over Balance</Badge>` (amber, same convention as `isLate` "Delayed"); title/aria "Exceeds available balance". DESIGN.md: amber `brand-transfer #F59E0B` = warnings.

## Testing Strategy (Strict TDD)
| Layer | What | Cases |
|---|---|---|
| Unit `api/_tests/logic/savings.test.ts` | `calculateMemberBudgetedTotals`/ceiling | no categories → ceiling=income; restricted category subset; zero-income excluded; over-budget → negative ceiling; transfers shift budgeted |
| Integration `api/_tests/integration/savings.test.ts` | list returns `breakdown[].remainingBalance` = income−budgeted; equals summary value for same data; allocation values UNCHANGED by addition |
| Frontend `useContributionSession.test.ts` | derived `ceilingWarnings`: share>ceiling true; share<=ceiling false; after reset uses proportional; 0% income share → false; ceiling 0/negative + positive share → true; multiple members flagged independently; overdue lump-sum → true; `overrideAmounts` never mutated |
| Frontend `SavingsGoalForm.test.tsx` | amber badge renders only for flagged member row; correct tone; input value unchanged |

## Threat Matrix
N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout
No migration. Additive, non-persistent; revert restores prior breakdown shape.

## Open Questions
None.
