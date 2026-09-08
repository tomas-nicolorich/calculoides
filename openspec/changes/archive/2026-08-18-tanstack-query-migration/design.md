# Design: TanStack Query Migration

Artifact store: hybrid. Engram topic: `sdd/tanstack-query-migration/design`.
Inputs: `proposal.md` (D1–D7, authoritative). No spec artifact required — D1–D7 are settled constraints, not open questions.

## Technical Approach

`@tanstack/react-query` v5 becomes the cache; `apiClient.fetch` stays the transport. The six read
hooks keep their **exact current 5-field return shape**, so every page/widget consumer and every
existing `vi.mock`/`mockReturnValue` compiles unchanged — slice 2 touches zero page files. A typed
key factory (`queryKeys.ts`) plus `createQueryClient()` (`queryClient.ts`) carry D2/D6. Mutations
move to `useMutation` + prefix `invalidateQueries`, deleting the hand-threaded `refresh`/`onRefresh`
closures. `AuthProvider` reads the client through `useQueryClient()` — which only works because D4
mounts the provider above it — and clears on owner change.

## Architecture Decisions

| # | Decision | Alternatives rejected | Rationale |
|---|---|---|---|
| A1 | Wrapper return type = today's 5 fields + **optional** `isFetching?`/`refetch?` | Return raw `UseQueryResult`; add required `refetch` | `expenses-page.test.tsx:167` and `groups.test.tsx:30` call `mockReturnValue({…exactly 5 fields})` against the real type — a *required* 6th field fails typecheck. Optional fields keep those literals legal while satisfying D7's "every hook still exposes refetch". |
| A2 | `isInitialLoading` **keeps its name**, and equals `loading` | Rename to `isPending` at consumer boundaries | Renaming touches every consumer + `expenses-page.test.tsx:192` for zero behaviour gain. v5's `isLoading` (= `isPending && isFetching`) is a semantic match for both names. |
| A3 | `error` stays **`string \| null`** via a shared `toErrorMessage()` | Propagate `Error \| null` | `DashboardPage.tsx:120` renders `{summaryError ?? categoriesError}` directly in JSX and `groups.test.tsx:94` asserts a string. `Error` in JSX is a runtime break. |
| A4 | `loading` ← `isLoading`, **not** `isFetching` | `loading = isFetching` (today's literal semantics) | Today `refresh()` sets `loading: true`; with `refetchOnWindowFocus` that would repaint a full-surface skeleton on every tab focus (proposal's flicker risk). `isLoading` is also `false` for a disabled query, preserving the `groupId === null` → not-loading behaviour that `enabled` alone would break (`isPending` stays `true` forever when disabled). |
| A5 | `data: query.data ?? MODULE_LEVEL_FALLBACK` | Return `T \| undefined` | Preserves `DashboardSummary \| null` / `CategoryWithBalances[]` signatures. Fallback must be a module constant — a fresh `[]` per render breaks referential equality for memo/effect deps. |
| A6 | `AuthProvider` uses `useQueryClient()`, not the module singleton | `import { queryClient }` | A test wrapping `AuthProvider` in its own client must have *that* client cleared, not the app singleton. Cost: `AuthProvider.test.tsx` now needs a provider wrapper (slice 1). |
| A7 | Clear gated on a dedicated `cacheOwnerIdRef`, mirroring the `checkedUserIdRef` pattern | Reuse `checkedUserIdRef`; gate on the Supabase event name | Supabase re-emits `SIGNED_IN` on tab focus (D5). `checkedUserIdRef` means "profile already checked" and is nulled on token-less states, so overloading it couples the /me dedupe to a privacy control. Never fires on mount (ref starts `null`) or on token refresh (same id). |
| A8 | `placeholderData: keepPreviousData` on the two paginated hooks only | Nothing; or `loading \|\| isPlaceholderData` | Filters are already in the key, so page 1 survives page 2 (cache hit on back). `keepPreviousData` additionally keeps the current rows on screen instead of flashing a skeleton; folding it into `loading` would re-show the skeleton and buy nothing. Pages get in-flight feedback from the new optional `isFetching`. |
| A9 | `GroupListContext.tsx` lands in **slice 2**, not slice 1 | Slice 1 (it owns the `["groups"]` key) | Keeps slice 1 a zero-behaviour-change infra PR. Slice 1's D5 test seeds the cache with `client.setQueryData` instead of depending on a migrated hook. |
| A10 | Entity modules must reproduce the **exact** endpoint strings and JSON bodies | Redesign the `/transactions?action=…` endpoints | `BudgetCategories.test.tsx` mocks `apiClient.fetch` and asserts the payload; identical URLs/bodies keep those assertions valid, so slice 3 only adds a provider wrapper and drops the `onRefresh` assertions. |

## Interfaces / Contracts

