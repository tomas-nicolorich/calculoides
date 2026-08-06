# Tasks: Next.js App Router Migration

## Review Workload Forecast

Review budget applied this session: **800 changed lines** (overrides the skill default of 400; guard literal below stays as the required parseable label).

| Field | Value |
|-------|-------|
| Estimated changed lines | ~7,000–9,000 total across all phases |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 13 native GitHub stacked PRs, bottom PR based on `develop` (see below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (trunk = `develop`) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main (trunk = `develop`)
400-line budget risk: High

Per-phase forecast (lines = additions + deletions, against the 800-line session budget):

| Phase | Est. lines | Risk vs 800 | Chained? |
|---|---|---|---|
| 0 | 80–150 | Low | No |
| 1a Shell | 600–700 | Medium | Yes (base = `develop`) |
| 1b Adapter cutover | 500–700 | Medium | Yes (base = 1a) |
| 2 Dashboard hydration | 500–700 | Medium | No (single PR, base = 1b) |
| 3a Groups actions | 700–900 | High | Yes (base = 2) |
| 3b Members+Users actions | 700–900 | High | Yes (base = 3a) |
| 4a Expense mutations | 700–900 | High | Yes (base = 3b) |
| 4b Categories + GET handlers | 600–800 | Medium-High | Yes (base = 4a) |
| 5 Transfers | 700–900 | High | Yes (base = 4b) |
| 6a Savings actions | 600–800 | Medium-High | Yes (base = 5) |
| 6b Savings GET + full transactions.ts teardown | 500–700 | Medium | Yes (base = 6a) |
| 7 Cleanup | 400–600 | Medium | No (single PR, base = 6b, merges stack into `develop`) |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 0 | CI gate lands, prerequisite branch merged | PR 0 | `npm run test && npm run lint && npm run typecheck` | `.github/workflows/ci.yml` on push | Revert workflow file; no code touched |
| 1a | Next.js shell: 3 Supabase clients, `middleware.ts`, auth pages, protected layout | PR 1a (base: `develop`) | `npm test -- middleware` | `next dev`, sign in manually | Delete `app/`, `lib/supabase/**`, `middleware.ts`; legacy app untouched |
| 1b | Legacy adapter route + vercel.json/Express-shim retirement | PR 1b (base: 1a) | `npm test -- legacy-adapter` | Playwright dual-auth E2E vs `next dev` | Revert adapter file + restore `vercel.json`/`api/_src/server.ts` as one unit |
| 2 | Dashboard Server Component + hydration + GET refetch endpoints | PR 2 (base: 1b) | `npm test -- dashboard` | RTL hydration test + manual nav | Revert page; client hooks unchanged, old fetch path returns |
| 3a | Groups Server Actions ported + tests | PR 3a (base: 2) | `npm test -- groups.action` | Manual: create/archive/transfer group | Restore `api/_src/handlers/groups.ts` + adapter entries together |
| 3b | Members+Users Server Actions ported + tests + page move + delete old handlers/entry files | PR 3b (base: 3a) | `npm test -- members.action users.action` | Manual: remove member, update income, profile upsert | Restore `members.ts`/`users.ts` handlers + adapter entries together |
| 4a | Expense Server Actions ported + tests | PR 4a (base: 3b) | `npm test -- expense.action` | Manual: create/update/delete expense | Restore expense branch of `api/_src/handlers/transactions.ts` |
| 4b | Category actions + GET `/api/expenses`,`/api/summary`,`/api/categories` + page move | PR 4b (base: 4a) | `npm test -- category.action expenses.route` | RTL refetch-on-focus test | Restore category branch + GET route handlers together |
| 5 | Transfer actions + GET `/api/transfers`,`/api/transfers/by-category` + page move | PR 5 (base: 4b) | `npm test -- transfer.action` | Manual: create/delete transfer | Restore transfer branch + adapter entries together |
| 6a | Savings goal + contribution actions + tests | PR 6a (base: 5) | `npm test -- savings.action` | Manual: create goal, contribute | Restore savings branch of handler |
| 6b | GET `/api/savings` + page move + delete `api/transactions.ts`, `api/_src/handlers/transactions.ts` | PR 6b (base: 6a) | `npm test -- savings.route` | Manual: savings page nav | Restore full `transactions.ts` handler + entry file as one unit |
| 7 | Delete dispatcher, handler.ts, legacy adapter, `api/` workspace, collapse turbo/workspaces, repoint Playwright | PR 7 (base: 6b, merges into `develop`) | `npm run test && npm run build` | Playwright full suite vs `next start` | Revert deletions; each stacked branch still preserves its own 1a–6b history |

## Phase 0: Prerequisite & CI Gate

- [ ] 0.1 Merge `fix/supabase-rls-and-api-authorization` into `develop` before starting migration work — `develop` is the bottom-of-stack base branch for PR 1a.
- [ ] 0.2 Create `.github/workflows/ci.yml` running `npm test`, `npm run lint`, `npm run typecheck` on PRs. (proposal Success Criteria)
- [ ] 0.3 Document the D5 PR gate: no Server Action/Route Handler merges without its ownership/membership test in the same PR. (Threat Matrix: "Route Handler reached before its authz check ports")

## Phase 1a: Next.js Shell

- [x] 1a.0 Scaffold Next.js (App Router) at the repo root: add `next`, `@supabase/ssr`, `@supabase/supabase-js` as root dependencies; create root `next.config.ts`, `app/layout.tsx`, `app/globals.css` (reuse the Tailwind 4 setup from `frontend/`); add root `dev:next`/`build:next`/`start:next` scripts (kept separate from the existing `turbo run dev`/`build` pipeline so `frontend`/`api` keep working unmodified during the transition); confirm `next dev` boots and renders a placeholder page without touching `frontend/` or `api/`. (Not in the original design doc — Next.js was never actually installed; this is the missing bootstrap step design/tasks assumed.)
- [x] 1a.1 Create `lib/supabase/client.ts` (browser client), `lib/supabase/server.ts` (server client), `lib/supabase/middleware.ts` (`@supabase/ssr` three-client setup).
- [x] 1a.2 Create root `middleware.ts`: refresh session cookie on every matched request via `lib/supabase/middleware.ts`; matcher excludes `_next/static`, `_next/image`, favicon, static assets. (server-session-auth: "Middleware Refreshes the Session on Every Matched Request")
- [x] 1a.3 [RED] Write middleware test: unauthenticated request to a protected page redirects to `/login`. (Threat Matrix case 1)
- [x] 1a.4 [RED] Write middleware test: request to `/api/*` is NOT intercepted by the redirect branch. (server-session-auth: "Legacy API paths are excluded from the matcher")
- [x] 1a.5 [GREEN] Implement middleware redirect-for-pages / passthrough-for-`/api` branching to pass 1a.3–1a.4.
- [x] 1a.6 Create `app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `complete-profile/page.tsx` from `frontend/src/pages/{Login,Signup,ForgotPassword,ResetPassword,CompleteProfile}Page.tsx`; mark client-interactive forms `"use client"`. (Deviation: lean new implementations wired to `lib/supabase/client.ts`, not full ports of the `shared/ui`-atom-based forms — see apply-progress.)
- [x] 1a.7 Create `app/(app)/layout.tsx` hosting `AppShell` (port of `frontend/src/app/ui/AppShell.tsx`) + server-fetched group list (`GroupListContext` data via direct service call, no client fetch). (Deviation: group list stubbed to `[]` pending 1b.12's `lib/server/services` move; nav chrome is a lean placeholder — see apply-progress.)
- [x] 1a.8 [RED] Write test: protected segment with no/invalid session redirects without rendering content. (server-session-auth: "Protected Segments Require a Verified Session")
- [x] 1a.9 [RED] Write test: tampered cookie without a valid Supabase session is treated as unauthenticated by `getUser()`.
- [x] 1a.10 [GREEN] Implement `getUser()`-based verification in `app/(app)/layout.tsx` to pass 1a.8–1a.9.
- [x] 1a.11 Audit ported client components for module-scope `window`/`localStorage` access; replicate `ActiveGroupContext.readStoredGroupId`'s `typeof window` guard pattern (proposal Risk: SSR breakage). (Audit result: only usage found is `window.location.origin` inside `ForgotPasswordForm`'s submit handler — function-scoped, not module-scope; no guard needed.)
- [x] 1a.12 Decide `shared/` fate: keep as workspace (Zod schemas imported by server + client); document in `CONTEXT-MAP.md`.

## Phase 1b: Legacy Adapter Cutover

- [x] 1b.1 Create `app/api/[...legacy]/route.ts`: adapt `Request`/`NextResponse` to `ApiRequest`/`ApiResponse` (`api/_src/middleware/handler.ts` shapes), plus a friendly-path → `{handler, action}` table replacing `vercel.json` rewrites. (`app/api/[...legacy]/route.ts` + `routes-table.ts`, exhaustively ported from every `vercel.json` rewrite rule — see apply-progress.)
- [x] 1b.2 [RED] Adapter test: `res.status().json()` chaining and `.end()` for 204 responses work through the shim.
- [x] 1b.3 [RED] Adapter test: `req.query` populated correctly for both dynamic segments (`:id`) and query-string actions.
- [x] 1b.4 [RED] Adapter test: legacy path with a cookie session but no `Authorization` header — adapter injects a synthetic bearer token from the server Supabase client, handler behaves identically. (Threat Matrix case 3; server-session-auth: "Both Auth Paths Derive From the Same Supabase Session")
- [x] 1b.5 [RED] Adapter/Route Handler test: unauthenticated request to `/api/*` returns 401 JSON, never an HTML redirect. (Threat Matrix case 2)
- [x] 1b.6 [RED] Test: legacy bearer token from an unrelated/expired session is rejected with 401. (server-session-auth: "Legacy bearer token from an unrelated/expired session is rejected")
- [x] 1b.7 [GREEN] Implement the adapter to pass 1b.2–1b.6, invoking unchanged `withErrorHandling(withAuth(dispatch(...)))` chains from `api/_src/{middleware/handler.ts,utils/dispatcher.ts}`.
- [x] 1b.8 [E2E] Playwright test: one Next.js page and one legacy `/api/*` call authenticate from the same session. (proposal Phase-1 gate; server-session-auth: "Same session authenticates both") — written (`e2e/dual-auth.spec.ts` + root `playwright.config.ts`), NOT executed against a live browser/Supabase project in this sandbox — see apply-progress Deviations.
- [x] 1b.9 Delete `vercel.json` API rewrites (keep only the SPA catch-all if still needed, or delete the file if Vercel's Next.js preset makes it redundant). — deleted the whole file (Next.js preset makes both the API rewrites and the SPA catch-all redundant; see apply-progress).
- [x] 1b.10 Delete `api/_src/server.ts` (Express dev shim); update root `dev`/`dev:local` scripts to run only `next dev`.
- [x] 1b.11 Create `lib/prisma.ts` as a verbatim port of `api/_src/utils/prisma.ts` (globalThis singleton), server-only import path.
- [x] 1b.12 Move `api/_src/services/**` to `lib/server/services/**` unchanged (import-path updates only, no logic changes). — real `git mv` (not duplication) with consumer import-path fixes across 4 handlers + ~20 pre-existing tests; `auth.ts` deliberately excluded from the move — see apply-progress Deviations for why.

## Phase 2: Dashboard Read Path → Server Components

- [x] 2.1 Create `app/(app)/dashboard/[groupId]/page.tsx` as a Server Component calling `lib/server/services/{budget,summary}` directly for first-paint `summary`/`categories-list` data. (Extra, not separately numbered: page itself gates on `isGroupMember` + `notFound()`, per `lib/server/services/summary.ts`'s doc comment that services perform no authz themselves — see apply-progress.)
- [x] 2.2 Wire `dehydrate()`/`HydrationBoundary` to prefetch into the existing TanStack Query keys used by `useDashboardSummary`, `useCategoriesList` — client hooks stay unchanged. (Deviation: new lean `app/(app)/dashboard/[groupId]/queries.ts` hooks, not the literal `frontend/src/shared/api/dashboardHooks.ts` functions — reuses the same `queryKeys` tuples unchanged; see apply-progress Deviations for why literal reuse breaks the Next build.)
- [x] 2.3 Create `app/api/summary/route.ts` and `app/api/categories/route.ts` (GET) backing refetch-on-focus for the same query keys, calling the moved services with the resource's own `groupId` authz check. (resource-authorization: "Group-Scoped Budget Resources Require Membership")
- [x] 2.4 [RED] RTL test: server-prefetched key is a cache-hit on client nav within the staleness window (no refetch). (client-data-cache: "Server-Component-served read has no query key")
- [x] 2.5 [RED] RTL test: refetch-on-focus for a server-prefetched key hits the new GET Route Handler.
- [x] 2.6 [GREEN] Implement hydration wiring to pass 2.4–2.5.
- [x] 2.7 [RED] Route Handler test: non-member of group G denied 403 on `/api/summary?groupId=G`, `/api/categories?groupId=G`. (resource-authorization: "Non-member denied on transfer/savings/expense access")
- [x] 2.8 [GREEN] Implement the membership check in both route handlers to pass 2.7.

## Phase 3a: Groups Server Actions

- [x] 3a.1 [RED] Test: owner reads group G detail → returned; non-member denied 403. (resource-authorization: "Group Access Requires Membership or Ownership") — added a `read` Server Action (not literally enumerated in 3a.2's action list, but required to exercise this scenario at the Server Action layer per design's `isGroupMember` reuse instruction) — see apply-progress Deviations.
- [x] 3a.2 [GREEN] Create `lib/actions/group.ts` `create`/`archive`/`undoArchive`/`transferOwnership` Server Actions calling `lib/server/services/group.ts`, porting the ownership check from `api/_src/handlers/groups.ts:80`.
- [x] 3a.3 [RED] Test: non-owner invoking `transferOwnership` on a group they don't own is denied 403, no data mutated. (Threat Matrix case 4) — genuine RED confirmed by temporarily reverting the `isGroupOwner` check and re-running (see apply-progress TDD evidence).
- [x] 3a.4 [GREEN] Enforce owner-only check for `transferOwnership`/`archive`/`undoArchive`. (archive/undoArchive already enforce ownership inside `ArchiveService`; the action surfaces that via `toStatus`, verified with tests asserting the 403 mapping.)
- [x] 3a.5 [RED] Test: invitation `create`/`respondInvite` — only a group member can create; only the invited user can respond. — genuine RED confirmed for both checks via the same temporary-revert method.
- [x] 3a.6 [GREEN] Create `invitationCreate`/`respondInvite` actions. (`respondInvite` adds an invited-user-only gate before calling either accept/reject — `InvitationService.rejectInvitation` had no such check at all; see apply-progress Deviations/Issues Found.)
- [x] 3a.7 Create `lib/actions/result.ts` (`ActionResult<T>`) and `lib/server/errors.ts` (`toStatus`), ported from existing catch-block message→status mapping; wire all 3a actions to return `ActionResult`, never throw.

## Phase 3b: Members + Users Actions, Page Move, Old-Handler Deletion

- [x] 3b.1 [RED] Test: fellow member updates another member's income within the same group → succeeds; outsider denied. (resource-authorization: "Member Income Update Requires Membership")
- [x] 3b.2 [GREEN] Create `lib/actions/member.ts` `updateIncome` action.
- [x] 3b.3 [RED] Test: owner removes a member of their own group succeeds; self-removal without ownership succeeds. (resource-authorization: "Member Removal Authorization...")
- [x] 3b.4 [RED] Test: cross-group id substitution — caller-supplied `groupId=A` alongside a member of group B is authorized against B, not A, and denied. (Threat Matrix case 5; ports `members.ts:78` precedent)
- [x] 3b.5 [GREEN] Create `removeMember` action resolving the group strictly from the target member's own `groupId`, never the caller-supplied one, to pass 3b.3–3b.4. (Added `GroupService.getMemberById` to resolve the real record first — see apply-progress.)
- [x] 3b.6 [RED] Test: user reads/upserts own profile via session id; client-supplied id in the payload is ignored. (resource-authorization: "User Profile Access Is Self-Scoped")
- [x] 3b.7 [GREEN] Create `lib/actions/user.ts` `upsert` action resolving the id from the session, and a `users/me` first-paint service call (no endpoint). (`UserService.getUser` wired into `app/(app)/members/page.tsx` as the "users me" first-paint call — see apply-progress Deviations for why there, not a dedicated profile page.)
- [x] 3b.8 Create `app/(app)/groups/page.tsx` (Server Component groups list) and `app/(app)/members/page.tsx` (Server Component members list); move corresponding widgets to `components/**`. (Deviation: colocated `GroupsClient.tsx`/`MembersClient.tsx` beside their `page.tsx`, matching Phase 1a/2's established precedent, not a top-level `components/**` — see apply-progress.)
- [x] 3b.9 Delete `api/groups.ts`, `api/members.ts`, `api/users.ts`, `api/_src/handlers/{groups,members,users}.ts`, and their friendly-path entries from the `app/api/[...legacy]/route.ts` table, in one commit. (Also fixed a real, previously-undiscovered break: `app/(auth)/signup/SignupForm.tsx` called the now-deleted `/api/users` directly — repointed to the new `upsert` Server Action — see apply-progress Issues Found.)

**Status: implemented and fully test-verified (all gates green), NOT YET COMMITTED — blocked on a review-budget decision.** Measured diff is 1756 changed lines (985 insertions + 771 deletions) against the 800-line session budget, well above the 700–900 forecast in this file's own per-phase table. See apply-progress for the full breakdown and the decision this phase needs before it can be committed.

## Phase 4a: Expense Server Actions

- [x] 4a.1 [RED] Test: member creates an expense in their group succeeds; non-member denied 403. (resource-authorization: "Group-Scoped Budget Resources Require Membership") — `lib/actions/expense.test.ts` written whole (create/update/delete/deleteAll cases together) before `lib/actions/expense.ts` existed; genuine RED confirmed via `Cannot find module '/lib/actions/expense'` — see apply-progress.
- [x] 4a.2 [GREEN] Create `lib/actions/expense.ts` `create`/`update`/`delete`/`deleteAll`, resolving `groupId` from the expense's own record, not the request body. (Deviation: singular delete exported as `deleteExpense`, not the literal `delete` — `delete` is a reserved JS keyword and cannot be a function identifier — see apply-progress.)
- [x] 4a.3 [RED] Test: cross-group id substitution on expense update/delete is rejected. (Threat Matrix case 5) — covered by the same whole-file RED batch as 4a.1 (`update`/`deleteExpense` cross-group cases); genuine pre-GREEN failure via the same module-not-found gate — see apply-progress.
- [x] 4a.4 [GREEN] Enforce resource-derived `groupId` to pass 4a.3. (`ExpenseService.updateExpense`/`deleteExpense` already derive the group from the *existing* expense's own `category.groupId`, ported verbatim in 1b.12 — no caller-supplied `groupId` field exists on either schema. The action's try/catch surfaces that denial as a 403 `ActionResult` via `toStatus`, same non-duplication precedent as 3a.4's archive/undoArchive. `deleteAll`'s `groupId` has no prior resource to derive from, unlike `update`/`deleteExpense`'s `expenseId` — its own explicit `isGroupMember` check was added since `ExpenseService.deleteAllExpenses` has none — see apply-progress.)

## Phase 4b: Category Actions, GET Handlers, Page Move

- [x] 4b.1 [RED] Test: owner deletes a category belonging to their group succeeds; non-owner member denied 403. (resource-authorization: "Category Deletion Requires Ownership")
- [x] 4b.2 [GREEN] Create `lib/actions/category.ts` `create`/`update`/`delete`, owner-only check on delete (ports `transactions.ts:387`). (Deviation: singular delete exported as `deleteCategory`, not the literal `delete` — same reserved-keyword resolution 4a.2 applied to `deleteExpense`. `create` needed an explicit `isGroupMember` action-layer check since `BudgetService.createCategory` performs none internally, same gap 4a.4 closed for `deleteAllExpenses`. `deleteCategory` resolves the category's own `groupId` via a new `BudgetService.getCategoryById` before checking `isGroupOwner`, then calls a new thin `BudgetService.deleteCategory` — same "action resolves + checks, service just deletes" precedent as `member.ts`'s `removeMember` (3b.5). Added `"Only group owners can delete categories"` → 403 to `lib/server/errors.ts`'s table, reusing the legacy handler's exact message.)
- [x] 4b.3 Create `app/api/expenses/route.ts` (GET) backing `useExpensesList`/refetch-on-focus, with membership check. (Verbatim pagination/response-mapping port of the legacy `expenses-list` action, same membership-check pattern as `app/api/categories/route.ts` (Phase 2).)
- [x] 4b.4 [RED] Route Handler test: non-member denied 403 on `/api/expenses?groupId=G`.
- [x] 4b.5 [GREEN] Wire membership check to pass 4b.4.
- [x] 4b.6 Create `app/(app)/expenses/[groupId]/page.tsx`; move Expenses widgets to `components/**`. (Deviation: lean colocated `ExpensesClient.tsx`, not a literal port of `frontend/src/pages/expenses/ui/ExpensesPage.tsx` — same "lean, not full port" precedent as `GroupsClient`/`MembersClient` (3b.8) and `DashboardClient` (2.1). No `HydrationBoundary` — design.md's Server Action vs Route Handler table places `/api/expenses` in the "Route Handler GET" row, not "Server Component (no endpoint)", so the list is purely client-owned via `./queries.ts`'s `useExpensesList`, unlike Dashboard's summary/categories.)
- [x] 4b.7 Wire `invalidateQueries(["group", groupId])` on all Phase 4a/4b mutations plus revalidation of any Server-Component route for that group. (client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key Prefix") — Two layers: (1) server-side, every Phase 4a expense action and Phase 4b category action now calls `revalidatePath(/dashboard/${groupId})` after a successful mutation, resolving `groupId` from the mutated resource's own record (`BudgetService.getCategoryById` for expense `create`/`update`; a new `ExpenseService.getExpenseGroupId` looked up *before* the delete runs for `deleteExpense`, since the row and its category link are gone afterward; `parsed.data.groupId` directly for `deleteAll`/category `create`; the updated category's own `groupId` field for category `update`; the resolved category record for `deleteCategory`). (2) client-side, `app/(app)/expenses/[groupId]/queries.ts`'s `invalidateGroupQueries(queryClient, groupId)` helper wraps `queryClient.invalidateQueries({queryKey: queryKeys.group(groupId)})` — reused unchanged from Phase 2's `queryKeys` module, whose `group(groupId)` tuple already IS the `["group", groupId]` prefix the spec names — wired as the `onSuccess` handler on the `useMutation` hooks (`useCreateExpense`/`useDeleteExpense`/`useDeleteAllExpenses`) that `ExpensesClient` calls for create/delete/delete-all — `useUpdateExpense` was dropped as unused dead code (fallow flagged it; no edit-expense UI exists yet to call it) and can be re-added once that UI lands. Deviation: no client-side invalidation wiring was added for the three category actions, since no category-management UI exists yet in the app (Dashboard's `BudgetCategories` widget port is out of this phase's scope) — only their server-side `revalidatePath` call is wired; client-side wiring is deferred to whichever phase ports that widget.
- [x] 4b.8 [RED] Test: expense mutation for group X does not mark group Y's cached queries stale. (client-data-cache: "Mutation for one group does not affect another") — genuine RED via `Failed to resolve import "./queries"` before `invalidateGroupQueries` existed; tested directly (`app/(app)/expenses/[groupId]/queries.test.ts`) rather than through a full mutation-flow RTL render, since the isolation property is inherent to TanStack Query's prefix-match `invalidateQueries` semantics over the `["group", groupId]` key shape, not custom logic — same level of directness 4a.1/4a.3 used for their whole-module RED gate.

**Status: implemented and fully test-verified (100/100 root-scope tests green, 133/133 api-workspace tests green, typecheck/lint/prettier clean), NOT YET COMMITTED — blocked on a review-budget decision.** Measured diff is 1182 changed lines (all insertions: 14 files, 5 modified + 9 new) against the 800-line session budget, above the 600-800 forecast in this file's own per-phase table. Per this session's explicit instruction ("measure before committing; if it risks exceeding 800 lines, stop and report rather than assuming size:exception"), work was NOT committed pending a decision. See apply-progress for the full per-file breakdown and split options.

## Phase 5: Transfers

- [x] 5.1 [RED] Test: member creates a transfer in their group succeeds; non-member denied 403. — `lib/actions/transfer.test.ts` written whole before `lib/actions/transfer.ts` existed; genuine RED confirmed via `Cannot find module '/lib/actions/transfer'`.
- [x] 5.2 [GREEN] Create `lib/actions/transfer.ts` `create`/`deleteTransfer`/`deleteAll`, resource-derived `groupId`. (Deviation: singular delete exported as `deleteTransfer`, not the literal `delete` — same reserved-keyword resolution 4a.2/4b.2 applied to `deleteExpense`/`deleteCategory`.)
- [x] 5.3 [RED] Test: cross-group id substitution on transfer delete is rejected. (Threat Matrix case 5) — covered in the same whole-file RED batch as 5.1 (`deleteTransfer`'s cross-group case).
- [x] 5.4 [GREEN] Enforce resource-derived `groupId` to pass 5.3. (`TransferService.deleteTransfer` already derives the group from the *existing* transfer's own `category.groupId`, ported verbatim in 1b.12 — no caller-supplied `groupId` field exists on the delete schema. Added new `TransferService.getTransferGroupId` — mirrors `ExpenseService.getExpenseGroupId` (4b.7) — to resolve the revalidation path before the row is deleted. `deleteAll`'s `groupId` has no prior resource to derive from, unlike `deleteTransfer`'s `transferId` — its own explicit `isGroupMember` check was added since `TransferService.deleteAllTransfers` has none, same gap 4a.4 closed for `deleteAllExpenses`.)
- [x] 5.5 Create `app/api/transfers/route.ts` and `app/api/transfers/by-category/route.ts` (GET), membership-checked. (`transfers` mirrors `app/api/expenses/route.ts`'s explicit `isGroupMember` + `groupId` param pattern — `TransferService.listTransfers` already returns fully-mapped rows, no extra response mapping needed. `by-category` has no `groupId` param at all; it surfaces `TransferService.getTransfersForCategory`'s own internal membership check via `toStatus`, same non-duplication precedent as `expense.ts`'s `update`/`deleteExpense`.)
- [x] 5.6 [RED] Route Handler test: non-member denied 403 on both GET endpoints. — `app/api/transfers/route.test.ts` and `app/api/transfers/by-category/route.test.ts` written before their `route.ts` files existed; genuine RED via `Cannot find module '/app/api/transfers/route'` / `'/app/api/transfers/by-category/route'`.
- [x] 5.7 [GREEN] Wire membership checks to pass 5.6.
- [x] 5.8 Create `app/(app)/transfers/[groupId]/page.tsx`; move Transfers widgets to `components/**`. (Deviation: lean colocated `TransfersClient.tsx` + `queries.ts`, not a literal port of `frontend/src/pages/transfers/ui/TransfersPage.tsx` — same "lean, not full port" precedent as `ExpensesClient` (4b.6). `queries.ts` exposes `useTransfersList`/`useCreateTransfer`/`useDeleteTransfer`/`useDeleteAllTransfers` plus `invalidateGroupQueries` reusing `queryKeys.transfers`/`queryKeys.group` unchanged from `frontend/src/shared/api/queryKeys.ts`; server-side `revalidatePath` wired directly into every Phase 5 action in `lib/actions/transfer.ts`. No dedicated cache-isolation RED test duplicated here — 4b.8 already proved `invalidateGroupQueries`'s prefix-match isolation property generically, and Phase 5's own task list does not enumerate a client-cache RED test.)

**Status: implemented and fully test-verified. See apply-progress for the diff-size measurement against the 700–900 line forecast.**

## Phase 6a: Savings Actions

- [x] 6a.1 [RED] Test: member creates a savings goal in their group succeeds; non-member denied 403. — `lib/actions/savings.test.ts` written whole (create/update/deleteGoal/contributionUpsert/contributionDelete cases together) before `lib/actions/savings.ts` existed; genuine RED confirmed via `Cannot find module '/lib/actions/savings'` — see apply-progress.
- [x] 6a.2 [GREEN] Create `lib/actions/savings.ts` `create`/`update`/`delete` (goals) + `contributionUpsert`/`contributionDelete`, resource-derived `groupId`. (Deviation: singular delete exported as `deleteGoal`, not the literal `delete` — same reserved-keyword resolution 4a.2/4b.2/5.2 applied to `deleteExpense`/`deleteCategory`/`deleteTransfer`. `create` needed an explicit `isGroupMember` action-layer check since `SavingsService.createGoal` performs none internally, same gap 4b.2 closed for `BudgetService.createCategory`. Added `SavingsService.getGoalGroupId` — mirrors `ExpenseService.getExpenseGroupId`/`TransferService.getTransferGroupId` (4b.7/5.4) — to resolve the revalidation path for `deleteGoal`/`contributionUpsert`/`contributionDelete`, all of which resolve to a goal/member state that may no longer be inspectable after the mutation. Added the four new savings/contribution error messages ("Savings goal not found", "Group member not found", and the two "...does not belong to the group associated with this savings goal" messages) to `lib/server/errors.ts`'s table.)
- [x] 6a.3 [RED] Test: cross-group id substitution on savings goal/contribution mutation is rejected. — covered in the same whole-file RED batch as 6a.1 (`update`/`deleteGoal`'s not-a-member case, and the literal two-id `contributionUpsert`/`contributionDelete` cross-group case where `memberId` belongs to a different group than the goal); genuine pre-GREEN failure via the same module-not-found gate — see apply-progress.
- [x] 6a.4 [GREEN] Enforce resource-derived `groupId` to pass 6a.3. (`SavingsService.updateGoal`/`deleteGoal` already derive the group from the *existing* goal's own record, and `upsertContribution`/`deleteContribution` already validate `goalId`/`memberId` belong to the same group plus check caller membership — all ported verbatim in 1b.12. No caller-supplied `groupId` field exists on any of these four schemas. The action's try/catch surfaces each denial as a 403/404 `ActionResult` via `toStatus`, same non-duplication precedent as 4a.4/4b.2/5.4.)

**Status: implemented and fully test-verified (root + api-workspace vitest suites green, typecheck/lint/prettier clean). See apply-progress for the diff-size measurement against the 600–800 line forecast.**

## Phase 6b: Savings GET Handler, Page Move, Full Teardown of `transactions.ts`

- [x] 6b.1 Create `app/api/savings/route.ts` (GET), membership-checked, backing refetch-on-focus.
- [x] 6b.2 [RED] Route Handler test: non-member denied 403 on `/api/savings?groupId=G`.
- [x] 6b.3 [GREEN] Wire membership check to pass 6b.2.
- [x] 6b.4 Create `app/(app)/savings/[groupId]/page.tsx`; move Savings widgets to `components/**`. (Deviation: lean colocated `SavingsClient.tsx` + `queries.ts`, not a literal port of `frontend/src/pages/savings/ui/SavingsPage.tsx` — same "lean, not full port" precedent as `ExpensesClient`/`TransfersClient` (4b.6, 5.8), per this session's explicit instruction to follow that exact shape. No `HydrationBoundary`/prefetch — same as Expenses/Transfers, even though design.md's Server Component row lists `savings-goals-list`; see apply-progress Deviations for the reconciliation.)
- [x] 6b.5 Delete `api/transactions.ts` and `api/_src/handlers/transactions.ts` (now fully ported across 4a/4b/5/6a/6b) and remove all their friendly-path entries from `app/api/[...legacy]/route.ts`, in one commit. (Consequential edits beyond the literal task text — required to keep the build compiling once the handler was deleted, same "found while confirming no remaining references" judgment call precedent as 3b.9's `SignupForm.tsx` fix: `app/api/[...legacy]/adapter.ts` no longer imports `transactionsHandler`, `LEGACY_HANDLERS` is now empty, and `LegacyHandlerName`/`ROUTE_TABLE` in `routes-table.ts` reflect the now-empty friendly-path table. Two api-workspace test suites with genuine `SavingsService`/`SummaryService` business-logic coverage — `api/_tests/integration/savings.test.ts` and `api/_tests/integration/summary.test.ts` — were rehomed (not deleted) into `lib/server/services/{savings,summary}.test.ts`, calling the service directly instead of through the deleted handler; six other api-workspace test files were pure handler-dispatch-wiring tests already fully redundant with the ported action/route-handler tests (4a/5/6a/6b) and were deleted outright, along with the now-orphaned `api/_tests/helpers.ts`. See apply-progress for the full file-by-file breakdown.)

**Status: implemented and fully test-verified (152/152 root-scope tests green [was 134], 97/97 api-workspace tests green [was 133, -36 net after rehoming/dedup], typecheck/lint/prettier clean), NOT YET COMMITTED — blocked on a review-budget decision.** Measured diff against `feat/nextjs-migration-6a-savings-actions` (`105ab62`) is 3936 changed lines (1322 insertions + 2614 deletions across 24 files), far above this file's own 500–700 line forecast and the 800-line session budget. The deletion-heavy total is expected for a full-file teardown phase (807-line `transactions.ts` handler alone), not a sign of runaway new code — net new implementation code (route+page+client+queries) is a modest ~440 lines; the bulk of both the addition and deletion sides is test rehoming/consolidation. Per this session's explicit instruction ("if it risks exceeding the 800-line session budget, report the number and stop rather than assuming size:exception"), work was NOT committed pending a decision. See apply-progress for the full per-file breakdown.

## Phase 7: Cleanup

- [ ] 7.1 Delete `app/api/[...legacy]/route.ts`, `api/_src/utils/dispatcher.ts`, `api/_src/middleware/handler.ts` (nothing left calling them).
- [ ] 7.2 Delete remaining `api/` workspace files (`api/_src/**`, `api/vitest.config.ts`, leftover config); rehome any still-useful fixtures from `api/_tests/**` alongside their ported action/route-handler tests.
- [ ] 7.3 Delete `frontend/src/app/{App.tsx,providers/AuthProvider.tsx,providers/ProtectedRoute.tsx}` and `frontend/src/shared/api/{client.ts,supabase.ts}`.
- [ ] 7.4 Collapse root `package.json` workspaces to `["shared"]` (app is root); update `turbo.json` pipeline; delete `vercel.json` if no longer needed under the Next.js framework preset.
- [ ] 7.5 Repoint `playwright.config.ts` `webServer` to `next start`; run full Playwright suite. (proposal Success Criteria: "Playwright suite passes against `next start`")
- [ ] 7.6 Verify proposal Success Criteria checklist end-to-end: no dispatcher/rewrite/Express-shim references remain; `npm run dev` starts a single process.

## Key Learnings

1. Design revised phase 1 to retire `vercel.json` rewrites and the Express dev shim immediately, so phases 3–6 only remove entries from the adapter's own friendly-path table, not `vercel.json`.
2. `api/transactions.ts` and its handler back four resources (expenses, transfers, summary, categories, savings), so it can only be fully deleted after phase 6b, not per-phase.
3. Member-removal and cross-group-id-substitution checks must resolve authorization from the target resource's own `groupId`, never a caller-supplied one — this is the exact class of bug fixed in `ae9c3d8`/`109250d`.
4. Phase 1 and phases 3, 4, 6 each independently exceed the 800-line session budget and require splitting into lettered sub-PRs (1a/1b, 3a/3b, 4a/4b, 6a/6b) as native GitHub stacked PRs based on `develop`.
5. Hydration (`dehydrate`/`HydrationBoundary`) must be tested explicitly for cache-hit-on-nav and refetch-on-focus, since Server Components alone would regress the existing staleness contract.
