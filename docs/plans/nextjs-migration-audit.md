# Next.js migration audit: nextjs-integration vs main

Scope: login, signup, forgot-password, reset-password, complete-profile, and the group dashboard only. Rest of the app (expenses, transfers, groups, members, savings page itself) not yet audited.

Playwright (installed locally, `@playwright/test` 1.62) was used for a live runtime comparison of calculoides.com (prod) vs `localhost:3000` (local dev) with the demo1@demo.com account, in addition to the codebase diff against `main`.

**Local dev environment note**: `.env.local` only had `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`VITE_SUPABASE_*` (leftovers from the old Vite app). The Next.js client code needs `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` — without them the Supabase client silently fails to init in the browser and login hangs forever with zero feedback (a live demonstration of the missing-try/catch blocker below). Fixed for this machine; worth adding to setup docs/`.env.example` so the next person doesn't hit the same wall.

## Confirmed duplication bug (reported by user, now verified live)

- [x] `app/(app)/dashboard/[groupId]/DashboardClient.tsx:9,55` renders `SavingsGoalList` inside the dashboard grid. `main` never did this — savings goals are a dedicated page only. **Live-verified**: prod's dashboard has no savings section at all (page ends after Budget Transfers); local's shows a "Current Goals" section with full goal cards.
- [x] `SavingsGoalList`/`SavingsGoalForm` under `dashboard/_widgets/` are dead/duplicate code — the real `/savings` page (`app/(app)/savings/[groupId]/SavingsClient.tsx`) reimplements the list inline instead of reusing them.

## Blockers

- [x] `app/(auth)/login/LoginForm.tsx` — no try/catch around the Supabase sign-in call. On network error/thrown exception, "Signing in..." spinner sticks forever with no error message. `main` wrapped this in try/catch/finally.
- [x] `app/(auth)/signup/SignupForm.tsx` — same missing try/catch pattern around `signUpAndProvisionProfile`.
- [x] `app/(auth)/reset-password/ResetPasswordForm.tsx` — same missing try/catch around `supabase.auth.updateUser`.
- [x] `app/(auth)/complete-profile/page.tsx` — pure stub (`<p>Profile setup coming soon.</p>`), no form, no logic, nothing routes to it. `main` had a real profile-incomplete gate via `AuthProvider`'s `profileIncomplete` state (driven by a 404 from `/api/users/me`). Route is currently unreachable dead code.

## Significant

- [x] `app/(app)/dashboard/[groupId]/page.tsx:58-71` — **RSC boundary violation**: `prefetchQuery` calls `SummaryService.getGroupSummary`, `BudgetService.listCategoriesWithBalances`, and `SavingsService.getGoalsForGroup` directly on the server and dehydrates the raw results into `<HydrationBoundary state={dehydrate(queryClient)}>`, which is passed to the client tree. The service results still contain live Prisma `Decimal` instances (`monthlyBudget`, transfer `amount`, savings-contribution `customAmount`) that were never coerced to `Number`. React logs repeatedly: *"Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported."* Confirmed live via browser console on local dev (20+ occurrences on one dashboard load). Renders correctly today by luck/fallback coercion, but it's an unsupported serialization path — fix by mapping `Decimal` → `Number`/string in the service layer (the pattern already used correctly at `lib/server/services/savings.ts:264`) before returning from `getGroupSummary`/`listCategoriesWithBalances`/`getGoalsForGroup`.
- [x] `app/(app)/dashboard/[groupId]/_widgets/BudgetCategories.tsx` — no `isOwner` prop; delete option renders for every member instead of owner-only (server still rejects it via `isGroupOwner` in `lib/actions/category.ts:117-118`, so not a security hole, but a dead-end UX regression).
- [x] `app/(app)/dashboard/[groupId]/_components/QuickAddExpense.tsx:44-54` — doesn't pass `defaultPayerId` to `ExpenseForm` (the prop still exists and is honored there). "Paid By" is blank every time instead of defaulting to the current user like `main` did.
- [x] `BudgetCategories` cards are missing the per-category icon (house/cart/car/plug/bag/film/heart) that prod shows next to every category name. Live screenshot comparison: prod has a colored icon badge per row, local has none.

## Minor polish

- [x] Login form missing password-visibility (eye icon) toggle present in `main`.
- [x] Dashboard header dropped the reload button, member `AvatarGroup`, and mobile `AddExpenseFab` present in `main`'s `DashboardHeader`.
- [x] `DashboardClient.tsx:36` — "0 members" flashes briefly before `summary` resolves (falls back to `?? 0` instead of hiding).

## Verified as parity/superset — no action needed

- Forgot-password flow (`ForgotPasswordForm.tsx`) is a faithful 1:1 port of `main`, including anti-enumeration handling.
- `IncomeOverview`, `RemainingBalance`, `RecentExpenses` dashboard widgets: full parity with `main`.
- `BudgetTransfers` widget: superset of `main` (adds inline "Add Transfer" form; `main` only linked out to the transfers page).

## Suggested fix order

1. Error handling on login/signup/reset-password (one shared pattern, three files)
2. `complete-profile` stub
3. Dashboard savings-goal duplication + dead widget code
4. Prisma `Decimal` RSC serialization leak (dashboard page.tsx)
5. `BudgetCategories` owner gate + missing category icons
6. `QuickAddExpense` default payer
7. Minor polish items
8. Document `NEXT_PUBLIC_SUPABASE_*` requirement in setup docs / `.env.example`
