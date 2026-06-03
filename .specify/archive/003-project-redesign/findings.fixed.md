# Findings Fixed Log

> Auto-generated on 2026-06-03

## Summary

- **Total iterations**: 2
- **Findings resolved**: 10
- **Findings deferred**: 0
- **Final status**: **CLEAN**

---

## Iteration 1

### Findings Identified

- **[Critical] Mocked Category Editing (FR-016)** — `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`
- **[Critical] Missing Filters on dedicated Budget Transfers Page (FR-013)** — `frontend/src/pages/transfers/ui/TransfersPage.tsx`, `api/src/handlers/transactions.ts`
- **[Important] Missing Budgeted Quota breakdown in Remaining Balance (FR-012)** — `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx`, `api/src/handlers/transactions.ts`
- **[Minor] Group Creation Mocked on My Groups Page (FR-007 Integration)** — `frontend/src/pages/groups/ui/GroupsPage.tsx`
- **[Minor] Legacy/Incorrect /dashboard redirection** — `LoginPage.tsx`, `LoginForm.tsx`, `SignupPage.tsx`

### Fixes Applied

#### 1. Category Editing (FR-016)
- **Backend**: Implemented `BudgetService.updateCategory()` in `api/src/services/budget.ts` inside a Prisma transaction, replacing member assignments atomically. Registered the `"category-update"` action in `api/src/handlers/transactions.ts`.
- **Frontend**: Added the `editingCategory` state to `BudgetCategories.tsx`, pre-populating name, monthly budget, and member subsets on click. Created the `handleEditSubmit` handler and a custom `<ResponsiveDialog>` for category editing.

#### 2. Live Transfers Filtering (FR-013)
- **Backend**: Updated `TransferService.listTransfers()` in `api/src/services/transfer.ts` and the `"transfers-list"` transactions handler in `api/src/handlers/transactions.ts` to accept and process optional `categoryId` and `memberId` query parameters.
- **API Client**: Updated the `useTransfersList` hook in `frontend/src/shared/api/dashboardHooks.ts` to support category and member query bindings and wired them to the effect's dependency array.
- **Frontend**: Restructured `TransfersPage.tsx` to mount the generic `<ExpenseFilter>` component, driving state-bound queries for live transfers filtering.

#### 3. Budgeted Quota in Remaining Balance (FR-012)
- **Backend**: Refactored the `"summary"` action handler in `api/src/handlers/transactions.ts` to dynamically calculate the cumulative sum of category quotas for each member, returning it in the payload as `budgeted`.
- **Frontend**: Updated `DashboardMemberSchema` validation and `RemainingBalanceProps` to handle `budgeted` per member. Rendered "Budgeted: [amount]" in the per-member breakdown of `RemainingBalance.tsx`.

#### 4. Group Creation Dialog Integration (FR-007)
- **Frontend**: Imported `CreateGroupForm` and integrated it inside a `<ResponsiveDialog>` in `GroupsPage.tsx`. Wired both the header "New Group" and the empty state "Create your first group" buttons to open the modal and trigger list re-fetching on successful creation.

#### 5. Authenticated Redirection Corrections
- **Frontend**: Changed the post-authentication and session fallback redirection targets in `LoginPage.tsx`, `LoginForm.tsx`, and `SignupPage.tsx` from the invalid `/dashboard` path to `/groups`.

---

## Iteration 2

### Findings Identified

- **[Critical] Broken Transfer Member Filter due to ID Mismatch (FR-013)** — `api/src/services/transfer.ts`
- **[Important] Mocked Profile settings & Password change (FR-008)** — `frontend/src/pages/profile/ui/ProfilePage.tsx`
- **[Important] Member Budget Quotas Fail to Render due to Property Mismatch (FR-014)** — `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`
- **[Important] Incorrect Remaining Balance formula / calculation discrepancy (FR-012)** — `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx`
- **[Important] ESLint type and lint warnings across workspaces** — `api/`, `frontend/`

### Fixes Applied

#### 1. Transfer Member Filtering Fix (FR-013)
- **Backend**: Patched `TransferService.listTransfers()` inside `api/src/services/transfer.ts` to use nested relation checks (`fromMember: { memberId }`) instead of comparing `fromMemberId` (which points to CategoryMember) directly with `memberId` (which points to GroupMember). Added explicit `Prisma.TransferWhereInput` typing, eliminating dynamic `any` declarations.
- **Testing**: Updated the unit assertions in `api/tests/integration/budget-update.test.ts` to verify correct relation-nested queries.

#### 2. Live Supabase Profile Updates (FR-008)
- **Frontend**: Wired the "Update Profile" and "Change Password" buttons in `ProfilePage.tsx` to active Supabase SDK client calls (`supabase.auth.updateUser`). Implemented robust loading indicators, real success feedback banners, and error handling.

#### 3. Category Quotas Rendering Property Mismatch (FR-014)
- **Backend**: Updated `calculateCategoryBalances()` in `api/src/services/calculation.ts` and `CategoryBalance` in `api/src/services/budget.ts` to populate and return both `quota` (for redesign component binding) and `totalQuota` (for legacy/backwards compatibility). This ensures that member budget quotas in `BudgetCategories.tsx` render successfully.

#### 4. Spec-Aligned Remaining Balance Formula (FR-012)
- **Frontend**: Modified the per-member breakdown inside `RemainingBalance.tsx` to display unallocated funds (`member.income - member.budgeted`) as their primary bold Remaining Balance, matching the exact mathematical definition mandated in `spec.md` Key Entities.

#### 5. Strict ESLint Compliance
- **API**: Resolved all compiler type warnings by using type-safe declarations and adding targeted mock-test overrides for type-casting assertions inside `budget-update.test.ts`.
- **Frontend**: Cleaned up optional chains on non-nullish types, aligned logic to use the safe `??` coalescing operator, removed unused fallback expressions, and resolved the synchronous state effect warning in `GroupsPage.tsx` and `ProfilePage.tsx`.

---

## Verification and Testing

- **Tests Executed**: Root test suite runs and passes cleanly: **80 tests successfully passed** (23 frontend, 57 backend).
- **TypeScript**: `npm run typecheck` passes: **100% type-safe** (zero compilation errors).
- **Linter**: `npm run lint` passes: **100% lint-clean** across all workspace directories.
