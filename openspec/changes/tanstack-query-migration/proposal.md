# Proposal: TanStack Query Migration

## Intent

Every client-side navigation refetches. `frontend/src/shared/api/useApiQuery.ts` holds state in `useState`/`useEffect` scoped to the mounting component, so leaving Dashboard for Expenses and coming back re-hits the API; `apiClient.fetch`'s 100ms in-flight dedup Map is not a cache. Meanwhile every mutating child hand-threads a `refresh()`/`onRefresh()` closure to its parent — there is no shared invalidation key space, so "which lists does this write affect" is re-decided at each call site and already drifts.

Adopt `@tanstack/react-query` v5 as the single client cache. Two outcomes this change delivers: (1) navigation serves from cache instead of the network; (2) in this shared multi-user group-expense app another member's edit surfaces promptly via staleness + window-focus refetch. An explicit manual-refresh UI affordance is deferred (D7) — every hook still exposes `refetch()` for a future change to surface. Affected workspace: **frontend only**.

## Scope

### In Scope
- Add `@tanstack/react-query` to `frontend`; module `createQueryClient()` factory + app singleton in `frontend/src/shared/api/queryClient.ts`; typed key factory in `frontend/src/shared/api/queryKeys.ts`.
- `QueryClientProvider` mounted in `App.tsx` above `AuthProvider` (D4); cache cleared on sign-out (D5).
- Read hooks (`dashboardHooks.ts` ×4, `savingsHooks.ts`, `GroupListContext.tsx`) rebacked by `useQuery` behind their **current return shape** (thin wrappers); `useApiQuery.ts` deleted once its last consumer is migrated. These four files have zero tests today — this change adds them.
- Mutations → `useMutation` + `invalidateQueries`, removing `refresh`/`onRefresh` prop-drilling: `SavingsGoalForm`, `SavingsGoalList`, `InlineAllocationEditor`/`useContributionSession`, `ExpenseForm`, `ExpensesPage`, `TransfersPage`, `useIncomeSession` consumers, `GroupsPage`/`CreateGroupForm`.
- Normalize the two direct `apiClient.fetch` mutation sites into entity API modules: `BudgetCategories.tsx` (category-create/update, transfer-create) and `DashboardPage.tsx` (category-delete) — D3.

### Out of Scope
- **Manual refresh affordance (D7)** — deferred to a future change. Users get cache-served navigation and focus/staleness refetch in this change; an explicit "refresh now" button is not part of this slice. `refetch()`/`invalidateQueries` remain available at the hook level for a later change to surface in the UI.
- **Supabase Realtime / push invalidation** — not "deferred pending design": explicitly not part of this product slice. Focus + staleness refetch is the agreed freshness mechanism.
- `frontend/src/pages/profile/ui/useProfileForm.ts` and `AuthProvider`'s raw `/api/users/me` fetch (D3): no shared query to invalidate, and auth bootstrap must not depend on the cache layer.
- Dead API surface `groupApi.invitations.*`, `groupApi.archive.*`, `groupApi.transferOwnership` (zero UI consumers) — not migrated, not key-designed for.
- `apiClient.fetch` transport itself (stays the `queryFn`/`mutationFn`), `ActiveGroupContext`, optimistic updates, offline/persisted cache, prefetching, suspense, API/`shared`/Prisma.

## Capabilities

### New Capabilities
- `client-data-cache`: cross-navigation caching, staleness and focus-refetch policy, manual refresh, and cache clearing on sign-out.

### Modified Capabilities
- None. Existing specs (`dashboard-income`, `savings-goal-management`, `savings-income-split-allocation`) describe domain behavior that is unchanged.

## Approach

Thin wrapper hooks over `useQuery`, keeping `{ data, loading, error, refresh, isInitialLoading }` at consumer boundaries. This bounds the blast radius to the four untested files, keeps `ActiveGroupSync.test.tsx`'s module mock and the entity-API-mocking widget tests (`BudgetCategories`, `SavingsGoal*`, `ExpenseForm`) valid, and lets the new coverage land inside this change rather than after it.

