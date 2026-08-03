# Tasks: TanStack Query Migration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 (S1) + ~420 (2a) + ~380 (2b) + ~480 (3a) + ~420 (3b) ≈ 1900 total |
| 400-line budget risk | Low (S1) / Medium-High (2a/2b) / High (3a/3b) — none exceed 800 |
| Chained PRs recommended | Yes |
| Suggested split | S1 -> 2a -> 2b -> 3a -> 3b (5 PRs on the tracker) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Dep + client + keys + provider mount + logout clear | PR1 (base: tracker) | `vitest run AuthProvider.test.ts` | Load app, sign in/out once, confirm no console errors, check React Query devtools cache empties on logout | Revert `queryClient.ts`, `queryKeys.ts`, `toErrorMessage.ts`, `queryTestUtils.tsx`, App.tsx/AuthProvider.tsx diffs, `package.json`/lockfile; `useApiQuery.ts` untouched |
| 2a | `apiQueryResult` + `dashboardHooks.ts` + its tests | PR2 (base: PR1 branch) | `vitest run dashboardHooks.test.ts` | Load Dashboard, navigate away/back within 30s, confirm no network tab refetch | Revert `apiQueryResult.ts`, `dashboardHooks.ts`, `dashboardHooks.test.ts`; `useApiQuery.ts` still exists, still imported by savingsHooks/GroupListContext |
| 2b | `savingsHooks.ts` + `GroupListContext.tsx` + their tests + delete `useApiQuery.ts` | PR3 (base: PR2 branch) | `vitest run savingsHooks.test.ts GroupListContext.test.tsx` | Load Savings + Groups pages, confirm cache-served nav; grep repo for `useApiQuery` returns nothing | Revert `savingsHooks.ts`, `GroupListContext.tsx`, their tests, restore `useApiQuery.ts` |
| 3a | `entities/category` + `entities/transfer.create` + `BudgetCategories.tsx`+test + `DashboardPage.tsx` category-delete | PR4 (base: PR3 branch) | `vitest run BudgetCategories.test.tsx dashboard.test.tsx` | Create/edit/delete a category, transfer budget between members, confirm summary+categories refetch | Revert `entities/category/index.ts`, `entities/transfer/index.ts` diff, `BudgetCategories.tsx`+test, `DashboardPage.tsx` diff |
| 3b | Remaining pages/features mutations (`expenses`, `transfers`, `savings`, `groups` pages; `SavingsGoalForm`, `SavingsGoalList`, `InlineAllocationEditor`, `useContributionSession`, `useIncomeSession` consumers, `CreateGroupForm`) | PR5 (base: PR4 branch) | `vitest run` (full suite) | Full manual pass: log expense, transfer, edit savings goal contribution, edit income, create group — each refetches without a passed-down refresh callback | Revert the listed page/feature files; entity modules from 3a stay (used elsewhere) |

## Slice 1 (PR1): Dependency + Client + Keys + Provider Mount + Logout Clear

