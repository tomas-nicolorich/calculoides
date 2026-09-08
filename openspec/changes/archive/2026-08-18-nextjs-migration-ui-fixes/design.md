# Design: Next.js Migration UI Fixes

> **Size-budget deviation (declared)**: `sdd-design`'s 800-word cap is exceeded deliberately.
> The orchestrator required four specific deliverables (target-seam confirmation, RSC/Client
> boundary map, data-layer adaptation, and a 16-slice PR breakdown). Prose is minimised; the
> bulk is tables.

## Technical Approach

Port `main`'s Vite CDS layer into the Next.js app **bottom-up**: primitives first
(`app/_ui/**`), then the navigation shell, then Dashboard and Groups at full parity.
Presentation (markup, Tailwind classes, component APIs) is ported verbatim; only the
**data seam** is rewritten — React-Router/Context era `apiClient.fetch` + `ActiveGroupContext`
+ `AuthContext` become URL-derived params, Server-Component props, and this app's existing
Server Actions / TanStack Query pair.

**The good news from target-seam verification**: the adaptation is far smaller than the
proposal assumed. Everything the widgets need already exists on the server side.

### Target-seam inventory (verified against this branch, not assumed)

| Widget need | Target seam in this repo | Status |
|---|---|---|
| Design tokens (brand/member palette, shadows, glows, `tnum`, `.dark`) | `app/globals.css` L21–91 | **Already ported in full** |
| Dashboard summary (totals, members+income+share+spent+remainingQuota+budgeted, recentExpenses, recentTransfers) | `SummaryService.getGroupSummary` → `queryKeys.summary` → `/api/summary` | Exists, covers 4 of 6 widgets alone |
| Categories + per-member balances | `BudgetService.listCategoriesWithBalances` → `queryKeys.categories` → `/api/categories` | Exists |
| Savings goals + breakdown | `SavingsService.getGoalsForGroup` → `queryKeys.savingsGoals` → `/api/savings` | Exists (hook lives in `app/(app)/savings/[groupId]/queries.ts`) |
| Per-category transfer history (accordion drill-down) | `/api/transfers/by-category` | Exists |
| Category CRUD | `lib/actions/category.ts` `create`/`update`/`deleteCategory` | Exists |
| Expense create/delete | `lib/actions/expense.ts` | Exists |
| Budget transfer create/delete | `lib/actions/transfer.ts` | Exists |
| Savings goal + contribution CRUD | `lib/actions/savings.ts` (5 actions) | Exists |
| Income edit | `lib/actions/member.ts` `updateIncome` | Exists |
| Group list for switcher | `GroupService.getGroupsForUser(userId)` | Exists (layout stub ignores it) |
| Signed-in user name/email | `UserService.getUser(id)` | Exists |
| Cache invalidation contract | `queryKeys.group(groupId)` prefix | Exists |
| RTL test harness | per-file `// @vitest-environment jsdom` + `@testing-library/jest-dom/vitest` (see `DashboardClient.test.tsx`) | Exists |
| **Sign-out** | — | **MISSING.** No `signOut` anywhere under `app/` or `lib/`. `AccountMenu` needs it. |
| **`cn` / `clsx` / `tailwind-merge`** | — | **MISSING.** Not in `package.json`. |
| **`lucide-react`, Base UI** | — | **MISSING.** |
| **`useIsMobile`** | — | **MISSING.** No `lib/hooks/`. |

### Repo is currently in a broken intermediate state (blocks everything)

`middleware.ts` is deleted from the worktree but still tracked, while `middleware.test.ts`
(root, tracked) imports `./middleware`, and `vitest.config.ts` L22, `tsconfig.next.json`
L25–26, and `package.json` L21–22 all still reference it. `npm run lint`, `npm run typecheck`
and `npm test` cannot currently pass. PR 1 is therefore not "~40 lines of matcher" — it is a
repo-wide rename completion and is a hard prerequisite for every other slice's CI.

## Architecture Decisions

### ADR-1: Primitives live at `app/_ui/**`, shared hooks at `app/_data/**`

