# Delta for Client Data Cache

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Mutations Invalidate Group-Scoped Queries by Key Prefix

After any group-scoped mutation (expense, category, transfer, savings goal, or income write) succeeds — whether triggered via a Server Action or a client-side API call — the system MUST invalidate every TanStack-Query-cached entry under the `["group", groupId]` key prefix for resources not yet server-rendered, AND MUST trigger revalidation of any Server-Component-rendered route serving that same group's data, so both cache layers reflect the mutation without a manual reload.
(Previously: mutations only needed to invalidate TanStack Query cache entries; there was no Server-Component-rendered data to also revalidate.)

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
