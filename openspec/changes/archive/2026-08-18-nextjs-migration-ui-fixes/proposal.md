# Proposal: Next.js Migration UI Fixes

## Intent

`nextjs-migration` Phases 0–7 deleted the working Vite `frontend/` and shipped its UI surfaces as self-documented placeholders. The result is five user-visible regressions: no root redirect, no navigation chrome, unstyled dashboard/groups, no dark-mode toggle, and a proxy matcher that 307s `/fonts/*.woff2` → `/login` (verified: `OTS parsing error: invalid sfntVersion: 1008813135` = `<!DO`).

**User directive (2026-08-07)**: this is not "five bug fixes". The Next.js migration was scoped as a *full* migration — the app must be what it was before, on Next instead of Vite. Dashboard and Groups therefore ship at **full feature parity with `main`**, not as a token/spacing restyle.

**Workspaces affected**: root Next.js app only (`app/`, `lib/`, `proxy.ts`). The `api`/`frontend`/`shared` workspaces were retired in `b1f4a7e`.

## Scope

### In Scope

- **#5** Complete the in-flight `middleware.ts`→`proxy.ts` rename (commit `proxy.ts`, fix `package.json` `lint`/`lint:next`, `CONTEXT-MAP.md` prose) and exclude font/static extensions from `config.matcher`.
- **#2** Navigation shell: `NAV_ITEMS` table, `useIsMobile()`-branching `AppShell` → `SidebarNav`/`MobileTopBar`/`MobileTabBar`, `NavItemLink`, `GroupSwitcher`, `AccountMenu`, `AddExpenseFab`; un-stub `getGroupNames()` against existing `lib/server/services/group.ts`.
- **#4** `ThemeToggle` in the shell, driving `.dark` on `<html>` + `localStorage`.
- **#1** `app/page.tsx` → Server Component redirect: session → `/groups`, no session → `/login`.
- **#3 (revised — full parity)**
  - **Dashboard**: port `DashboardPage.tsx` (399 lines) **and its widget set**, confirmed by name from committed artifacts: `IncomeOverview`, `BudgetCategories`, `BudgetTransfers`, `RecentExpenses`, `RemainingBalance`, `SavingsGoalList`.
  - **Groups**: port `GroupsPage.tsx` (191 lines) to full parity.
  - **Design-system layer** (prerequisite, per ADR 0005): port `shared/ui/**` primitives — Button (semantic money variants), Card, Input, Select, Badge, Avatar/AvatarGroup, IconButton, UserDisplay, Dialog, ResponsiveDialog, RowMenu, DatePicker, IconPicker — and `shared/ui/money/**` — StatFigure, MemberBar, ProgressMeter. `GroupsClient.tsx`'s own comment confirms none exist in `app/` today ("plain Tailwind, no `shared/ui` atom imports").
  - Governing ADRs are the acceptance reference: 0002 visual weight, 0003 two-column layout, 0005 design system, 0006 categories accordion, 0007 dashboard fidelity, 0008 groups-list fidelity, 0009 row presentation.

### Out of Scope

- **Parity for Expenses / Transfers / Savings / Members.** Grep-confirmed these are also lean ports (`ExpensesClient.tsx`: *"lean, not a full port"*), and ADR 0010/0011 govern them. The user's directive named Dashboard and Groups only. **Open decision — see Risks.**
- `next-themes` (the ported toggle needs no provider lib); OS-preference syncing beyond first-load fallback.
- Re-litigating IA or visual decisions — `persistent-navigation/design.md` and ADRs 0002–0011 stand as-is.
- Reviving the `frontend`/`api` workspaces or any React-Router/Express code path.

## Capabilities

### New Capabilities

- `app-navigation-shell`: persistent chrome, responsive branching, group switching, account menu, root-route entry redirect. Supersedes the unlanded `persistent-navigation` delta (its implementation died with `frontend/`).
- `theme-preference`: manual light/dark selection, persistence, first-load fallback.
- `ui-design-system`: ported CDS primitive + money-visualisation layer, semantic Button/Badge vocabulary per ADR 0005.
- `dashboard-view`: widget composition, two-column layout, loading/empty/error states at parity.
- `groups-view`: group list, create, and selection at parity.

### Modified Capabilities

- `server-session-auth` (in-flight under `nextjs-migration`): static-asset paths MUST bypass the proxy matcher and never receive an auth redirect.

> Existing `openspec/specs/` capabilities (`dashboard-income`, `savings-goal-management`, `savings-income-split-allocation`) are **unchanged** — parity means their requirements must continue to hold on the new implementation, not change.

## Approach

