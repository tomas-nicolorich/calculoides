# Client Data Cache Specification

## Purpose

Defines the client-side caching, staleness, and invalidation contract for group-scoped API reads and writes, replacing per-component refetch-on-mount with a shared query cache. Cache clearing on sign-out is a privacy requirement for shared-device use, not merely a UX nicety.

## Non-Goals

- No manual "refresh now" UI control ships in this capability. `refetch()`/`invalidateQueries` remain available at the hook level for a future change to surface.
- No Supabase Realtime or other push-based invalidation; staleness + focus refetch is the only freshness mechanism.
- `useProfileForm.ts` and `AuthProvider`'s raw `/api/users/me` fetch are not backed by this cache.

## Requirements

### Requirement: Cache-Served Navigation Within Staleness Window

The system MUST serve previously fetched group-scoped data from cache, with no new network request, when a query is remounted within its staleness window (30 seconds by default).

#### Scenario: Return to a page within the staleness window
- GIVEN a user fetched Dashboard data 10 seconds ago
- WHEN the user navigates to Expenses and back to Dashboard
- THEN Dashboard renders instantly from cache and issues no new request

### Requirement: Refetch Only on Remount or Refocus, Never on an Interval

Once a cached query becomes stale, the system MUST refetch it only when it becomes active again — on component remount, on window refocus (`refetchOnWindowFocus: true`), or on network reconnect (`refetchOnReconnect: true`). The system MUST NOT poll on a fixed interval; no query MUST configure `refetchInterval`.

#### Scenario: Stale query refetches on remount
- GIVEN a query's data is older than its staleTime
- WHEN the component consuming it mounts
- THEN a background refetch fires and the view updates when it resolves

#### Scenario: Stale query refetches on window refocus
- GIVEN a backgrounded tab holds stale group data
- WHEN the user refocuses the tab
- THEN a background refetch fires, surfacing another member's edit without a manual reload

#### Scenario: No refetch while the tab stays focused and idle
- GIVEN a query is within its staleness window
- WHEN no remount, refocus, or reconnect occurs
- THEN no automatic request is made

### Requirement: Extended Staleness for the Group List

The `["groups"]` query MUST use a 5-minute staleTime, overriding the 30-second default, since group membership changes rarely.

#### Scenario: Group list stays cached across a short session
- GIVEN the group list was fetched 2 minutes ago
- WHEN any component remounts a groups query
- THEN no refetch occurs because the list is still within its 5-minute window

### Requirement: Bounded Retry on Failed Queries

Failed queries MUST retry at most once (`retry: 1`) before surfacing an error, to avoid retry storms on non-transient failures such as 401 or 404.

#### Scenario: Query fails with 404
- WHEN a group-scoped query fails with a 404
- THEN it retries once, then surfaces an error state without further automatic retries

### Requirement: Full Cache Clear on Sign-Out

The system MUST clear the entire query cache when the session transitions to signed-out (session becomes null), and MUST NOT clear it on a token refresh.

#### Scenario: Shared device — user switch leaves no residual data
- GIVEN User A is signed in on a shared browser tab with cached group, summary, and expense data
- WHEN User A signs out and User B signs in on the same tab
- THEN User B's first render shows no flash of User A's cached data — the cache is cleared before User B's session is established

#### Scenario: Token refresh does not clear the cache
- GIVEN a signed-in user with cached data
- WHEN the session token silently refreshes
- THEN the cache is untouched and no refetch is forced

### Requirement: TanStack Query Is Retained Only for Client-Owned Reads

Once a read is served by a Server Component, the system MUST NOT hold a TanStack Query cache entry for it. TanStack Query MUST remain the caching layer only for reads fetched from a Client Component (interactive widgets, modals, and any page not yet ported to a Server Component).

#### Scenario: Server-Component-served read has no query key
- GIVEN the Dashboard's summary is rendered by a Server Component
- WHEN the Dashboard page loads
- THEN no TanStack Query cache entry exists for that summary data

#### Scenario: Non-migrated read still uses TanStack Query cache
- GIVEN a page not yet ported to Server Components (e.g. Expenses list)
- WHEN the user navigates to it and back within the staleness window
- THEN it is served from the TanStack Query cache exactly as before this migration

### Requirement: Mutations Invalidate Group-Scoped Queries by Key Prefix

After any group-scoped mutation (expense, category, transfer, savings goal, or income write) succeeds — whether triggered via a Server Action or a client-side API call — the system MUST invalidate every TanStack-Query-cached entry under the `["group", groupId]` key prefix for resources not yet server-rendered, AND MUST trigger revalidation of any Server-Component-rendered route serving that same group's data, so both cache layers reflect the mutation without a manual reload.

#### Scenario: Expense mutation refreshes dependent views
- GIVEN a group's summary and expense list are both mounted and cached
- WHEN a new expense is created for that group
- THEN both the summary and expense list refetch without either component being told to refresh directly

#### Scenario: Mutation for one group does not affect another
- GIVEN Group X and Group Y both have cached data
- WHEN a mutation succeeds for Group X
- THEN Group Y's cached queries are not marked stale

#### Scenario: Server Action mutation revalidates a Server-Component-rendered route
- GIVEN the Dashboard summary for group G is rendered by a Server Component (no query key)
- WHEN a Server Action creates an expense for group G
- THEN the system triggers revalidation of the Dashboard route so the next render reflects the new expense, and any still-client-cached queries under `["group", G]` are also invalidated