- [x] 1.1 `npm install @tanstack/react-query -w frontend`; commit root `package-lock.json`. Verify installed `.d.ts` for `useQuery`/`useMutation`/`keepPreviousData`/`setQueryDefaults` return shapes referenced in design (resolves design's open question on unverified v5 API shapes).
- [x] 1.2 Create `frontend/src/shared/api/toErrorMessage.ts`: `toErrorMessage(error: unknown): string | null` (A3).
- [x] 1.3 RED — unit test for `toErrorMessage` (null passthrough, `Error` → message, non-Error → stringified).
- [x] 1.4 Create `frontend/src/shared/api/queryKeys.ts`: `NO_GROUP`, `ExpenseFilters`, `TransferFilters`, `strip()`, `queryKeys` (D6 shape from design).
- [x] 1.5 RED — unit test: `queryKeys.expenses`/`.transfers` hash identically regardless of `undefined` filter presence; `queryKeys.group(g)` is a prefix of `queryKeys.summary(g)`/`.categories(g)`.
- [x] 1.6 Create `frontend/src/shared/api/queryClient.ts`: `BASE_QUERY_DEFAULTS`, `GROUPS_STALE_TIME`, `createQueryClient()` (per-section merge), `setQueryDefaults(queryKeys.groups(), …)`, exported `queryClient` singleton (D2).
- [x] 1.7 RED — unit test: `createQueryClient()` produces D2 defaults (`staleTime: 30_000`, `gcTime: 5min`, `retry: 1`, both refetch flags `true`, no `refetchInterval`); `["groups"]` query defaults override `staleTime` to 5min; per-section merge doesn't drop D2 when `o.queries` partially overrides.
- [x] 1.8 Create `frontend/src/test/queryTestUtils.tsx`: `createTestQueryClient()` (retry:false, gcTime:Infinity, refetch flags false, staleTime:0) + `QueryWrapper` render helper, fresh client per call.
- [x] 1.9 RED — extend `frontend/src/app/providers/AuthProvider.test.tsx`: wrap `AuthProvider` in a `QueryClientProvider` test wrapper (A6, required now — `useQueryClient()` throws without one); add three cases — sign-out with seeded `client.setQueryData` clears cache (D5 shared-device scenario), token refresh (same user id) leaves cache intact, re-emitted `SIGNED_IN` for the same user leaves cache intact.
- [x] 1.10 GREEN — modify `frontend/src/app/providers/AuthProvider.tsx`: add `cacheOwnerIdRef` (A7), call `useQueryClient().clear()` only when session transitions to null or user id changes to a new signed-in user; never on token refresh or same-id re-emit. Confirm 1.9 passes.
- [x] 1.11 GREEN — modify `frontend/src/app/App.tsx`: mount `QueryClientProvider client={queryClient}` outermost, wrapping `BrowserRouter` (D4).
- [x] 1.12 REFACTOR — confirm `npm run typecheck` and `npm test` (frontend) pass; no other test file needs a wrapper yet (nothing else calls `useQueryClient()`).

## Slice 2a (PR2): `dashboardHooks.ts` on `useQuery`

- [x] 2a.1 Create `frontend/src/shared/api/apiQueryResult.ts`: `ApiQueryResult<T>` interface (A1, 5 required fields + optional `isFetching?`/`refetch?`) and `toApiQueryResult<T>(q, fallback)` (A2/A3/A4/A5 mapping).
- [x] 2a.2 RED — `apiQueryResult.test.ts`: maps `isLoading`→`loading`/`isInitialLoading`, `error`→string via `toErrorMessage`, `data ?? fallback`, `refresh()` calls `q.refetch()`, passes through `isFetching`/`refetch`.
- [x] 2a.3 RED — create `frontend/src/shared/api/dashboardHooks.test.ts`: for each of `useDashboardSummary`, `useCategoriesList`, `useExpensesList`, `useTransfersList` — disabled when `groupId === null` (`loading === false`, no fetch call), first load, error → string, cache hit on remount (no second `apiClient.fetch` call), `refresh()` triggers a refetch; for the two paginated hooks (`useExpensesList`, `useTransfersList`) assert page 1 rows persist while page 2 loads (`placeholderData`).
- [x] 2a.4 GREEN — rewrite `frontend/src/shared/api/dashboardHooks.ts`: each hook backed by `useQuery({ queryKey: queryKeys.…, queryFn: ({signal}) => …, enabled: groupId !== null })`, `placeholderData: keepPreviousData` on `useExpensesList`/`useTransfersList` (A8), return `toApiQueryResult(q, fallback)` — signatures unchanged. Confirm 2a.3 passes.
- [x] 2a.5 REFACTOR — remove now-dead local fetcher wiring inside `dashboardHooks.ts`; confirm `frontend/src/widgets/dashboard/*` and `frontend/src/pages/dashboard/*` tests still pass unchanged (they mock the hook module).

## Slice 2b (PR3): `savingsHooks.ts` + `GroupListContext.tsx` + delete `useApiQuery.ts`

- [x] 2b.1 RED — create `frontend/src/shared/api/savingsHooks.test.ts`: `useSavingsGoals` — disabled on `groupId === null`, first load, error → string, cache hit on remount, `refresh()` refetches.
- [x] 2b.2 GREEN — rewrite `frontend/src/shared/api/savingsHooks.ts`: `useSavingsGoals` on `useQuery({ queryKey: queryKeys.savingsGoals(…) })`, `toApiQueryResult`. Confirm 2b.1 passes.
- [x] 2b.3 RED — create `frontend/src/app/providers/GroupListContext.test.tsx`: `useGroupList()` throws outside provider, groups list loads and is cached across remounts, `refresh()` refetches, error → string. Use `QueryWrapper` from `queryTestUtils.tsx`.
- [x] 2b.4 GREEN — modify `frontend/src/app/providers/GroupListContext.tsx` (A9): replace `useApiQuery` with `useQuery({ queryKey: queryKeys.groups(), queryFn: ({signal}) => groupApi.list(signal), enabled: !!user?.id })`, map via `toApiQueryResult`; `GroupListContextValue` shape unchanged. Confirm 2b.3 passes.
- [x] 2b.5 GREEN — delete `frontend/src/shared/api/useApiQuery.ts`; grep confirms zero remaining imports.
- [x] 2b.6 REFACTOR — confirm `ActiveGroupSync.test.tsx` and `frontend/tests/pages/groups.test.tsx` pass unchanged; run full `npm run typecheck`/`npm test`/`npm run lint`.

## Slice 3a (PR4): Category + Transfer Entity Modules + `BudgetCategories.tsx` + Dashboard Category-Delete

- [x] 3a.1 RED — create `frontend/src/entities/category/index.ts` companion test asserting exact endpoint/body for `create` (`POST /transactions?action=category-create&groupId=`), `update` (`POST /transactions?action=category-update&id=`), `delete` (`DELETE /transactions?action=category-delete&id=`) — mirrors the strings currently inlined in `BudgetCategories.tsx`/`DashboardPage.tsx` (A10).
- [x] 3a.2 GREEN — create `frontend/src/entities/category/index.ts`: `categoryApi.{create,update,delete,list}` reproducing the exact D3 endpoint strings/bodies (`list` gains a trailing `signal?: AbortSignal` per the `groupApi.list` precedent, unused until a future read-hook migration).
- [x] 3a.3 GREEN — modify `frontend/src/entities/transfer/index.ts`: add `create(categoryId, fromMemberId, toMemberId, amount)` → `POST /transactions?action=transfer-create`, matching today's inline body exactly (A10).
- [x] 3a.4 RED — rewrite `frontend/src/widgets/dashboard/ui/BudgetCategories.test.tsx`: wrap in `QueryWrapper` (new requirement); assert `useMutation` calls invalidate `queryKeys.group(groupId)` on success for create/update/transfer; **drop the `onRefresh` prop and its call-count assertions** (documented exception — see Notes).
- [x] 3a.5 GREEN — modify `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`: replace the three inline `apiClient.fetch` calls with `useMutation({ mutationFn: categoryApi.create/update, onSuccess: () => qc.invalidateQueries({queryKey: queryKeys.group(groupId)}) })` for create/update, and `transferApi.create` + invalidation for the transfer dialog; drop the `onRefresh` prop, `formLoading`→`mutation.isPending`, `formError`→`toErrorMessage(mutation.error)`. Return the invalidation promise from `onSuccess` for the two dialog-closing mutations (create/update); fire-and-forget for the transfer (no dialog-close race per design). Confirm 3a.4 passes.
- [x] 3a.6 RED — extend `frontend/tests/pages/dashboard.test.tsx`: category-delete invalidates `queryKeys.group(groupId)` instead of calling two `refresh*` closures.
- [x] 3a.7 GREEN — modify `frontend/src/pages/dashboard/ui/DashboardPage.tsx`: replace the inline `apiClient.fetch("/transactions?action=category-delete…")` with `categoryApi.delete` + `useMutation`/`invalidateQueries(queryKeys.group(groupId))`; remove `handleRefresh`/`refreshCategories`/`refreshSummary` closures and the `onRefresh={handleRefresh}` props now unused on `BudgetCategories`. Confirm 3a.6 passes.
- [x] 3a.8 REFACTOR — confirm `npm run typecheck`/`npm test`/`npm run lint` pass; note `BudgetCategories.test.tsx` is the one widget test that changed (see Notes below), all other entity-mocking widget tests remain untouched.

## Slice 3b (PR5): Remaining Page/Feature Mutations

- [ ] 3b.1 RED — extend `frontend/src/features/savings/SavingsGoalForm.test.tsx`: create/update invalidate `queryKeys.savingsGoals(groupId)` (or `queryKeys.group(groupId)` if summary also depends on it), no `onSaved`/refresh callback prop asserted.
- [ ] 3b.2 GREEN — modify `frontend/src/features/savings/SavingsGoalForm.tsx`: `useMutation` + `savingsGoalApi.create`/`update` + `invalidateQueries`; drop the refresh-callback prop.
- [ ] 3b.3 RED — extend `frontend/src/features/savings/SavingsGoalList.test.tsx`: goal delete invalidates the savings key; no `onRefresh` prop.
- [ ] 3b.4 GREEN — modify `frontend/src/features/savings/SavingsGoalList.tsx`: `useMutation` for delete + invalidation; drop `onRefresh`.
- [ ] 3b.5 RED — extend `frontend/src/entities/savings-goal/useContributionSession.test.ts`: save-session mutation invalidates `queryKeys.savingsGoals(groupId)`.
- [ ] 3b.6 GREEN — modify `frontend/src/entities/savings-goal/useContributionSession.ts` + `frontend/src/features/savings/InlineAllocationEditor.tsx`: `useMutation` wrapping `savingsGoalApi.upsertContribution`/`deleteContribution`, `onSuccess` invalidation, drop hand-threaded refresh.
- [ ] 3b.7 RED — extend `frontend/src/entities/member/useIncomeSession.test.ts` and `frontend/src/widgets/dashboard/ui/IncomeOverview.test.tsx`: income update invalidates `queryKeys.group(groupId)` (income affects summary + budget splits).
- [ ] 3b.8 GREEN — modify `frontend/src/entities/member/useIncomeSession.ts` + `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`: `useMutation` + invalidation, drop refresh closures.
- [ ] 3b.9 RED — extend `frontend/tests/pages/expenses-page.test.tsx`: expense log/delete/update invalidate `queryKeys.expenses(groupId, …)` + `queryKeys.group(groupId)` (summary depends on expenses), no `refresh` closure passed to `ExpenseForm`.
- [ ] 3b.10 GREEN — modify `frontend/src/pages/expenses/ui/ExpensesPage.tsx` (+ `ExpenseForm` if it owns the mutation): `useMutation` per expense action + invalidation.
- [ ] 3b.11 RED — extend `frontend/tests/pages/transfers.test.tsx` (or equivalent): transfer-list page drops its `refresh` closure now that `BudgetCategories`'/entity mutations invalidate the shared key.
- [ ] 3b.12 GREEN — modify `frontend/src/pages/transfers/ui/TransfersPage.tsx`: drop refresh closure, rely on cache invalidation from 3a's transfer mutation.
- [ ] 3b.13 RED — extend `frontend/tests/pages/savings.test.tsx`: `SavingsPage` no longer threads a refresh callback into its children.
- [ ] 3b.14 GREEN — modify `frontend/src/pages/savings/ui/SavingsPage.tsx`: drop refresh-callback wiring.
- [ ] 3b.15 RED — extend `frontend/tests/pages/groups.test.tsx`: `CreateGroupForm` success invalidates `queryKeys.groups()` instead of calling a passed `onCreated`.
- [ ] 3b.16 GREEN — modify `frontend/src/pages/groups/ui/GroupsPage.tsx` (`CreateGroupForm`): `useMutation` + `invalidateQueries(queryKeys.groups())`, drop `onCreated`/retry closure (`GroupsPage.tsx` already reads `useGroupList()` from 2b.4).
- [ ] 3b.17 REFACTOR — repo-wide grep for `onRefresh`/`refresh:`/hand-threaded refresh props returns none outside test-only mock helpers; run full `npm test`/`npm run typecheck`/`npm run lint`; confirm success criteria (proposal.md) all check.

## Notes — Documented Exceptions

- **`AuthProvider.test.tsx` wrapper lands in Slice 1**, not slice 3: task 1.9 adds the `QueryClientProvider` wrapper because `useQueryClient()` throws without one as soon as `AuthProvider.tsx` calls it (task 1.10).
- **`BudgetCategories.test.tsx` is an exception to "widget tests pass unchanged"** (proposal success criterion): task 3a.4 rewrites it to add a `QueryClientProvider` wrapper and drop the `onRefresh` prop/assertions, because `BudgetCategories` moves off prop-drilled refresh onto `useMutation`. This does not apply to `ActiveGroupSync.test.tsx` or the other entity-mocking widget tests (`SavingsGoalForm.test.tsx`, `SavingsGoalList.test.tsx`, etc.), which mock the entity/hook module directly and stay valid per A1–A3 — `sdd-verify` should not flag the `BudgetCategories.test.tsx` diff as a regression.
