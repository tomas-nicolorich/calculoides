# Exploration: Add loading states (skeleton/spinner) across the Next.js app

## Current State

Zero `loading.tsx` files and zero `<Suspense>` boundaries exist anywhere under `app/` (confirmed via glob/grep across the whole tree). Every route falls into one of two data patterns, and neither shows in-flight feedback during server work today:

1. **"Heavy server" pages** — `app/(app)/layout.tsx` (root shell: `getUser()` + `GroupService.getGroupsForUser` + `UserService.getUser`, all awaited), `dashboard/[groupId]/page.tsx` (auth + membership check + 3 parallel `prefetchQuery` calls into a `HydrationBoundary`), `groups/page.tsx`, `members/page.tsx`, `profile/page.tsx`. All are `async function` Server Components that fully await every fetch/auth check before returning any JSX. With no `loading.tsx`/`Suspense`, a `next/link` navigation into one of these visibly freezes on the previous page (or blank on hard nav/reload) for the duration of the DB round-trips.
2. **"Lean server + client-owned fetch" pages** — `expenses/[groupId]/page.tsx`, `transfers/[groupId]/page.tsx`, `savings/[groupId]/page.tsx`. `page.tsx` only does the (fast) auth+membership check, then renders a `"use client"` component that fetches via TanStack Query itself. These three already implement real **skeleton row/card loading** using the shared `app/_ui/Skeleton.tsx` primitive, gated on each client's own `isLoading` — but this only covers the *second* wait (the query fetch), not the *first* (the page's own auth check).

`app/_ui/Skeleton.tsx` is a real, actively-used primitive (used in `SavingsClient.tsx`, `TransfersClient.tsx`, `ExpensesClient.tsx`). Its doc comment says "Reach for `Spinner` on full-page loads instead," but no `Spinner` component exists yet in `app/_ui/`. The archived `openspec/changes/archive/2026-08-18-nextjs-migration-ui-fixes/design.md` explicitly deferred it: *"`Spinner.tsx` / `UserDisplay.tsx`. Excluded until a concrete usage appears in a ported file; if PR 12–16 hits one, it is a same-PR addition (~63 lines), not a new slice."* `UserDisplay.tsx` has since been ported; `Spinner.tsx` never got its concrete usage — this change is that trigger.

**Dashboard widgets already invented ad-hoc loading UI that duplicates/conflicts with the Skeleton convention.** `RecentExpenses.tsx`, `BudgetCategories.tsx`, `RemainingBalance.tsx`, and `IncomeOverview.tsx` (all under `dashboard/[groupId]/_widgets/`) each branch on `isLoading` but render plain `<p>Loading…</p>` text instead of a `Skeleton`-shaped placeholder. `BudgetCategories.tsx`'s nested `TransferHistory` accordion also uses plain "Loading…" text.

**Mutation pending-state feedback already exists and is solid** — every Server-Action-backed mutation checked disables its trigger button and swaps label text via TanStack Query's `useMutation().isPending`. No `useTransition`/`useFormStatus`/`useActionState` usage exists anywhere. No route-transition progress indicator (nprogress/toploader) exists or is installed.

`AppShell.tsx` (`"use client"`) renders the persistent sidebar/mobile nav chrome and receives `children` from the Server Component `app/(app)/layout.tsx`. A per-segment `loading.tsx` renders *inside* the already-mounted shell — nav/sidebar/switcher stay static, only the content area shows the fallback.

Installed version: `next@^16.3.0` (not 15) — `loading.tsx`/`<Suspense>` mechanics are unchanged between Next 15 and 16.

No existing ADR or `CONTEXT-MAP.md`/`CONTEXT.md` mentions loading/skeleton/spinner conventions — this is unaddressed architectural ground.

## Prod parity (confirmed via `git show origin/main`, orchestrator follow-up)

`frontend/src/shared/ui/Spinner.tsx` on prod: sizes sm/md/lg (`h-6/h-8/h-12`), `role="status" aria-label="Loading"`, animated via a conic-gradient ring masked with `radial-gradient` (not a plain border-spin). Doc comment: "Rotating conic-gradient ring — the full-page loading indicator. Reach for `Skeleton` for in-content loading instead" — mirrors the Skeleton.tsx comment already ported into Next.js verbatim.

Prod's `Spinner` is used in exactly 2 places: `app/providers/ProtectedRoute.tsx` (full-page auth-gate spinner while checking session) and `pages/LoginPage.tsx` (submit-loading spinner). It is **not** used for per-page/per-route navigation loading anywhere in prod.

