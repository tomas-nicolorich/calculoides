# Exploration: Next.js migration UI fixes (post Phase-7 cleanup)

## Current State

`main` still holds the old, fully-working Vite `frontend/` SPA (no `app/` tree). This branch (`feat/nextjs-migration-7-cleanup`, tip of the `nextjs-migration` OpenSpec change, commit `b1f4a7e`) deleted `frontend/` and `api/` and is the sole surviving implementation, but several Next.js UI surfaces were only ever built as explicit, self-documented placeholders — confirmed by reading each file directly:

1. **`app/page.tsx`** (14 lines) — literal Phase-1a placeholder. Comment: *"Replaced by the real dashboard/groups routing in later phases."* Renders only `"Calculoides — Next.js shell online."` No redirect logic for authenticated vs anonymous users.

2. **`app/(app)/AppShell.tsx`** — explicit placeholder. Comment: *"The real shell branches on `useIsMobile()` into `SidebarNav`/`MobileTopBar`/`MobileTabBar` (widgets/navigation/**), none of which are ported yet... Full navigation-chrome porting is deferred."* Currently a bare `<header>` + comma-joined group-name string. Compounding this: `app/(app)/layout.tsx`'s `getGroupNames()` is a hardcoded `TODO(1b.12)` stub that always `return Promise.resolve([])`, so even that text never renders anything today.

3. **`app/(app)/groups/GroupsClient.tsx`** — functionally complete (list groups, create-group form, links to `/dashboard/[groupId]`) but its own comment says *"lean, not a full port... plain Tailwind, no `shared/ui` atom imports."*

   Adjacent, discovered during investigation: `app/(app)/dashboard/[groupId]/DashboardClient.tsx` is the same kind of "lean placeholder" — its comment says *"Full widget porting (`IncomeOverview`, `BudgetCategories`, etc.) is out of this phase's scope."* It renders only a group name heading and a bare category `<ul>`. Worth scoping alongside #1/#3 since `/` will presumably redirect into this same unstyled dashboard.

4. **No dark-mode toggle.** Confirmed via grep: zero matches for `next-themes`, `ThemeToggle`, `ThemeProvider` anywhere under `app/`. However, `app/globals.css` already ports the *infrastructure* for a manual toggle: `@custom-variant dark (&:where(.dark, .dark *));` plus a `.dark { --color-background: ...; }` block — i.e., Tailwind's `dark:` classes already key off a `.dark` class on an ancestor, not just `prefers-color-scheme`. What's missing is only the piece that adds/removes `.dark` on `<html>` and a UI control — no CSS rework needed.

5. **Font-loading 307 redirect — confirmed live, narrow bug.** `proxy.ts` (the uncommitted, untracked WIP replacement for the git-deleted `middleware.ts` — `git status` shows `D middleware.ts` / `?? proxy.ts`) still carries the same `config.matcher`:
   ```
   "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"
   ```
   `PUBLIC_PATHS` is `["/", "/login", "/signup", "/forgot-password", "/reset-password", "/complete-profile"]` — no `/fonts` entry, and the matcher doesn't exclude font extensions either. `app/globals.css` `@font-face`s reference `/fonts/geist-variable.woff2` and `/fonts/geist-mono-variable.woff2`. For a logged-out visitor, `GET /fonts/*.woff2` falls through `isPublicPath` and `isApiPath` both false → 307 to `/login` → browser tries to parse the `/login` HTML response as a font (`OTS parsing error: invalid sfntVersion: 1008813135`, which decodes to `<!DO`). Verified live via `curl -I http://localhost:3210/fonts/geist-variable.woff2` → `307` / `location: /login`.

**Related uncommitted WIP (separate from this SDD change, flagged not decided):** the `middleware.ts` → `proxy.ts` rename is mid-flight and incomplete. `proxy.ts` correctly exports `proxy` (not `middleware`) per Next.js 16's deprecation of the `middleware.ts` convention in favor of `proxy.ts` (confirmed via Next.js 16.2.9 docs). But `package.json`'s `lint`/`lint:next` scripts still hard-reference `middleware.ts` directly (`eslint app lib middleware.ts next.config.ts ...`), and `CONTEXT-MAP.md` still describes `middleware.ts` in prose. Whichever phase fixes bug #5's matcher should almost certainly land inside this already-half-done rename rather than leaving two parallel half-finished middleware states — open question for `sdd-propose`.

