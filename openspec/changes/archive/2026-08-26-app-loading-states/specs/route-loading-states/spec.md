# Route Loading States Specification

## Purpose

Instant, in-flight navigation feedback for every `(app)` and `(auth)` route
segment via the Next.js `loading.tsx` file convention, restoring the
page-shaped feedback `main` provides via client-side `isLoading`, without
introducing any data-layer change.

## Requirements

### Requirement: Every `(app)` Route Segment Renders a Page-Shaped Skeleton Fallback

Each of the 7 `(app)` route segments (`dashboard/[groupId]`, `groups`,
`groups/[groupId]/members`, `profile`, `expenses`, `transfers`, `savings`)
and the root `(app)` segment MUST provide a `loading.tsx` that renders a
`Skeleton`-composed fallback shaped to that segment's populated layout, so
navigation shows an immediate page-shaped placeholder instead of a frozen
previous page or a blank screen.

#### Scenario: Navigating to a populated segment shows its shaped skeleton
- GIVEN the user is on `/dashboard/[groupId]` and clicks a nav link to `/expenses`
- WHEN the `/expenses` Server Component has not yet resolved
- THEN a `Skeleton`-composed fallback shaped like the Expenses page renders immediately, and the Dashboard page is no longer visible

#### Scenario: Hard-loading a segment shows its skeleton, not a blank screen
- GIVEN a user opens `/groups` directly (hard navigation)
- WHEN the page has not yet resolved
- THEN the `groups` segment's `Skeleton` fallback renders instead of a blank page

### Requirement: A `groupId`-Only Change Re-Triggers the Segment Fallback

Navigating between two group-scoped routes that differ only by `groupId`
(e.g. switching the active group while on `/dashboard/[groupId]`) MUST
re-trigger that segment's `loading.tsx` fallback, matching `main`'s
`isLoading` behavior. The system MUST NOT suppress the fallback via a
stable `key` or any other de-duplication mechanism.

#### Scenario: Switching the active group re-shows the fallback
- GIVEN the user is on `/dashboard/groupA`
- WHEN they switch the active group to `groupB`, navigating to `/dashboard/groupB`
- THEN the dashboard segment's `loading.tsx` fallback renders again before `groupB`'s data appears

#### Scenario: No minimum display duration is enforced
- GIVEN a `groupId` switch resolves in under 50ms
- WHEN the fallback would only flash briefly
- THEN the system renders it for exactly as long as the navigation takes, with no artificial minimum delay

### Requirement: Every `(auth)` Route Segment Renders a Centered Spinner Fallback

Each `(auth)` segment (login, signup, forgot-password, reset-password,
complete-profile) MUST render a centered, full-page `Spinner` — not a
`Skeleton` — while it awaits its session check
(`supabase.auth.getUser()`, and additionally `UserService.getUser` for
complete-profile), because the final content shape is not yet meaningful
before that check resolves.

#### Scenario: Login awaits its session check with a Spinner
- GIVEN a user navigates to `/login`
- WHEN `supabase.auth.getUser()` has not yet resolved
- THEN a centered `Spinner` renders, not a page-shaped `Skeleton`

#### Scenario: Complete-profile awaits both session and profile checks with a Spinner
- GIVEN a user navigates to `/complete-profile`
- WHEN either `supabase.auth.getUser()` or `UserService.getUser` has not yet resolved
- THEN a centered `Spinner` renders for the entire wait

### Requirement: Fallback Type Is Chosen by Content-Shape Knowledge, Not Route Group Membership Alone

A route segment's fallback MUST use `Skeleton` when its populated layout
shape is already known ahead of the data fetch, and MUST use `Spinner`
when the fetch itself determines whether any page shell applies (e.g., an
auth gate). Route group alone (`(app)` vs `(auth)`) MUST NOT be the sole
justification — each segment's fallback choice MUST match its actual
pre-fetch content-shape knowledge.

#### Scenario: A shape-known segment never falls back to Spinner
- GIVEN any `(app)` segment whose populated layout is already known
- WHEN its `loading.tsx` renders
- THEN it uses `Skeleton`, never `Spinner`

#### Scenario: A shape-unknown segment never falls back to Skeleton
- GIVEN any `(auth)` segment whose content depends on an unresolved session check
- WHEN its `loading.tsx` renders
- THEN it uses `Spinner`, never `Skeleton`