| Option | Trade-off | Decision |
|---|---|---|
| `app/_ui/**` (Next private folder) | Auto-covered by `eslint app lib`, `tsconfig.next.json`, Fallow, and Vitest `app/**` globs with **zero config change**. Matches existing `app/(auth)/_components/AuthCard.tsx` precedent. | **Chosen** |
| root `components/ui/**` | Requires editing the lint script, tsconfig include, vitest include and the Fallow workflow — four config edits to gain nothing. | Rejected |
| `lib/ui/**` | `lib/` is documented in `CONTEXT-MAP.md` as the server/shared-schema home; putting `"use client"` components there muddies the server boundary. | Rejected |

Layout: `app/_ui/*.tsx` (atoms + overlays), `app/_ui/money/*.tsx` (StatFigure, MemberBar,
ProgressMeter), `app/_ui/index.tsx` (barrel, also defines `Input` inline as on `main`),
`app/_data/*.ts` (query/mutation hooks), `lib/cn.ts`, `lib/hooks/use-is-mobile.ts`.
Relative imports only — no `@/*` alias (Fallow constraint, `CONTEXT-MAP.md` L22–23).

### ADR-2: Hoist route-local `queries.ts` into one `app/_data/**` layer

The three existing `queries.ts` files each redeclare `fetchJson` and `invalidateGroupQueries`
(three copies today). Dashboard parity needs expense, transfer, savings **and** member hooks
simultaneously; importing across sibling route folders (`../../expenses/[groupId]/queries`)
couples routes through a bracketed path.

| Option | Trade-off | Decision |
|---|---|---|
| Hoist to `app/_data/{summary,categories,expenses,transfers,savings,members}.ts` + `fetch-json.ts` + `invalidate.ts`; route folders import from there | One mechanical, low-risk slice (PR 2) that also removes existing triplication. Touches 4 existing clients + 2 existing test files. | **Chosen** |
| Cross-route imports | Zero churn now, permanent coupling and a bracketed relative path per import. | Rejected |
| Duplicate hooks in the dashboard folder | Multiplies the existing smell by two. | Rejected |

### ADR-3: CSS-first responsive branching in the shell; `useIsMobile` scoped to `ResponsiveDialog`

`main`'s `AppShell` branches on `useIsMobile()`. In a CSR-only Vite SPA that costs nothing.
Under SSR the first server render has no `window`, so a JS-gated branch renders the desktop
sidebar (or nothing) to every mobile visitor for one frame.

| Option | Trade-off | Decision |
|---|---|---|
| Render both trees, gate with Tailwind `hidden md:flex` / `md:hidden` | Zero flash, zero JS for layout; `display:none` also removes the hidden tree from the a11y tree, so no duplicate landmarks. Identical rendered result to `main`. | **Chosen for the shell** |
| Port `useIsMobile()` branching verbatim | Byte-parity with `main`, but reintroduces an SSR flash `main` never had. | Rejected for the shell |
| Keep `useIsMobile()` where a wrong first render is invisible | `ResponsiveDialog` picks dialog-vs-bottom-sheet while closed; the hook is correct by the time it opens. | **Chosen for `ResponsiveDialog`** |

This is a mechanism deviation, not a parity deviation: visual output and behaviour match
`main`. `lib/hooks/use-is-mobile.ts` is still built (PR 2), just narrower in scope.

### ADR-4: `children` stays a prop through the client shell

`app/(app)/layout.tsx` remains a Server Component. `AppShell` becomes `"use client"` but
receives `children` as a **prop**, so every page Server Component below it (`dashboard`,
`groups`, `members`, …) keeps server-rendering and never enters the client bundle. Any slice
that makes `AppShell` `import` its children instead would silently client-ify the whole app.

### ADR-5: Active group is derived from the URL, not a context

`ActiveGroupContext`/`useSetActiveGroup` have no replacement and need none. `GroupSwitcher`
reads `useParams<{ groupId?: string }>()` with a `usePathname()` fallback.
**Route-shape trap**: `/members` has no `[groupId]` segment — it is scoped by
`?groupId=` (`app/(app)/members/page.tsx` L25–30). `NAV_ITEMS` must therefore build hrefs
through a function, not string concatenation.