| # | Decision | Rationale / tradeoff |
|---|----------|----------------------|
| D1 | **Keep** `GroupListProvider` as a thin Context over `useQuery` | TanStack's cache alone would make the Context redundant, but keeping it means `ActiveGroupSync.tsx`, `GroupsPage.tsx` and `ActiveGroupSync.test.tsx` are untouched, and the `user?.id` keying stays in one place. Cost: one indirection TanStack no longer needs — cheap to delete later. |
| D2 | Global `staleTime: 30_000`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `gcTime: 5min`, `retry: 1`. Override: `["groups"]` → `staleTime: 5min` | 30s makes intra-session navigation cache-served (goal 1) while a co-member's edit surfaces on the next tab focus or within 30s (goal 2). `retry: 1` avoids 3× retry storms on 401/404. The group list changes rarely, so it gets a longer window. |
| D3 | Migrate the two `apiClient.fetch` **mutation** sites; leave `useProfileForm` / `AuthProvider` raw fetches alone | The two mutation sites are exactly what drives the `onRefresh()` prop-drilling this change removes — leaving them means two invalidation mechanisms in one widget tree. `useProfileForm` invalidates nothing and would only widen the diff. |
| D4 | `QueryClientProvider` **outermost**, wrapping `BrowserRouter` > `AuthProvider` | `AuthProvider` renders `{!loading && children}`, so its whole subtree unmounts on session bootstrap and on `retrySessionLoad` — a client created below it would lose the cache on every session revalidation. Being an ancestor also lets `AuthProvider`'s auth listener call `queryClient.clear()` (D5) and keeps public auth pages usable later. |
| D5 | `queryClient.clear()` when the session goes null (sign-out / expiry), **not** on token refresh | Household finance on a shared device: without this, user B logging in after user A gets A's cached group/income/expense data rendered stale-while-revalidate before the refetch lands. Household co-members share `groupId`s, so group-scoped keys collide by design — key namespacing is not a substitute. Supabase re-emits `SIGNED_IN` on tab focus, so gate on session-null / user-id change (the existing `checkedUserIdRef` pattern), never the raw event. |
| D6 | Keys: `["groups"]`, `["group", groupId, <resource>, ...filters]`; mutations invalidate the `["group", groupId]` prefix by default | Almost every current handler already refreshes `summary` + `categories` together, so prefix invalidation reproduces today's semantics with far less bookkeeping. Inactive queries are only marked stale, so unmounted pages cost nothing. Narrower per-resource invalidation stays available where a mutation provably touches one list. |
| D7 | **Deferred, not built this change.** Manual refresh stays available as `refetch()`/`invalidateQueries(["group", groupId])` at the hook level; no UI affordance ships now | User explicitly deferred the refresh button to a future change. Nothing here forecloses adding it later — every hook still returns `refetch`, and D6's key prefix is exactly what a future button would invalidate. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/package.json`, root `package-lock.json` | Modified | `npm install @tanstack/react-query -w frontend` |
| `frontend/src/shared/api/queryClient.ts`, `queryKeys.ts` | New | Client factory + defaults (D2); typed key factory (D6) |
| `frontend/src/app/App.tsx` | Modified | Mount `QueryClientProvider` outermost (D4) |
| `frontend/src/app/providers/AuthProvider.tsx` | Modified | `queryClient.clear()` on session-null (D5) |
| `frontend/src/shared/api/useApiQuery.ts` | Removed | After its last consumer migrates |
| `frontend/src/shared/api/dashboardHooks.ts`, `savingsHooks.ts` | Modified | Rebacked by `useQuery`, same return shape |
| `frontend/src/app/providers/GroupListContext.tsx` | Modified | `useQuery` inside the existing Context (D1) |
| `frontend/src/entities/{category,transfer}/*` | New/Modified | Absorb the direct `apiClient.fetch` calls (D3) |
| `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` | Modified | Three mutations → `useMutation`; `onRefresh` prop dropped |
| `frontend/src/pages/{dashboard,expenses,transfers,savings,groups}/ui/*` | Modified | Drop hand-threaded `refresh` closures (invalidation replaces them) |
| `frontend/src/features/**` (savings + expense forms) | Modified | `useMutation` + invalidation |
| Test setup + new hook tests | New/Modified | Per-test `createQueryClient()` wrapper helper |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Far exceeds the 800-line review budget | High | Slice: (1) dep + client + keys + provider + logout clear; (2) read hooks + their new tests; (3) mutations + invalidation. Each slice independently revertible; `useApiQuery.ts` deleted only at the end of slice 2. Chained via `feature-branch-chain`: each slice PR targets a `tanstack-query-migration` tracking branch; only the tracking branch merges to `develop`, once all slices land and are confirmed working |
| Stale cross-user data after logout/login on a shared device | Med | D5 is a hard requirement of this change, with an explicit test |
| Prefix invalidation (D6) triggers wider refetches than today | Med | Only *mounted* queries refetch; measure on Dashboard (summary + categories + expenses mounted together) and narrow the key if it regresses |
| `refetchOnWindowFocus` causes visible flicker or lost in-progress form state | Med | `isFetching` must not drive full-surface skeletons — only `isPending`/first load, mirroring today's `isInitialLoading` |
| Paginated/filtered expenses & transfers keys mis-designed, so page 2 evicts page 1 | Med | Filters are part of the key (D6); resolve `placeholderData` behavior in design |
| The four most-central files have no existing safety net | Med | New tests land inside slice 2, not as follow-up |
| `AbortSignal`-taking entity fetchers must adapt to TanStack's `signal` | Low | Mechanical: `queryFn: ({ signal }) => api.list(groupId, signal)` |