```ts
// shared/api/queryKeys.ts — D6
export const NO_GROUP = "__no-group__";                    // key placeholder for a disabled query
export interface ExpenseFilters  { categoryId?: string; memberId?: string; limit?: number; offset?: number; from?: string; to?: string }
export interface TransferFilters { categoryId?: string; memberId?: string; limit?: number; offset?: number }

const strip = <T extends object>(f: T) =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as T;

export const queryKeys = {
  groups:       ()                                    => ["groups"] as const,
  group:        (g: string)                           => ["group", g] as const,            // invalidation prefix
  summary:      (g: string)                           => ["group", g, "summary"] as const,
  categories:   (g: string)                           => ["group", g, "categories"] as const,
  savingsGoals: (g: string)                           => ["group", g, "savings"] as const,
  expenses:     (g: string, f: ExpenseFilters  = {})  => ["group", g, "expenses",  strip(f)] as const,
  transfers:    (g: string, f: TransferFilters = {})  => ["group", g, "transfers", strip(f)] as const,
} as const;
```

```ts
// shared/api/queryClient.ts — D2
export const BASE_QUERY_DEFAULTS = {
  staleTime: 30_000, gcTime: 5 * 60_000, retry: 1,
  refetchOnWindowFocus: true, refetchOnReconnect: true,
} satisfies DefaultOptions["queries"];
export const GROUPS_STALE_TIME = 5 * 60_000;

export function createQueryClient(o: { queries?: …; mutations?: … } = {}): QueryClient {
  const client = new QueryClient({ defaultOptions: {
    queries:   { ...BASE_QUERY_DEFAULTS, ...o.queries },      // per-section merge, not top-level spread
    mutations: { retry: 0, ...o.mutations },
  }});
  client.setQueryDefaults(queryKeys.groups(), { staleTime: GROUPS_STALE_TIME });
  return client;
}
export const queryClient = createQueryClient();               // app singleton, App.tsx only
```

```ts
// shared/api/apiQueryResult.ts — the preserved consumer contract (A1–A5)
export interface ApiQueryResult<T> {
  data: T; loading: boolean; error: string | null;
  refresh: () => void; isInitialLoading: boolean;
  isFetching?: boolean; refetch?: () => Promise<unknown>;    // additive, optional
}
export function toApiQueryResult<T>(q: UseQueryResult<T>, fallback: T): ApiQueryResult<T> {
  return {
    data: q.data ?? fallback,
    loading: q.isLoading, isInitialLoading: q.isLoading,
    error: toErrorMessage(q.error),
    refresh: () => { void q.refetch(); },
    isFetching: q.isFetching, refetch: q.refetch,
  };
}
```

```ts
// shared/api/dashboardHooks.ts — representative wrapper (signature unchanged)
export function useExpensesList(groupId: string | null, categoryId?: string, memberId?: string,
                                limit = 20, offset = 0, from?: string, to?: string) {
  const filters = { categoryId, memberId, limit, offset, from, to };
  const q = useQuery({
    queryKey: queryKeys.expenses(groupId ?? NO_GROUP, filters),
    queryFn: ({ signal }) => expenseListFetcher(groupId!, filters, signal),   // AbortSignal adapter
    enabled: groupId !== null,
    placeholderData: keepPreviousData,                                        // A8
  });
  return toApiQueryResult<ExpensesList | null>(q, null);
}
```

```ts
// Mutation pattern — D3/D6 (BudgetCategories.tsx shown)
const qc = useQueryClient();
const createCategory = useMutation({
  mutationFn: (input: CreateCategoryInput) => categoryApi.create(groupId, input),
  onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.group(groupId) }),  // prefix, D6
});
// formLoading -> createCategory.isPending ; formError -> toErrorMessage(createCategory.error)
```

Rule: **return** the `invalidateQueries` promise from `onSuccess` when success closes a dialog (v5
awaits it, so the dialog closes on fresh data, not on stale rows); fire-and-forget for inline
deletes. `mutationFn` gets **no** `signal` from TanStack — mutations stay unabortable, as today.

AbortSignal adapter: `queryFn: ({ signal }) => api.list(groupId, signal)`. Entity fetchers that
don't take one (`savingsGoalApi.list`, new `categoryApi.list`) gain an additive trailing
`signal?: AbortSignal`, matching the `groupApi.list(signal?)` precedent.

## Data Flow

    QueryClientProvider (D4, outermost) ── queryClient singleton
      └─ BrowserRouter ─ AuthProvider ── useQueryClient() ─→ .clear() when cacheOwnerIdRef changes (D5)
           │  renders {!loading && children}  ← unmounts its subtree; cache survives above it
           └─ ActiveGroupProvider ─ ProtectedRoute ─ GroupListProvider ── useQuery(["groups"])
                                                       └─ AppShell ─ page
                                                            ├─ read  ─ useXxx() ─ useQuery(["group",gid,…]) ─ apiClient.fetch(signal)
                                                            └─ write ─ useMutation ─ onSuccess ─ invalidateQueries(["group",gid])
                                                                                                     ↓ only *mounted* queries refetch

## File Changes