### ADR-6: Auth identity flows as props; sign-out is a new Server Action

`useAuth`/`AuthContext` are replaced by `app/(app)/layout.tsx` passing
`{ id, name, email }` (from the existing `getUser()` + `UserService.getUser`) into
`AppShell` → `AccountMenu`. Sign-out does not exist yet: add
`signOut()` to `lib/actions/session.ts` (`"use server"`, `supabase.auth.signOut()` then
`redirect("/login")`). Rejected alternative: browser-side `createClient().auth.signOut()` —
it clears the browser store but leaves the httpOnly cookie for the server proxy to refresh.

### ADR-7: No-flash dark mode via a blocking inline script, not a cookie

| Option | Trade-off | Decision |
|---|---|---|
| Inline `<script>` in `app/layout.tsx` `<head>` + `suppressHydrationWarning` on `<html>` | ~150 bytes of blocking JS; root layout stays statically renderable; `app/globals.css` already ships `@custom-variant dark (&:where(.dark, .dark *))` and the `.dark` token block, so no CSS work. | **Chosen** |
| Cookie read in the root layout | No inline script, but `cookies()` forces the root layout dynamic, deopting `/login`, `/signup`, etc. from static rendering. | Rejected |
| `next-themes` | New dependency for a 65-line component the proposal already excluded. | Rejected |

### ADR-8: Font fix goes in `config.matcher`, and the `/fonts` prefix is the primary guard

Extension-suffix exclusion alone is fragile (case sensitivity, query strings, path segments
that merely end in `.woff2`). Exclude the `/fonts` **prefix** first, then extend the existing
extension set. Skipping the proxy for those requests is not an authorization weakening:
the proxy only issues redirects, and `app/(app)/layout.tsx` performs its own `getUser()`
check, so a protected route reached with a font-shaped path still fails closed server-side.

### ADR-9: `BudgetCategories` (801 lines) ships as two vertical slices, never one PR

Answering the orchestrator's Q4 directly: it does **not** fit anywhere, combined or alone.
801 source lines plus ADR-0006 accordion RTL coverage lands near 1,050 changed lines — over
the 800-line budget by itself. It has one honest seam:

- **14 — read/accordion**: category rows, `ProgressMeter`, per-member balance rows,
  expand/collapse, empty/loading states. Ships a fully working read-only accordion.
- **15 — mutations**: create/edit/delete dialogs (`ResponsiveDialog` + `IconPicker` +
  `Input`), inline budget-transfer form → `lib/actions/transfer.create`, per-category
  transfer history via `/api/transfers/by-category`.

Reverting 15 leaves a working read-only accordion — a clean rollback boundary, which a
mid-file split would not give.

## Data Flow

```
app/(app)/layout.tsx  (Server)
  getUser() ──► GroupService.getGroupsForUser ──► groups[]
            └─► UserService.getUser          ──► user
                        │
                        ▼  props (children stays a PROP — ADR-4)
             <Providers><AppShell groups user>{children}</AppShell></Providers>
                        │                              │
        ┌───────────────┴───────────────┐              │
   SidebarNav (hidden md:flex)    MobileTopBar +       │
   NavItemLink · GroupSwitcher    MobileTabBar         │
   AccountMenu · ThemeToggle      (md:hidden)          │
        │                                              │
   usePathname()/useParams() → active item, groupId    │
                                                       ▼
                         app/(app)/dashboard/[groupId]/page.tsx  (Server)
                           authz → prefetch(summary, categories, savingsGoals)
                           → dehydrate → <HydrationBoundary>
                                              │
                                              ▼
                                    DashboardClient  ("use client")
                                              │
        ┌──────────────┬──────────────┬───────┴───────┬──────────────┬─────────────┐
   IncomeOverview  RemainingBalance RecentExpenses BudgetTransfers BudgetCategories SavingsGoalList
        │ summary        │ summary       │ summary      │ summary      │ categories    │ savingsGoals
        ▼                                                              ▼               ▼
  member.updateIncome                                    category.* / transfer.*   savings.*
        └──────────────────────► onSuccess ──► invalidateQueries(queryKeys.group(groupId))
```

