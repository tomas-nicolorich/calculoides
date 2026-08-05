# Design: Next.js App Router Migration

## Technical Approach

A single Next.js App Router app absorbs `frontend/` and `api/`. The strangler runs *inside* Next from phase 1: a compatibility Route Handler (`app/api/[...legacy]/route.ts`) adapts a `Request` to the existing `ApiRequest`/`ApiResponse` shape and invokes the unchanged exported handlers. This retires `vercel.json` rewrites **and** the Express shim (`api/_src/server.ts`) in phase 1 instead of phase 7, removes the "do root `api/*.ts` functions coexist with the Next preset?" deployment unknown, and gives one place to bridge cookie-session and bearer-token auth. Domain services under `api/_src/services/**` move to `lib/server/services/**` unchanged; Server Actions and Route Handlers call them.

## Architecture Decisions

### Decision: RLS stays non-load-bearing (D4 confirmed — NO-GO)

**Choice**: Prisma keeps the direct `DATABASE_URL` connection. Explicit in-handler / in-action authorization (`resource-authorization`) is the **only** load-bearing layer, in this change and after it. RLS remains SELECT-side defense-in-depth for PostgREST traffic.

**Investigation** (evidence in-repo):

| Finding | Evidence | Consequence |
|---|---|---|
| The app connects as the **table owner** | `prisma/rls.sql:170-176`, `prisma/migrations/20260804000001_.../migration.sql:62-68` | Owner bypasses RLS *and* GRANT/REVOKE. Setting `request.jwt.claims` changes nothing — policies are not evaluated at all. |
| Policies are **SELECT-only** (one `UPDATE` on `group_members`) | `prisma/rls.sql` — 11 tables, no INSERT/UPDATE/DELETE policies | Enabling enforcement fails every write immediately. |
| Connection is **PgBouncer transaction mode** | `README.md:20`, `api/CONTEXT.md:3` | Session-scoped `SET` leaks across pooled clients; only `SET LOCAL`/`set_config(..., true)` inside an explicit transaction is safe. |
| Prisma has no per-request session context | Prisma 7.8 — `api/package.json:18` | Every query must be wrapped in an interactive `$transaction` (BEGIN → set_config → query → COMMIT), tripling round trips and pinning a pooled server connection per query. |
| Several checks are not row-visibility rules | `groups.ts:80` owner-only transfer, `transactions.ts:387` owner-only category delete, `members.ts:78` member-derived groupId | RLS turns these 403s into empty results/404 — a user-visible behavior change the migration explicitly freezes. |

**Verdict**: NO-GO. The blocker is not Prisma — the mechanism exists (`FORCE ROW LEVEL SECURITY` on all tables + a non-owner role + `$transaction`-wrapped `set_config('request.jwt.claims', …, true)` via a `$extends` client extension). The blockers are a **database-privilege redesign** and **eleven tables of missing write policies**, both production-outage-risk changes with no relation to routing. A future standalone change may adopt exactly that mechanism; it does not enter these PRs.

**Alternatives rejected**: (a) route domain reads through PostgREST — abandons Prisma, contradicts the constraint; (b) enable enforcement now, keep app checks — writes break; (c) `BYPASSRLS`-off role without FORCE — no effect, owner still bypasses.

**Non-negotiable**: every ported Server Action / Route Handler carries its ownership/membership check and a test in the same PR. RLS never substitutes.

### Decision: Keep TanStack Query; Server Components **prefetch into** it

**Choice**: Server Components fetch first-paint data by calling services directly, then `dehydrate` it into the *existing* query keys behind a `HydrationBoundary`. Client hooks (`useDashboardSummary`, `useCategoriesList`, …) are unchanged.

**Rationale**: App Router sets `staleTimes.dynamic: 0` by default, so client-side navigation back to a Server Component page re-fetches its RSC payload — the exact re-fetch the `client-data-cache` spec forbids ("Cache-Served Navigation Within Staleness Window"). Server Components alone would *regress* that capability. Hydration keeps the 30s/5min staleness contract, focus/reconnect refetch, prefix invalidation, and sign-out clearing intact while removing the client→API waterfall on hard load. Diff for hooks ≈ 0.

