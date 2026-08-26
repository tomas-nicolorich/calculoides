# Delta for Client Data Cache

## MODIFIED Requirements

### Requirement: TanStack Query Is Retained Only for Client-Owned Reads

Once a read is served by a Server Component, the system MUST NOT hold a
TanStack Query cache entry for it, regardless of whether that Server
Component renders inside a route's single top-level render or inside one
of several independently streamed `<Suspense>`/`HydrationBoundary`
regions on the same route. TanStack Query MUST remain the caching layer
only for reads fetched from a Client Component (interactive widgets,
modals, and any page not yet ported to a Server Component).

(Previously: framed the "no client-owned cache entry for a
Server-Component-served read" invariant around one page-wide render only;
the invariant itself is unchanged — one server prefetch per query key,
with no consumer issuing an initial client fetch for a prefetched key —
but a route MAY now split its server-rendered reads across multiple
independently streamed regions instead of one page-wide render.)

#### Scenario: Server-Component-served read has no query key
- GIVEN the Dashboard's summary is rendered by a Server Component
- WHEN the Dashboard page loads
- THEN no TanStack Query cache entry exists for that summary data

#### Scenario: Non-migrated read still uses TanStack Query cache
- GIVEN a page not yet ported to Server Components (e.g. Expenses list)
- WHEN the user navigates to it and back within the staleness window
- THEN it is served from the TanStack Query cache exactly as before this migration

#### Scenario: A per-region streamed read is still Server-Component-owned
- GIVEN the Dashboard renders `summary`, `categories`, and `savingsGoals` as three independently streamed regions instead of one page-wide render
- WHEN each region's Server Component resolves its own prefetch
- THEN none of the three reads is served from a client-fetched TanStack Query cache entry — each is server-owned exactly as it would be under one page-wide render

## ADDED Requirements

### Requirement: A Streamed Region's Hydration Boundary Must Cover or Nest Below Every Key Its Subtree Reads

When a route splits its server prefetch across multiple independently
streamed `<Suspense>`/`HydrationBoundary` regions, each region's boundary
MUST hydrate every query key its subtree's consumers read, OR that region
MUST be nested strictly below (i.e., inside) the region whose boundary
already hydrates that key, so the dependency is hydrated before the
nested subtree mounts. A sibling (non-nested) region MUST NOT contain a
consumer that reads a key only some other sibling's boundary hydrates.
Because `hydrate()` is idempotent — it skips entries older than the
already-cached `dataUpdatedAt` — two boundaries MAY overlap in the keys
they hydrate without becoming incorrect, but regions SHOULD hydrate only
the keys their own subtree needs; disjoint-plus-nested is the sanctioned
shape, not overlapping siblings.

#### Scenario: A region hydrates every key its own subtree reads
- GIVEN a streamed region's subtree contains only consumers of that region's own prefetched key
- WHEN the region's boundary hydrates
- THEN every consumer in that subtree reads from an already-hydrated cache entry, issuing no client fetch

#### Scenario: A cross-reading consumer sits inside the region nested below its dependency
- GIVEN `BudgetCategories` reads both `categories` (its own region's key) and `summary` (a key hydrated only by the outer region)
- WHEN the categories region is nested strictly inside the summary region's `<Suspense>` boundary
- THEN `summary` is already hydrated by the time `BudgetCategories` mounts, so it reads both `categories` and `summary` from hydrated cache without issuing a client fetch for either