Four of six widgets read the **same** `queryKeys.summary` cache entry — one server prefetch
feeds them all; no per-widget waterfall.

## File Changes

| File | Action | Description |
|---|---|---|
| `proxy.ts` | Create (commit WIP) | `/fonts` prefix + `woff\|woff2\|ttf\|otf\|ico\|gif\|avif` excluded from `config.matcher` |
| `middleware.ts` | Delete | Complete the tracked deletion |
| `middleware.test.ts` → `proxy.test.ts` | Rename | Import `proxy`, add font-path cases |
| `vitest.config.ts`, `tsconfig.next.json`, `package.json`, `CONTEXT-MAP.md`, `README.md` | Modify | Drop every `middleware.ts` reference (currently breaks lint/typecheck/test) |
| `package.json` `dependencies` | Modify | `clsx`, `tailwind-merge`, `lucide-react`, Base UI |
| `lib/cn.ts`, `lib/hooks/use-is-mobile.ts` | Create | `clsx`+`tailwind-merge` helper; media-query hook |
| `app/_data/{fetch-json,invalidate,summary,categories,expenses,transfers,savings,members}.ts` | Create | Hoisted hook layer (ADR-2) |
| `app/(app)/{dashboard,expenses,transfers,savings}/**/queries.ts` | Delete | Superseded by `app/_data/**` |
| `app/_ui/*.tsx` (16 files) + `app/_ui/money/*.tsx` (4) | Create | Ported CDS primitives (~1,990 lines) |
| `app/_theme/{theme-script.ts,ThemeToggle.tsx}` | Create | No-flash script + toggle (ADR-7) |
| `app/layout.tsx` | Modify | Inline theme script, `suppressHydrationWarning`, `font-sans` on `<body>` |
| `app/page.tsx` | Modify | Placeholder → `getUser()` → `/groups` or `/login` |
| `app/(app)/layout.tsx` | Modify | Un-stub `getGroupNames()` → `getGroupsForUser` + `UserService.getUser`; new `AppShell` props |
| `app/(app)/AppShell.tsx` | Modify | Placeholder header → real shell (ADR-3, ADR-4) |
| `app/(app)/_nav/{navItems.ts,NavItemLink,SidebarNav,MobileTopBar,MobileTabBar,GroupSwitcher,AccountMenu}.tsx` | Create | Nav widgets (~606 lines) |
| `lib/actions/session.ts` | Modify | Add `signOut()` Server Action (ADR-6) |
| `app/(app)/groups/GroupsClient.tsx` + `_components/CreateGroupForm.tsx` | Modify/Create | Full ADR-0008 parity |
| `app/(app)/dashboard/[groupId]/page.tsx` | Modify | Add `savingsGoals` prefetch |
| `app/(app)/dashboard/[groupId]/DashboardClient.tsx` + `_widgets/*.tsx` (6) + `_components/ExpenseForm.tsx` | Modify/Create | Full ADR-0003/0006/0007 parity (~2,244 lines) |

## Interfaces / Contracts

```ts
// app/(app)/AppShell.tsx
export interface ShellGroup { id: string; name: string }
export interface ShellUser  { id: string; name: string | null; email: string }
export function AppShell(props: {
  groups: ShellGroup[];
  user: ShellUser;
  children: ReactNode;   // ADR-4: prop, never an import
}): ReactElement;

// app/(app)/_nav/navItems.ts — href is a FUNCTION because /members is ?groupId= scoped (ADR-5)
export interface NavItem {
  key: "dashboard" | "expenses" | "transfers" | "savings" | "members" | "groups";
  label: string;
  icon: LucideIcon;
  href: (groupId: string | null) => string;
  requiresGroup: boolean;
  showInTabBar: boolean;
}

// app/_theme/theme-script.ts — stringified, injected into <head> before <body> (ADR-7)
export const THEME_SCRIPT: string;
```