**Consequence**: server-prefetched keys still need a GET Route Handler, because a mounted query refetching on focus cannot call a Server Component.

**Alternatives rejected**: (a) drop TanStack Query, push filters to `searchParams` — loses `keepPreviousData` (A8) and cached back-navigation; (b) raise `staleTimes.dynamic` — caches whole RSC payloads, not per-query, and cannot express per-key staleness or prefix invalidation.

### Decision: Server Action vs Route Handler

**Rule**: mutations invoked from UI → **Server Action**. Any read a TanStack query owns (filtered, paginated, or refetch-on-focus) → **Route Handler (GET)**. Reads consumed only at first paint → **direct service call in the Server Component**, no HTTP surface. Server Actions are never query functions: they are POST-only, uncacheable, and serialize per client.

| Surface | Actions |
|---|---|
| Server Component (no endpoint) | `summary`, `categories-list`, groups `list`, `members list`, `savings-goals-list`, `users me` (first paint only) |
| Route Handler GET | `/api/expenses`, `/api/transfers`, `/api/transfers/by-category`, plus refetch endpoints for `/api/summary`, `/api/categories`, `/api/savings` |
| Server Action | group `create`/`archive`/`undo-archive`/`transfer`(ownership), invitations `create`/`respond-invite`, `update-income`, `remove-member`, users `upsert`, expense `create`/`update`/`delete`/`delete-all`, transfer `create`/`delete`/`delete-all`, category `create`/`update`/`delete`, savings goal `create`/`update`/`delete`, contribution `upsert`/`delete` |

### Decision: dual-auth bridged in one adapter

`middleware.ts` refreshes the `@supabase/ssr` cookie session on every non-static request. Its redirect-to-`/login` branch applies **only to non-`/api` paths**; `/api/*` returns 401 JSON instead. The legacy adapter injects a synthetic `Authorization: Bearer <access_token>` from the server Supabase client when the request carries no header, so `withAuth`/`getUserFromSession` still verifies the token. Both paths derive from one Supabase session; `apiClient.fetch` keeps working unchanged.

```ts
// middleware.ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
```

## Data Flow

    Hard load:   Browser → middleware (refresh cookie) → RSC page → service → Prisma
                                                            └→ dehydrate → HydrationBoundary → TanStack cache
    Client nav:  Component → useQuery → cache hit (within staleTime) → no request
    Refetch:     useQuery → GET /api/<resource> → Route Handler → authz check → service
    Mutation:    Client form → Server Action → authz check → service → invalidateQueries(prefix)
    Legacy:      apiClient.fetch → app/api/[...legacy] → adapter → withErrorHandling(withAuth(dispatch))

## File Changes

| File | Action | Description |
|---|---|---|
| `app/layout.tsx`, `app/(auth)/**`, `app/(app)/**` | Create | Route segments; `(app)/layout.tsx` hosts AppShell + server-fetched group list |
| `app/(app)/{dashboard,expenses,transfers,savings}/[groupId]/page.tsx` | Create | Server Components; prefetch + `HydrationBoundary` |
| `app/api/[...legacy]/route.ts` | Create → Delete (ph. 7) | Request↔`ApiRequest`/`ApiResponse` adapter + friendly-path→`{handler, action}` table |
| `app/api/{expenses,transfers,summary,categories,savings}/route.ts` | Create | GET endpoints backing TanStack keys |
| `middleware.ts`, `lib/supabase/{client,server,middleware}.ts` | Create | `@supabase/ssr` three-client setup |
| `lib/actions/{group,member,user,expense,transfer,category,savings}.ts` | Create | `"use server"`; shared across pages, not colocated per segment |
| `lib/prisma.ts` | Create | Port of `api/_src/utils/prisma.ts` verbatim (globalThis singleton); server-only import path |
| `lib/server/services/**` | Move | From `api/_src/services/**`, unchanged |
| `vercel.json` | Modify (ph. 1) → Delete | All rewrites removed once the adapter lands |
| `api/_src/{server.ts,utils/dispatcher.ts,middleware/handler.ts}`, `api/*.ts` | Delete (ph. 7) | Framework replaces dev shim, dispatcher, auth wrapper |
| `frontend/src/app/{App.tsx,providers/AuthProvider.tsx,providers/ProtectedRoute.tsx}` | Delete | Router + client bootstrap → App Router + middleware |
| `frontend/src/{shared,entities,features,widgets,pages}/**` | Move | → `components/**`; `"use client"` where stateful |
| `.github/workflows/ci.yml` | Create (ph. 0) | `npm test` / `lint` / `typecheck` gate |