| Bug | Choice | Rationale |
|---|---|---|
| #2 nav (~713 lines on `main`) | **C — hybrid** | Prior art is React-Router-era (`<Link to>`, `useLocation`, `ActiveGroupContext`). Routing seams are rewritten anyway, so "port" degenerates into rewrite-plus-baggage. Reuse IA, `NAV_ITEMS` shape, and pure-presentational Tailwind; rewrite against `next/link`, `usePathname`, Server Components, `lib/server/services/group.ts`. |
| #4 toggle (65 lines) | **A — direct port** | Pure `localStorage` + `.dark` on `documentElement`; zero router/data coupling, and `app/globals.css` already ships `@custom-variant dark (&:where(.dark, .dark *))`. |
| #1 root | **B — fresh** | ~10-line Server Component; no prior art worth porting. |
| **#3 dashboard + groups** | **A — full port** | `main`'s implementation *is* the target, not a blueprint. Visual output, widget set, and interaction behavior are fixed by ADRs 0002–0009 and by shipped specs; reimplementing would re-open decisions the user explicitly wants preserved. Port markup/Tailwind/component APIs verbatim; adapt only the data layer. |

**Data-layer adaptation is smaller than feared.** `tanstack-query-migration` already landed on `main`, so `DashboardPage` and its widgets consume TanStack Query hooks with `queryKeys.group(groupId)` invalidation — and this app already has `lib/query-client.ts` + `lib/query-keys.ts`. The port is TanStack-Query→TanStack-Query plus swapping `apiClient.fetch`/entity modules for `lib/actions/**` Server Actions, not a REST→Server-Component rewrite.

**Dependencies: likely no additions beyond the nav four.** Evidence: grep of the last built bundle (`frontend/dist/assets/index-*.js`) for `recharts|chart.js|victory|nivo|d3-|apexcharts|echarts` returned **zero matches**, and `frontend/node_modules/.vite/deps/` pre-bundled only `@base-ui/react` (dialog, popover, select), `clsx`, `lucide-react`, `tailwind-merge`, `react-router-dom`, `zod`, `@supabase/supabase-js`. `IncomeOverview` renders `MemberBar` (a CSS stacked bar per ADR 0005), not a chart library. **Both artifacts are stale build output — a git-capable phase must confirm against `main`'s `frontend/package.json`.**

**#5 bundling**: fixed *inside* the rename — two parallel half-finished middleware states is the worse outcome. Fix goes in `config.matcher`, not `PUBLIC_PATHS`, so static assets also skip a needless Supabase session refresh per request.

## Delivery (stacked-to-main, chained)

Full parity is **materially larger than the 399+191 page line count**: that figure excludes the six dashboard widgets and the entire `shared/ui/**` design-system layer, none of which exist in `app/` today.