Ported primitives keep `main`'s exact prop names and semantic variant vocabulary
(`income | balance | expense | transfer | category`, per ADR-0005) — the barrel is the
acceptance surface for "no inline reimplementation".

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (node) | `proxy` matcher/redirect branches; `NAV_ITEMS` href construction incl. `/members?groupId=`; `cn` merge precedence; `THEME_SCRIPT` string | Vitest `environment: "node"` (repo default) |
| Unit (jsdom) | Every `app/_ui` primitive: variant→class mapping, disabled/loading, a11y roles/labels; `useIsMobile` via `matchMedia` stub | Per-file `// @vitest-environment jsdom` + RTL + `@testing-library/jest-dom/vitest` (existing precedent) |
| Component | Each widget: loading / empty / error / populated; mutation fires the right Server Action and calls `invalidateQueries(queryKeys.group(id))` | RTL + `QueryClientProvider`; Server Actions mocked with `vi.mock` |
| Integration | Server Component prefetch → `dehydrate` → `HydrationBoundary` → widget renders without a client fetch | Extend the `DashboardClient.test.tsx` `prefetchServerClient()` pattern to the full widget tree |
| Server | `layout.tsx` group/user fetch; `page.tsx` redirect branches; `signOut()` | Existing `vi.hoisted` + mocked `next/navigation` pattern (`app/(app)/layout.test.tsx`) |
| Manual | Side-by-side vs `main` per PR; `curl -I /fonts/geist-variable.woff2` → 200; toggle + hard reload → no flash | Documented in each PR body |

Strict TDD: RED test before production code in every slice.

## Threat Matrix

Triggered by the `proxy.ts` routing change. The reference matrix's rows are shell/VCS
boundaries and are `N/A` here; the applicable HTTP-routing rows are added below.

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no file-classification or content-execution boundary | — | — |
| Git repository selection | N/A — no `git` invocation in product code | — | — |
| Commit state | N/A — no VCS automation | — | — |
| Push state | N/A — no VCS automation | — | — |
| PR commands | N/A — no PR automation in product code | — | — |
| **HTTP: static-asset matcher exclusion** | **Applicable** | `/fonts` prefix excluded first; extension list secondary | `GET /fonts/geist-variable.woff2` is not matched → no 307 |
| **HTTP: protected path shaped like an asset** | **Applicable** | Proxy skip is redirect-only; `app/(app)/layout.tsx` `getUser()` still fails closed | `/dashboard/x.woff2` unauthenticated must not render protected content |
| **HTTP: `/api/*` exclusion preserved** | **Applicable** | Existing `isApiPath` branch untouched | `/api/*` unauthenticated returns the handler's own response, never a 307 |
| **HTTP: authenticated vs anonymous `/`** | **Applicable** | `/` stays in `PUBLIC_PATHS`; the page owns both branches | signed-in → `/groups`; signed-out → `/login` |

## Migration / Rollout

No schema, data, or API-contract migration. Pure additive code plus one completed file
rename. Rollout is the 16-slice stack below, merged strictly bottom-up.

### PR slices (stacked-to-main, 800-line budget)