## Interfaces / Contracts

```ts
// lib/actions/result.ts — replaces withErrorHandling for Server Actions.
// Thrown errors are opaque in production builds, so actions return, never throw.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: 400 | 403 | 404 | 500 };

// lib/server/errors.ts — one message→status table, reused by both surfaces.
// Ports the existing catch-blocks ("Not a member of this group" → 403, etc.).
export function toStatus(message: string): 400 | 403 | 404 | 500;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Every ported authz check (owner-only transfer/category-delete, member-derived `groupId`, group access on all group-scoped reads) | Vitest against the Server Action / Route Handler, mocking services — one test per check, same PR as the port |
| Unit | `toStatus` mapping, `ActionResult` shapes, legacy adapter (`204 .end()`, `req.query`, bearer injection) | Vitest |
| Integration | Hydration: server-prefetched key is cache-hit on client nav within staleTime; refetch-on-focus hits the Route Handler | RTL + `HydrationBoundary` |
| E2E | Phase 1 gate: one Next.js page **and** one legacy `/api/*` call authenticate from the same session | Playwright against `next dev`/`next start` |

## Threat Matrix

The reference matrix targets shell/VCS/PR process boundaries; none exist here.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no file-classification or execution boundary |
| Git repository selection | N/A — no VCS automation |
| Commit state | N/A — no VCS automation |
| Push state | N/A — no VCS automation |
| PR commands | N/A — no PR automation |

HTTP-routing/auth boundary (**applicable**, this change's real adversarial surface):

| Case | Expected safe behavior | RED test |
|---|---|---|
| Unauthenticated request to a protected page | Middleware redirects to `/login` | E2E |
| Unauthenticated request to `/api/*` | 401 JSON, **never** an HTML redirect | Route Handler test |
| Legacy path with a cookie session but no `Authorization` header | Adapter injects the verified token; handler behaves identically | Adapter test |
| Server Action invoked with a `groupId` the caller does not belong to | 403 `ActionResult`, no data touched | Per-action authz test |
| Cross-group id substitution (member of A passes an id from B) | Authorization derived from the resource's own `groupId` (`members.ts:78` precedent) | Per-action authz test |
| Route Handler reached before its authz check ports | Handler does not merge (D5 gate) | CI review gate |

## Migration / Rollout

Phases per the proposal, with two refinements:

- **Phase 1 now also deletes `vercel.json` rewrites and `api/_src/server.ts`**, replaced by the adapter. `npm run dev` needs no second process from phase 1, and rollback is one file, not two out-of-sync ones.
- **Phases 3–6 revert as a single unit** by construction: deleting a handler and removing its entry from the adapter's path table happen in the same file-level change, so a revert cannot leave a friendly path 404ing (the proposal's stated failure mode with `vercel.json`).
- Phase 2 is read-only; revert restores client-side Dashboard fetches (hooks were never modified, only prefetched into).
- No Prisma schema or RLS migration in any phase — no database rollback.
- Phase 7 is pure deletion; do not start until 3–6 are confirmed in production.

## Open Questions

- [ ] Whether `shared/` folds into the app or stays a workspace — decide in phase 1 (leaning: stays; Zod schemas are imported by both server and client code).
- [ ] Phase 3–6 ordering: risk-first (groups/members) is recommended over payoff-first, since groups/members carries the highest authz-regression blast radius.