Prod's actual "instant skeleton on navigation" behavior comes from each page component (`DashboardPage.tsx`, `GroupsPage.tsx`, `SavingsPage.tsx`, `TransfersPage.tsx`, `ExpensesPage.tsx`) rendering its **own full-page-shaped skeleton** (e.g. `DashboardSkeleton()`, `GoalCardSkeleton()`) composed from the shared `Skeleton` primitive, gated on `isLoading` — not a generic route-level spinner. Prod's Dashboard/Groups/Savings/Transfers/Expenses pages *all* have dedicated page-skeleton components today; Next.js currently only has row/card-level skeletons ported for Expenses/Transfers/Savings (missing the page-header-level shape) and none for Dashboard/Groups/Members/Profile.

This confirms the design direction: port `Spinner.tsx` verbatim (conic-gradient ring, sizes sm/md/lg) for auth-gate/submit-style full-page waits only, and build a page-shaped `Skeleton`-composed fallback per route segment (via `loading.tsx`) for navigation loading — matching prod's actual per-page skeleton components, not a generic spinner-on-nav approach.

## Affected Areas

- `app/(app)/dashboard/[groupId]/page.tsx` — heavy server prefetch (3 parallel queries), zero boundary
- `app/(app)/layout.tsx` — root shell awaits `getUser()` + 2 more service calls before any child can render
- `app/(app)/groups/page.tsx`, `app/(app)/members/page.tsx`, `app/(app)/profile/page.tsx` — same heavy-server shape, no boundary
- `app/(app)/expenses/[groupId]/page.tsx`, `.../transfers/[groupId]/page.tsx`, `.../savings/[groupId]/page.tsx` — lean server pages; loading.tsx would additionally cover the auth-check wait not currently covered by the client Skeleton
- `app/_ui/Skeleton.tsx` — existing shared primitive to reuse
- `app/_ui/Spinner.tsx` — does not exist yet; needs to be created (ported from prod)
- `app/(app)/dashboard/[groupId]/_widgets/{RecentExpenses,BudgetCategories,RemainingBalance,IncomeOverview}.tsx` — ad-hoc plain-text "Loading…" states to reconcile into the Skeleton convention
- `app/(app)/AppShell.tsx` — stable shell; per-segment `loading.tsx` renders inside it without remounting nav
- `app/(auth)/**` pages — share the same zero-`loading.tsx` gap; out of scope unless orchestrator/user says otherwise (pre-auth, typically single-visit)

## Approaches Considered

1. **`loading.tsx` file-convention per route segment** (Next.js automatic Suspense boundary) — Low effort, reuses existing `Skeleton` primitive and 3 already-proven skeleton shapes, no architecture change, matches the file-convention idiom already used for `page.tsx`/`layout.tsx`. Coarse-grained per-segment fallback; may re-trigger on `groupId`-only navigation (needs an explicit decision).
2. **Explicit `<Suspense fallback>` inside each `page.tsx`** — Medium-High effort, finer streaming, but re-opens the settled prefetch/dehydrate architecture from the archived migration design and needs new tests under strict TDD.
3. **Both, sequenced** — ship #1 now; defer #2 unless a specific widget later needs true partial streaming.

## Recommendation

Approach 1, sequenced as #3:
- Add `loading.tsx` to all 7 `(app)` route segments (dashboard, groups, members, profile, expenses, transfers, savings) plus a root-level `app/(app)/loading.tsx` for the slowest path (first protected-route load before groups/user resolve).
- Create `app/_ui/Spinner.tsx` (ported from prod's conic-gradient ring, sizes sm/md/lg) for the outermost/root fallback where no page shape is known yet.
- Build page-shaped `Skeleton`-composed fallbacks per route `loading.tsx`, lifting the shapes already proven in Savings/Transfers/Expenses clients and porting prod's Dashboard/Groups skeleton shapes for the 4 routes that don't have one yet.
- Reconcile the 4 dashboard widgets' plain-text "Loading…" into `Skeleton`-based placeholders in the same change.
- Treat `(auth)/**` as out of scope unless the user says otherwise.

## Risks

- `loading.tsx` re-trigger granularity on dynamic segments (e.g. switching groups via `GroupSwitcher`) — needs an explicit design decision (acceptable vs. needs `key`-based suppression).
- Dashboard widget reconciliation touches 4 files with existing tests (strict TDD: RED tests need updating first for any `Loading…` → `Skeleton` text/role assertion).
- Root/layout-level `loading.tsx` interaction with the persistent `AppShell` — expected to scope to the `children` slot only per Next.js docs, not yet empirically verified against this app's specific nested-layout structure.

## Ready for Proposal

Yes.
