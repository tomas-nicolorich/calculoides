# Proposal: Next.js App Router Migration

## Intent

`frontend/` (Vite SPA) and `api/` (frameworkless Vercel functions) are two workspaces held together by hand-built infrastructure: a `?action=` dispatcher in each of the 4 API functions, a `vercel.json` rewrite table that maps friendly paths onto those query strings, and an Express shim (`api/_src/server.ts`) that re-implements both so local dev matches production. That dispatcher exists only to keep ~20 logical actions inside Vercel's 12-function Hobby cap (confirmed: the cap applies to frameworkless deployments; Next.js auto-bundles and is exempt in practice). Every read also pays a client→own-API bearer-token round trip.

Next.js App Router removes all three pieces of infrastructure as a side effect of adopting the framework, and lets reads render server-side against Prisma directly. Affected workspaces: **frontend, api, shared** (root tooling too).

**Hard constraint**: Supabase RLS does **not** protect API traffic today — Prisma connects via `pg.Pool`/`DATABASE_URL`, bypassing PostgREST, so `auth.uid()` is never set. Every authorization decision lives in explicit in-handler ownership/membership checks, the exact class of check hardened in `ef2221c`/`ae9c3d8`/`109250d`. Each check MUST be ported verbatim **with a test** before its old handler is deleted. RLS is defense-in-depth, not a backstop.

## Scope

### In Scope
- Single Next.js App Router app replacing `frontend/` + `api/`; `shared/` retained.
- `@supabase/ssr` browser/server/middleware clients + `middleware.ts` session refresh; `getUser()` for all server-side authorization. Replaces the bearer-token hop and `api/_src/services/auth.ts`.
- SPA routes → `app/**/page.tsx`; `ProtectedRoute` → middleware + segment layouts; Dashboard read path → Server Components querying Prisma.
- All ~20 `?action=` routes → Server Actions (mutations from UI) or Route Handlers, resource by resource, each with its authorization check and test.
- Deletion of `api/_src/utils/dispatcher.ts`, `api/_src/server.ts`, `vercel.json` API rewrites, `api/_tests/**` rehomed.
- CI workflow gating `npm test` / `lint` / `typecheck` (no such gate exists today).

### Out of Scope
- Changing the DB access strategy to route domain queries through Supabase PostgREST so RLS becomes load-bearing. Prisma keeps its direct connection; RLS policies stay as-is.
- Domain behavior changes. No feature, calculation, or UX change ships in this migration.
- The Bun package-manager evaluation — a separate decision, must not enter these PRs.
- Removing TanStack Query. It stays for client-owned interactive state; only Server-Component-served reads leave it.
- Redesigning components; Base UI + Tailwind 4 components port as Client Components.

## Capabilities

### New Capabilities
- `resource-authorization`: the ownership/membership rules every group, member, transaction, and savings operation MUST enforce at the application layer, stated transport-independently so the port is verifiable rather than tribal knowledge.
- `server-session-auth`: cookie-based session establishment, middleware refresh, server-side `getUser()` verification, protected-segment behavior, and sign-out.

### Modified Capabilities
- `client-data-cache`: which reads remain client-cached once Server Components own the Dashboard read path, and how Server Action mutations invalidate them.

## Approach

Phased strangler toward a full App Router end state. The Next.js app and the existing `api/` functions coexist; `api/` is retired only when the last handler is ported.

| Phase | Slice | Notes |
|---|---|---|
| 0 | Land `fix/supabase-rls-and-api-authorization`; add CI test/build gate | Prerequisite. No migration code. |
| 1 | Next.js shell: app skeleton, `@supabase/ssr` clients, `middleware.ts`, auth pages, protected layout. `api/` untouched and still serving. | Establishes the dual-auth window. |
| 2 | Dashboard read path → Server Components + Prisma | Proves the read pattern; highest payoff, no mutations. |
| 3–6 | Port mutations resource by resource: groups+members → transactions/expenses → transfers → savings | One resource per PR. Authz check + test lands before the old handler is deleted. |
| 7 | Delete dispatcher, `vercel.json` rewrites, Express shim, `api/` workspace; collapse `turbo.json`/root scripts; repoint Playwright `webServer` | Cleanup only, after phase 6. |