| PR | Unit | Est. lines |
|---|---|---|
| 1 | `proxy.ts` rename completion + font matcher fix | ~40 |
| 2 | `shared/ui` core primitives (Button, Card, Input, Select, Badge, Avatar, IconButton, UserDisplay) | ~400 |
| 3 | `shared/ui` overlays (Dialog, ResponsiveDialog, RowMenu, DatePicker, IconPicker) + `shared/ui/money` (StatFigure, MemberBar, ProgressMeter) | ~400 |
| 4 | Nav skeleton: `NAV_ITEMS`, `useIsMobile`, `AppShell`, `SidebarNav`, `MobileTopBar`, `MobileTabBar`, `NavItemLink` | ~400 |
| 5 | `GroupSwitcher`, `AccountMenu`, `ThemeToggle`, `AddExpenseFab`, `getGroupNames()` un-stub | ~380 |
| 6 | Groups page full parity (ADR 0008) | ~280 |
| 7 | Dashboard shell + `IncomeOverview` + `RemainingBalance` (ADR 0003/0007) | ~420 |
| 8 | `BudgetCategories` (accordion, ADR 0006) + `BudgetTransfers` | ~420 |
| 9 | `RecentExpenses` + `SavingsGoalList` + root redirect (#1) | ~350 |
| | **Total** | **~3,090** |

PR 1 is independent and ships first. PRs 2–3 are prerequisites for 4–9 (everything imports the primitives). Estimates exclude tests; `persistent-navigation` overshot its forecasts 1.7–3.2×, so treat these as floors. `sdd-tasks` owns the binding forecast and MUST re-run it after a git-capable enumeration of `main`'s actual file sizes.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `proxy.ts` | Modified | Matcher excludes `woff|woff2|ttf|otf` (+ existing image set) |
| `package.json` | Modified | `lint`/`lint:next` → `proxy.ts`; new deps |
| `CONTEXT-MAP.md` | Modified | `middleware.ts` → `proxy.ts` prose; document the new UI layer |
| `app/page.tsx` | Modified | Placeholder → auth-aware redirect |
| `app/(app)/AppShell.tsx` | Modified | Placeholder → real shell |
| `app/(app)/layout.tsx` | Modified | `getGroupNames()` stub → service call |
| `app/_ui/**` (or `components/ui/**` — design decides) | New | Ported CDS primitives + money visualisations |
| `app/(app)/_nav/**`, `app/_theme/**` | New | Nav widgets, `NAV_ITEMS`, `ThemeToggle` |
| `app/(app)/dashboard/[groupId]/**` | Modified | Placeholder → full widget composition |
| `app/(app)/groups/GroupsClient.tsx` | Modified | Lean list → full parity |
| `lib/actions/**`, `lib/query-keys.ts` | Modified | Mutation/invalidation surfaces the widgets need |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **True scope is unenumerated.** Widget and `shared/ui` file sizes are unknown — this proposal's ~3,090 is an informed floor, not a measurement | **High** | `sdd-design` (or the orchestrator) MUST run a git-capable enumeration of `main`'s `frontend/src/{widgets/dashboard,pages/{dashboard,groups},shared/ui}/**` and re-forecast before `sdd-apply` |
| **Parity ambiguity across the other four pages.** Expenses/Transfers/Savings/Members are equally lean; the user's "full migration" framing plausibly covers them | **High** | Flagged as an explicit non-goal here. Needs a user answer before this change closes, or a sibling change |
| Nine chained PRs is a long-lived stack; rebase churn and drift | High | Strict bottom-up order; PRs 2–3 land fast to unblock the rest |
| Widget data seams need Server Actions that don't exist yet in `lib/actions/**` | Med | Enumerate per widget during design; a missing action is a task, not a surprise |
| Hidden dependency (chart/date/icon lib) appears during port | Low–Med | Bundle + `.vite/deps` evidence says no, but confirm against `main`'s `frontend/package.json` |
| Visual regression vs. `main` goes unnoticed (no E2E/visual tooling in this repo) | Med | ADRs 0002–0009 as written acceptance criteria; manual side-by-side against `main` per PR |
| `.dark` class flash on first paint (SSR) | Med | Inline pre-hydration script in `app/layout.tsx` |
| `@/*` alias slips in and breaks Fallow | Med | Relative imports only, per `CONTEXT-MAP.md` |

## Rollback Plan

Stacked PRs revert independently, newest-first. PR 1 alone restores font loading. Reverting PRs 6–9 returns the affected page to its lean placeholder (still renders, still functional). Reverting PRs 4–5 returns `AppShell` to the placeholder header. PRs 2–3 revert only if nothing above them has landed. No schema, migration, or data changes — rollback is pure code revert. Dep removals accompany their PR revert.

## Dependencies

- `lucide-react`, `clsx`, `tailwind-merge`, `@base-ui/react` (new; `@base-ui/react` covers Dialog/Popover/Select per the old pre-bundle).
- Any further dep implied by `main`'s widgets — pending git-capable confirmation.
- `lib/server/services/group.ts` (exists) must expose a signed-in-user group list.
- `lib/actions/{category,expense,transfer,savings,group,member}.ts` (exist) must cover every mutation the ported widgets fire.
- Local `proxy.ts` WIP must be committed as part of PR 1 before other slices branch.

## Success Criteria

- [ ] `curl -I /fonts/geist-variable.woff2` returns `200`, not `307`; no `OTS parsing error` in console.
- [ ] No repo reference to `middleware.ts` remains (`package.json`, `CONTEXT-MAP.md`); `npm run lint` passes.
- [ ] `/` redirects: signed-in → `/groups`, signed-out → `/login`.
- [ ] Nav chrome renders on every `(app)` route, desktop and mobile, with the active item marked; group switcher lists the user's real groups.
- [ ] Theme toggle flips `.dark` on `<html>`, persists across reload, no flash on first paint.
- [ ] **Dashboard parity**: renders `IncomeOverview`, `BudgetCategories`, `BudgetTransfers`, `RecentExpenses`, `RemainingBalance`, and `SavingsGoalList` in the ADR 0003 two-column layout; every mutation available on `main` (income edit, category create/update/delete, budget transfer, expense add) works and invalidates `queryKeys.group(groupId)`.
- [ ] **Groups parity**: list, create, and select behave as ADR 0008 specifies, including empty state.
- [ ] **Design-system parity**: no inline reimplementation of anything the ported `shared/ui` covers (ADR 0005's standing consequence); Button/Badge use the semantic money vocabulary.
- [ ] Side-by-side manual comparison against `main`'s running app shows no unintended visual or behavioral delta on Dashboard and Groups.
- [ ] `npm test` and `npm run typecheck` pass; every ported widget carries RTL coverage authored RED→GREEN→REFACTOR.
- [ ] `openspec/specs/dashboard-income`, `savings-goal-management`, and `savings-income-split-allocation` scenarios still hold against the new implementation.