| File | Action | Slice |
|---|---|---|
| `frontend/package.json`, root `package-lock.json` | Modify | 1 — `npm i @tanstack/react-query -w frontend` |
| `frontend/src/shared/api/queryKeys.ts` | Create | 1 |
| `frontend/src/shared/api/queryClient.ts` | Create | 1 |
| `frontend/src/shared/api/toErrorMessage.ts` | Create | 1 — A3, shared by queries + mutations |
| `frontend/src/app/App.tsx` | Modify | 1 — `QueryClientProvider` outermost (D4) |
| `frontend/src/app/providers/AuthProvider.tsx` | Modify | 1 — A6/A7 clear-on-owner-change |
| `frontend/src/app/providers/AuthProvider.test.tsx` | Modify | 1 — **must** wrap in a provider (A6) + D5 test |
| `frontend/src/test/queryTestUtils.tsx` | Create | 1 — `createTestQueryClient` + `QueryWrapper` |
| `frontend/src/shared/api/apiQueryResult.ts` | Create | 2 — `ApiQueryResult` + `toApiQueryResult` |
| `frontend/src/shared/api/dashboardHooks.ts`, `savingsHooks.ts` | Modify | 2 — `useQuery`, shape preserved |
| `frontend/src/app/providers/GroupListContext.tsx` | Modify | 2 — A9; `GroupListContextValue` unchanged |
| `…/dashboardHooks.test.ts`, `savingsHooks.test.ts`, `GroupListContext.test.tsx` | Create | 2 — first coverage for these files |
| `frontend/src/shared/api/useApiQuery.ts` | Delete | 2 — end of slice, last consumer migrated |
| `frontend/src/entities/category/index.ts` | Create | 3 — D3, A10 (create/update/delete/list) |
| `frontend/src/entities/transfer/index.ts` | Modify | 3 — add `create`, A10 |
| `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` + `.test.tsx` | Modify | 3 — 3 mutations; drop `onRefresh` prop/assertions |
| `frontend/src/pages/{dashboard,expenses,transfers,savings,groups}/ui/*` | Modify | 3 — drop `refresh` closures |
| `frontend/src/features/{savings,expense}/*` | Modify | 3 — `useMutation` + invalidation |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `queryKeys` stability (undefined filters hash identically; prefix containment), `createQueryClient` D2 numbers + `["groups"]` override, `toErrorMessage`, `toApiQueryResult` mapping | Vitest, no React |
| Hook | Each migrated hook: disabled when `groupId === null` (no fetch, `loading === false`), first load, error → string, cache hit on remount, `refresh()` refetches, paginated hooks keep previous page | `renderHook` + `QueryWrapper`; `apiClient.fetch` mocked |
| Provider | D5: `client.setQueryData` seed → sign-out → cache empty; token refresh (same id) → cache intact; re-emitted `SIGNED_IN` → cache intact | `AuthProvider.test.tsx` with a mocked `onAuthStateChange` emitter |
| Existing | `ActiveGroupSync.test.tsx`, `groups/dashboard/expenses/savings` page tests, `navigation.test.tsx` | Pass **unchanged** — they mock the hook modules, so no provider is needed (this is the point of A1–A3) |

Test client: `createTestQueryClient()` = `retry: false` (otherwise error assertions wait on a retry),
`gcTime: Infinity` (no GC timers firing after teardown), `refetchOnWindowFocus/Reconnect: false`
(jsdom focus events must not refetch), `staleTime: 0`. Fresh client **per test** — a shared client
leaks cached data across cases.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary; frontend-only, no API/schema change, every request stays
server-authorized. The one security-relevant requirement is D5 (cross-user cache leak on a shared
device), covered by the three Provider-layer RED tests above.

## Migration / Rollout

No data migration, no feature flag. Feature-branch chain: each slice PR targets the
`tanstack-query-migration` tracking branch; only the tracking branch merges to `develop`. Revert
newest-first — slice 1 is only safe to revert once 2–3 are out, since they import
`queryClient`/`queryKeys`. `useApiQuery.ts` survives until the end of slice 2, so a partial revert
restores the old fetching path intact.

Review-budget forecast (400 lines/PR): slice 1 ≈ 200 (Low). Slice 2 ≈ 400+ once the three new test
files land (**Medium/High** — split at the file boundary into 2a `dashboardHooks` and 2b
`savingsHooks` + `GroupListContext`, moving the `useApiQuery.ts` deletion to 2b). Slice 3 ≈ 600+
across 9+ files (**High** — split into 3a dashboard/category/transfer mutations incl. the D3 entity
modules, and 3b savings/expense/group mutations). `sdd-tasks` must size these before apply.

## Open Questions

- [ ] `@tanstack/react-query` v5 API shapes here (`isLoading = isPending && isFetching`,
      `keepPreviousData` export, `setQueryDefaults`, `onSuccess` promise-awaiting) are from
      knowledge, not fetched docs — the Context7 MCP tool was not exposed to this executor. Slice 1
      must verify them against the installed `.d.ts` before slice 2 depends on them.
- [ ] Whether `isFetching`/`refetch` should be promoted from optional to required once a future
      change updates the two typed mocks (D7 follow-up).
- [ ] Paginated pages currently get no in-flight indicator under A8; whether to surface
      `isFetching` in `ExpensesPage`/`TransfersPage` now or with D7.