| # | Decision | Rationale |
|---|---|---|
| D1 | Strangler, not big-bang | ~20 actions × explicit authz checks is not reviewable in one PR at an 800-line budget; each phase is independently revertible. |
| D2 | Both auth paths valid during phases 1–6 | `@supabase/ssr` cookie session for Next.js; existing `Authorization: Bearer` for un-ported `api/` calls. Both derive from the same Supabase session, so `apiClient.fetch` keeps working unchanged. Middleware MUST NOT block `/api/*` legacy paths. |
| D3 | Mutations → Server Actions; only genuinely external/webhook-ish surfaces → Route Handlers | Server Actions remove the fetch wrapper and give type-safe args; Route Handlers reintroduce the hand-written request parsing the dispatcher already made expensive. |
| D4 | Prisma stays on the direct `DATABASE_URL` connection | Switching to RLS-enforced access is a separate, higher-risk change. Conflating them means a migration where authorization moves layers mid-port. |
| D5 | Authz parity is a per-PR gate, not a final audit | A ported Server Action without its membership/ownership test does not merge. Prevents re-opening the hole `ae9c3d8` closed. |
| D6 | Keep TanStack Query | Ripping it out mid-migration doubles the diff and it just landed. Reads served by Server Components simply stop having a query key. |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/**` | New | Route segments, layouts, Server Actions, Route Handlers, `middleware.ts` |
| `api/*.ts`, `api/_src/handlers/**` | Removed | Ported resource by resource (phases 3–6) |
| `api/_src/utils/dispatcher.ts`, `api/_src/server.ts`, `api/_src/middleware/handler.ts` | Removed | Framework replaces dispatcher, dev shim, and per-handler auth wrapper |
| `api/_src/services/**` (domain services) | Modified | Business logic retained, re-called from Server Actions |
| `api/_src/services/auth.ts`, `frontend/src/shared/api/supabase.ts` | Removed | Replaced by `@supabase/ssr` clients |
| `frontend/src/app/App.tsx`, `providers/AuthProvider.tsx`, `ProtectedRoute.tsx` | Removed | Router + client session bootstrap become App Router + middleware |
| `frontend/src/pages/**`, `widgets/**`, `features/**` | Modified | Move under `app/`; `"use client"` where stateful |
| `frontend/src/shared/api/client.ts` | Modified→Removed | Shrinks as actions port; deleted in phase 7 |
| `vercel.json`, root `package.json`, `turbo.json` | Modified | Rewrites deleted; workspaces collapse to app + `shared` |
| `api/_tests/**`, `frontend/**/*.test.tsx`, `playwright.config.ts` | Modified | Rehomed against Server Actions; `webServer` → `next dev`/`next start` |
| `.github/workflows/` | New | Test/build/typecheck gate (phase 0) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Authorization regression during the port — RLS does not backstop it | High | D5: each ported action ships with its ownership/membership test in the same PR; `resource-authorization` spec is the checklist. Old handler deleted only after its replacement is tested. |
| Phases 2–6 exceed the 800-line review budget | High | Chained PRs on a `nextjs-migration` tracking branch, one resource per PR; split a resource further (read path / mutations) if it still overruns. Only the tracking branch merges to `develop`. |
| Dual auth window leaves routes unauthenticated or unreachable | Med | Middleware matcher explicitly excludes legacy `/api/*`; phase 1 ships an E2E check that both a Next.js page and a legacy API call authenticate for the same session. |
| Test debt: `api/_tests/**` targets handler functions and the dispatcher | Med | Rewrite per resource inside its own phase, never as follow-up. |
| Long-lived half-migrated state | Med | Phase 7 is scheduled, not aspirational; no more than one resource in flight at a time. |
| Client components with module-scope `window`/`localStorage` break SSR | Med | `ActiveGroupContext.readStoredGroupId`'s `typeof window` guard is the precedent to replicate; audited in phase 1. |
| Scope creep (Bun, RLS enforcement, UI redesign) | Med | Explicit non-goals above; reject at PR review. |

## Rollback Plan

Per phase, newest first, on a tracking branch that only merges once complete.

- **Phases 0–1**: additive. Reverting the shell leaves `frontend/` + `api/` untouched and functional.
- **Phase 2**: read-only. Revert restores the client-side Dashboard fetches; no data written differently.
- **Phases 3–6**: each PR deletes one old handler. Revert restores that handler and its `vercel.json` rewrite together — both must be reverted as a unit or the friendly path 404s.
- **Phase 7**: pure deletion; revert restores tooling config. Do not start phase 7 until phases 3–6 are confirmed in production.
- No Prisma schema or migration changes in any phase, so no database rollback is required.

## Dependencies

- `fix/supabase-rls-and-api-authorization` merged (phase 0 prerequisite).
- `next`, `@supabase/ssr` (`@supabase/auth-helpers-nextjs` is deprecated — do not use).
- Vercel project settings switch from frameworkless to Next.js framework preset.

## Success Criteria

- [ ] No `?action=` dispatcher, `vercel.json` API rewrite, or Express dev shim remains.
- [ ] Every authorization check present in `api/_src/handlers/**` at phase 0 has an equivalent check and a passing test against its Server Action or Route Handler.
- [ ] Dashboard renders server-side with no client fetch for its initial data.
- [ ] One deploy, one workspace pair (app + `shared`); `npm run dev` needs no separate API process.
- [ ] CI gates `npm test`, `npm run lint`, `npm run typecheck` on every PR.
- [ ] Playwright suite passes against `next start`.
- [ ] No user-visible behavior change across the whole migration.

## Proposal question round

Execution mode is `automatic`, so these were not asked interactively. The proposal assumes the answer in brackets; correct any before `sdd-spec`/`sdd-design` start.

1. **Timing / urgency** — is this migration driven by a concrete pain (dev friction from the dual workspace, the 12-function ceiling being approached) or is it strategic cleanup? [Assumed: strategic cleanup, no deadline — hence a long phased sequence over a fast big-bang.]
2. **Behavior freeze** — is a strict "no user-visible change" freeze acceptable for the migration's whole duration, including no new features on the pages being ported? [Assumed: yes.]
3. **TanStack Query's future** — after Server Components own reads, should the client cache stay as a long-term layer, or is its eventual removal a goal this migration should aim at? [Assumed: stays; D6.]
4. **RLS enforcement** — should making RLS actually load-bearing (routing domain queries through Supabase with the user's JWT) be a follow-up change, or is app-layer authorization the permanent design? [Assumed: explicitly out of scope here, undecided as a follow-up.]
5. **Deployment window** — is a period where production runs a half-migrated app (Next.js pages + legacy `api/` functions) acceptable, or must the whole migration land behind one cutover? [Assumed: acceptable; the strangler design depends on it.]

## Downstream (open for spec/design)

- Server Action vs. Route Handler per action for the ~20-action inventory (D3 states the rule; the mapping is a design artifact).
- Where Prisma is instantiated in a Next.js runtime (singleton across hot reloads / serverless invocations).
- Whether `shared/` stays a workspace or folds into the app.
- Exact `middleware.ts` matcher, including the legacy `/api/*` exclusion and static-asset skips.
- Error-handling replacement for `withErrorHandling` (Server Action return shapes vs. thrown errors + `error.tsx`).
- Whether phases 3–6 are ordered by risk (groups/members first) or by payoff.