## Affected Areas

- `app/page.tsx` — root placeholder; needs auth-aware redirect/dashboard entry logic (bug #1)
- `app/(app)/AppShell.tsx` — placeholder navbar; needs real chrome (bug #2)
- `app/(app)/layout.tsx` — `getGroupNames()` stub blocks even the current bare group-name text (bug #2)
- `app/(app)/groups/GroupsClient.tsx` — unstyled group list/create form (bug #3)
- `app/(app)/dashboard/[groupId]/DashboardClient.tsx` — unstyled dashboard, same class of gap as #3, adjacent to #1's redirect target
- `app/globals.css` — has the `.dark` variant/token infrastructure already; needs only a toggle mechanism (bug #4)
- `app/layout.tsx`, `app/providers.tsx` — root layout/providers where a theme provider would mount (bug #4)
- `proxy.ts` (untracked WIP, replaces deleted `middleware.ts`) — `config.matcher`/`PUBLIC_PATHS` missing font exclusion (bug #5)
- `package.json` (`lint`, `lint:next` scripts) — still reference `middleware.ts`, stale relative to the `proxy.ts` WIP
- `CONTEXT-MAP.md` — still documents `middleware.ts` by name
- `package.json` `dependencies` — no `next-themes`, no icon library (e.g. `lucide-react`), no Base UI equivalent in the Next.js app today; any port of `main`'s old components pulls in new deps

## Constraints

- **Mid-migration state, not a fresh feature.** `openspec/changes/nextjs-migration/proposal.md` scoped Phases 0–7 explicitly around auth/data/mutation porting and explicitly listed visual component porting as intended-but-deferred — the placeholder UI is a scope gap, not a completed decision.
- **`main` has a complete, previously-shipped reference implementation to port from.** `openspec/changes/persistent-navigation/` (proposal.md, design.md, tasks.md, verify-report.md — all still present, un-archived) documents a fully-built, fully-verified (`WHOLE-CHANGE FINAL VERDICT: PASS`, 33/33 tasks, 16/16 scenarios) navigation shell that shipped on the old Vite `frontend/`: `AppShell` branching on `useIsMobile()` into `SidebarNav` / `MobileTopBar` / `MobileTabBar` / `AccountMenu`, a `GroupSwitcher`, a single `NAV_ITEMS` table driving both surfaces, and a pre-existing `ThemeToggle` component. That whole tree (`frontend/src/widgets/navigation/**`, `frontend/src/app/ui/AppShell.tsx`, the `ThemeToggle` component, `frontend/src/pages/dashboard/ui/DashboardPage.tsx`, `frontend/src/pages/groups/ui/GroupsPage.tsx`) still exists on `main` — natural port source for bugs #2/#3/#4, needs confirming/diffing with git access before `sdd-propose` commits to porting it.
- **Dependency gap.** Porting `main`'s components means adding new `dependencies` to the root `package.json` (the old `frontend/` workspace had its own separate one).
- **`fallow` dead-code scanner constraint** (per `CONTEXT-MAP.md`): `app/`/`lib/` code must use relative imports, not a `@/*` alias, or `fallow`'s CI check misreports files as unused.
- **Strict TDD is active** for this project — `sdd-apply` for these fixes must follow RED→GREEN→REFACTOR, mirroring the `persistent-navigation` precedent.
- **800-line review budget** (this session's SDD preflight). `persistent-navigation` chained 3 PRs (~450–550 / ~350–420 / ~120–160 lines forecast, all overshot 1.7–3.2x in practice) for comparable navbar+switcher scope — a UI-fixes change touching navbar + dashboard + groups + theme + font-matcher will very likely need the same chained/stacked-PR treatment.
- Bug #5 is independent of #1–#4 in risk profile: a one-file, few-line fix (matcher/`PUBLIC_PATHS` addition) versus #1–#4's "build real UI" work of comparable shape to `persistent-navigation`'s already-completed (but now-deleted) prior art.

## Options / Considerations for `sdd-propose`

| Approach (for #2/#3/#4 — navbar, dashboard/groups styling, theme toggle) | Pros | Cons | Effort |
|---|---|---|---|
| **A. Port `main`'s existing components** (`AppShell`, `SidebarNav`/`MobileTopBar`/`MobileTabBar`, `GroupSwitcher`, `ThemeToggle`, `DashboardPage`/`GroupsPage` styling) into `app/` as Client Components | Design and UX already decided, reviewed, and verified once (`persistent-navigation` PASS verdict); avoids re-litigating IA/nav decisions; fastest path to feature parity with `main` | Requires re-wiring every data source from React-Router/REST (`groupApi`, `useApiQuery`, `ActiveGroupContext`) to this app's Server Components/Server Actions/TanStack Query pattern — non-trivial adaptation, not copy-paste; adds new deps to `package.json` | Medium–High |
| **B. Build fresh Tailwind UI** matching `app/globals.css`'s existing token system, without porting old component code | No new dependencies; scoped exactly to what's minimally needed | Redoes UX/IA decisions from scratch that `persistent-navigation` already made and tested; risks visual/behavioral drift from `main` | Low–Medium (if scope kept narrow) |
| **C. Hybrid** — reuse `persistent-navigation`'s IA/architecture decisions (NAV_ITEMS table, single AppShell branching on `useIsMobile`) as a blueprint but write new, this-app-native implementations against Server Actions/`lib/server/services/**` | Keeps proven design decisions without dragging along React-Router-era data-fetching code that no longer applies | Still "build fresh" level of effort; needs deliberate re-reading of `persistent-navigation/design.md` decisions to decide which still apply | Medium |

Independent of A/B/C: bug #5's fix is small and low-risk, orthogonal to the navbar/dashboard/theme decision — doesn't need to wait on it. The open question of bundling it with the `middleware.ts`→`proxy.ts` rename is for `sdd-propose` to decide.

**Scope-boundary question for the proposal phase**: how "finished" must #1 (dashboard redirect)/#2 (navbar)/#3 (groups styling) be for *this* change versus later follow-on phases? `persistent-navigation`'s own tasks.md shows even the "done" version left two carried-forward WARNINGs (zero RTL coverage on `MobileTopBar`/`MobileTabBar`, one missing cross-route integration test) — a reasonable target bar rather than 100% parity-plus-more before shipping.

## Risks

- `main`'s current `frontend/src` contents need a git-access diff to confirm exact files/exports before committing to Option A (not yet done — needs a phase with shell/git access).
- Engram MCP tools (`mem_search`/`mem_save`) are not connected in this session at all — despite the `hybrid` artifact-store preflight choice, this exploration (and likely all subsequent SDD phases this session) can only be persisted to OpenSpec files, not Engram. Flagged to the user; Engram-side history for this change will need a manual backfill in a session where the MCP server is actually connected.
- Bug #2's `getGroupNames()` stub references task `1b.12` from the original migration's task numbering — worth deciding whether that numbering carries into this new change's `tasks.md` or is treated as closed/historical.
- The `middleware.ts`→`proxy.ts` WIP is uncommitted local state; if touched before this change starts, bug #5's exact file (`proxy.ts` vs a resurrected `middleware.ts`) may differ from what's described here.

## Ready for Proposal

Yes. All five bugs are independently confirmed against current source with file/line evidence, root causes are understood, and `main`'s `persistent-navigation` artifacts give `sdd-propose` a concrete, previously-verified reference design to decide port-vs-rebuild against for #2/#3/#4. Main open decisions for the proposal phase: Option A/B/C for the navbar+dashboard+groups+theme work, and the middleware-rename bundling question for bug #5.