| PR | Unit | src | tests | Δ |
|---|---|---|---|---|
| 1 | Complete `middleware.ts`→`proxy.ts` rename (test file, `vitest.config.ts`, `tsconfig.next.json`, `package.json`, `CONTEXT-MAP.md`, `README.md`) + font matcher fix | 60 | 30 | **90** |
| 2 | Foundations: deps, `lib/cn.ts`, `lib/hooks/use-is-mobile.ts`, `app/_data/**` hoist + de-duplication (ADR-2) | 250 | 150 | **400** |
| 3 | `_ui` atoms A: Button, Card, Input + `index.tsx` barrel, Badge | 252 | 160 | **412** |
| 4 | `_ui` atoms B: Alert, Skeleton, IconButton, ReloadButton, Logo | 317 | 150 | **467** |
| 5 | `_ui` identity + money: Avatar/AvatarGroup, StatFigure, MemberBar, ProgressMeter | 493 | 220 | **713** |
| 6 | `_ui` overlays: Dialog, ResponsiveDialog, RowMenu, Select, IconPicker | 451 | 230 | **681** |
| 7 | `_ui` DatePicker | 477 | 170 | **647** |
| 8 | Theme (`THEME_SCRIPT` + `ThemeToggle`), `/` redirect, `signOut()` action | 145 | 120 | **265** |
| 9 | Nav A: `NAV_ITEMS`, `NavItemLink`, `SidebarNav`, `AppShell` rewrite, `(app)/layout.tsx` un-stub | 448 | 200 | **648** |
| 10 | Nav B: `MobileTopBar`, `MobileTabBar`, `GroupSwitcher`, `AccountMenu` | 293 | 200 | **493** |
| 11 | Groups full parity (ADR-0008): `GroupsClient` rewrite + `CreateGroupForm` | 281 | 200 | **481** |
| 12 | Dashboard shell (ADR-0003 two-column) + `RemainingBalance` + `RecentExpenses` | 424 | 180 | **604** |
| 13 | `IncomeOverview` (+ income-edit mutation) + `BudgetTransfers` | 364 | 200 | **564** |
| 14 | `BudgetCategories` read/accordion (ADR-0006) — see ADR-9 | 450 | 250 | **700** |
| 15 | `BudgetCategories` mutations: category CRUD dialogs + inline transfer + `by-category` history | 370 | 250 | **620** |
| 16 | `SavingsGoalList` + savings prefetch + `ExpenseForm` add-expense quick action | 536 | 250 | **786** |
| | **Total** | **5,611** | **2,960** | **~8,571** |

Every slice is under the 800-line budget. The total is ~2.8× the proposal's ~3,090 estimate
because the proposal did not trace `ExpenseForm`→`DatePicker`/`Select`,
`GroupsPage`→`CreateGroupForm`, or the true `shared/ui` size (~1,990 lines, dominated by
`DatePicker` at 477 and `Avatar` at 208), and excluded tests entirely.

### Dependency graph

```
1 (independent, unblocks CI for everything)
2 ──┬── 3 ──┐
    └── 4 ──┼── 5 ──┬── 11 (groups)
            │       ├── 12 ── 13
            └── 6 ──┼── 14 ── 15
                    └── 7 ── 16
8 ── 9 ── 10 ──────────────────► (nav must land before 11-16 render inside real chrome)
```

Merge order is the PR number. Rebase each child on `main` after its parent merges; a child
diff showing a parent's files is a base bug, not a review finding.

### Rollback

Newest-first, independently. PR 1 alone restores font loading and CI. Reverting 11–16
returns that page to its lean placeholder (still renders, still functional). Reverting 9–10
returns `AppShell` to the placeholder header. 3–7 revert only if nothing above them landed.

## Open Questions

- [ ] **Base UI package name.** The proposal writes `@base-ui/react`; the historically
      published name is `@base-ui-components/react`. PR 6 must verify the exact name and
      current version before installing. Blocks only PR 6.
- [ ] **`ThemeToggle` `localStorage` key.** `main`'s exact key must be reused so an existing
      user's stored preference survives; assumed `"theme"` until the port reads
      `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx` on `main`. Blocks only PR 8.
- [ ] **`shared/ui` count discrepancy.** The orchestrator's inventory totals ~1,843 while the
      itemised list sums to ~1,990 (the delta is `Logo.tsx`, 147, counted under nav). Slice
      estimates use 1,990. Not blocking.
- [ ] **`Spinner.tsx` / `UserDisplay.tsx`.** Excluded until a concrete usage appears in a
      ported file; if PR 12–16 hits one, it is a same-PR addition (~63 lines), not a new slice.
- [ ] **Engram unavailable.** This artifact exists only as an OpenSpec file this session;
      `sdd/nextjs-migration-ui-fixes/design` needs a manual backfill later.