## Rollback Plan

Frontend-only, no schema or API change. Revert per slice, newest first. Reverting slice 1 alone is safe only if slices 2–3 are already reverted (they import `queryClient`/`queryKeys`). Until slice 2 completes, `useApiQuery.ts` still exists, so a partial revert restores the previous fetching path unchanged. `apiClient.fetch` is untouched throughout, so the transport, auth-header injection and its test are never part of a rollback.

## Dependencies

- `@tanstack/react-query` v5 (React 19.2 compatible). Standard npm-workspaces add: `npm install @tanstack/react-query -w frontend` + commit the root lockfile — matches existing repo practice, no per-package lockfile for `frontend`.
- Optional, not proposed: `@tanstack/react-query-devtools`.

## Success Criteria

- [x] Navigating Dashboard → Expenses → Dashboard within the stale window issues no new network request for already-cached data.
- [x] Returning to a backgrounded tab after the stale window refetches and shows another member's edit without a manual reload.
- [x] No component passes a `refresh`/`onRefresh` data-reload closure to a mutating child; invalidation goes through query keys.
- [x] Signing out and signing in as a different user on the same device renders no data from the previous user.
- [x] `useApiQuery.ts` is deleted and has no remaining references.
- [x] The migrated read hooks and `GroupListContext` have unit tests where they had none.
- [x] `npm test`, `npm run lint`, `npm run typecheck` pass; `ActiveGroupSync.test.tsx` and the entity-API-mocking widget tests pass unchanged (one documented exception: `BudgetCategories.test.tsx`, per D3's mutation normalization).

## Downstream (open for spec/design)

- Exact `staleTime` per resource if 30s proves too chatty or too stale in practice — the mechanism is settled, the number is tunable.
- Manual refresh UI (D7) is deferred entirely — a future change decides placement (per-page header vs. AppShell-level) when it's built.
- `placeholderData`/`keepPreviousData` for paginated expenses & transfers.
- Whether `isInitialLoading` keeps its name or becomes `isPending` at consumer boundaries once the wrappers exist.
- Error surface: TanStack returns `Error`, today's hooks return `string | null` — the wrappers must pick one.
- Whether a follow-up change normalizes `useProfileForm`/`AuthProvider` raw fetches (D3, deliberately deferred).
