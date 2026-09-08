# Proposal: Persistent Navigation Shell

## Intent

The whole authenticated app hangs off one hamburger dropdown (`Layout.tsx` → `HamburgerMenu.tsx`). Every move between Dashboard, Expenses, Transfers and Savings costs two taps, hides where the user is, and never shows which group is active. Switching groups requires a detour through `/groups`. Replace it with a persistent shell — desktop sidebar, mobile top bar + bottom tab bar — ported from the approved Claude Design `AppShell` prototype and rebuilt on this repo's Base UI primitives and `DESIGN.md` tokens. Affected workspace: **frontend only** (no API/shared/Prisma change).

## Scope

### In Scope
- Collapsible desktop sidebar (232px / 68px, state persisted in `localStorage` like `theme`): brand, group switcher, nav items with active-route highlight, bottom-pinned theme toggle + collapse + Sign Out.
- Mobile (≤639px): 56px sticky top bar (brand, group-switcher pill, account menu) + fixed bottom tab bar, `safe-area-inset-bottom` aware.
- Shared group-list state fetched once from existing `groupApi.list()`; switcher shows current group + member count, top 3 groups, "Show More" → `/groups`.
- Mobile-only Add Expense FAB, shown on **Dashboard and Expenses pages only** — replacing each page's existing header "Add Expense" button on mobile and reusing that page's own dialog/refresh logic. No FAB on Transfers/Savings/Groups/Profile.
- Active-group persistence fix (see D4) and `DESIGN.md` Navigation section update.

### Out of Scope
- Page content components, auth pages (stay shell-less), the `ThemeToggle` component's own markup, colour/token system.
- Desktop FAB, nav search, breadcrumbs, keyboard shortcuts, group switcher inside `GroupsPage`, a shell-level/independent Add Expense dialog.

## Capabilities

### New Capabilities
- `app-navigation-shell`: persistent navigation chrome, group switching, active-route state, and the mobile quick-add affordance.

### Modified Capabilities
- None (no existing spec covers navigation).

## Approach

One `AppShell` replacing `Layout`, composing `SidebarNav`, `MobileTopBar`, `MobileTabBar`, `AccountMenu`, `GroupSwitcher`. A single `NAV_ITEMS` table (label, icon, path pattern, `requiresGroup`) drives every surface, so desktop and mobile cannot drift. The Add Expense FAB is deliberately **not** part of this shell composition — see D5.

| # | Decision | Rationale / tradeoff |
|---|----------|----------------------|
| D1 | Group list in a **new** `GroupListProvider` (`app/providers/GroupListContext.tsx`), not inside `ActiveGroupContext` | Keeps `ActiveGroupContext` single-purpose; avoids re-rendering the list on every `groupId` change. Cost: a second provider to mount. |
| D2 | Active state via react-router `useMatch`/`matchPath` on patterns (`/dashboard/:groupId`) | Exact-string comparison cannot match parameterised routes. |
| D3 | One `AppShell` branching on existing `useIsMobile()` (already `max-width: 639px`) | Matches repo precedent (`ResponsiveDialog`, `ExpensesPage`); avoids duplicate DOM landmarks and duplicate `getByRole` hits in tests. Cost: a media-query re-render instead of pure CSS. |
| D4 | Persist last active group (localStorage) and stop `useSetActiveGroup` nulling it on unmount; restore on next login, validated against the fetched group list | Today `/groups` and `/profile` never set it and unmount resets to `null`, so a *persistent* switcher and the group-gated Savings item would blank out mid-navigation. User-confirmed: remember last group across logins rather than resetting to `/groups` every session. |
| D5 | FAB lives inside `DashboardPage` and `ExpensesPage` only (not shell-level); on mobile it replaces that page's own header "Add Expense" button and reuses that page's existing dialog state + refresh callbacks. No FAB elsewhere. | Both pages already own a working add-expense dialog (`ResponsiveDialog` + `ExpenseForm`) with their own `refresh`/`handleRefresh` calls. A shell-level dialog can't reach those callbacks without duplicating fetch/refresh logic and risking drift between two copies. User-confirmed scope: FAB only on these two pages. |
| D6 | Base UI `Menu`/`Popover` for switcher and account menu | Prototype's plain-div dropdowns lose focus trap, portal and a11y already solved in `HamburgerMenu`/`RowMenu`. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/app/ui/Layout.tsx` | Removed | Replaced by `AppShell` |
| `frontend/src/app/ui/AppShell.tsx` | New | Shell composition + breakpoint branch |
| `frontend/src/widgets/navigation/ui/*` | New | `SidebarNav`, `MobileTopBar`, `MobileTabBar`, `AccountMenu`, `GroupSwitcher`, `navItems.ts` |
| `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx` | Removed | Superseded |
| `frontend/src/app/providers/GroupListContext.tsx` | New | Shared `Group[]` + refresh |
| `frontend/src/app/providers/ActiveGroupContext.tsx` | Modified | Persist last active group (D4) |
| `frontend/src/app/App.tsx` | Modified | Mount `GroupListProvider`, render `AppShell` |
| `frontend/src/shared/ui/AddExpenseFab.tsx` | New | Presentational floating button only, no dialog/data logic |
| `frontend/src/pages/dashboard/ui/DashboardPage.tsx` | Modified | Render `AddExpenseFab` on mobile (wired to existing `createExpenseOpen` state); hide header button on mobile |
| `frontend/src/pages/expenses/ui/ExpensesPage.tsx` | Modified | Render `AddExpenseFab` on mobile (wired to existing `expenseDialog` state); hide header button on mobile |
| `frontend/src/pages/groups/ui/GroupsPage.tsx` | Modified | Consume shared group list instead of local fetch |
| `frontend/tests/widgets/navigation.test.tsx` | Modified | Rewritten for the shell surfaces |
| `frontend/DESIGN.md` | Modified | Navigation section states "no persistent sidebar" — must be rewritten |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Exceeds the 800-line review budget | High | Slice: (1) shell + nav items, (2) group-list state + switcher, (3) FAB + dialog extraction |
| D4 active-group persistence causes a stale group after leaving a group | Med | Validate persisted id against the fetched list; clear on miss / sign-out |
| FAB visibility (mobile-only, Dashboard/Expenses-only) drifts from the header-button toggle it replaces | Low | Single shared `useIsMobile()` conditional per page; no new dialog/data logic to drift |
| `ThemeToggle` renders a full-width label+switch, unusable in a 68px rail | Med | Wrap it in the shell; do not modify the component (out of scope) |
| Fixed tab bar / FAB overlap page content and existing sticky page headers | Med | Reserve bottom padding in the shell's `<main>`; verify each route on mobile |
| Nav a11y regression (landmarks, focus order, tooltips on collapsed rail) | Med | `<nav aria-label>` per surface, `aria-current="page"`, Base UI popups |

## Rollback Plan

Frontend-only and per-slice revertible. Revert the shell commit(s) to restore `Layout.tsx` + `HamburgerMenu.tsx`; the sidebar-collapse and active-group `localStorage` keys become inert (add a namespaced key so no existing key is clobbered). No API, schema, or migration involvement.

## Dependencies

- None new. Uses existing `groupApi.list()`, `useIsMobile`, `ExpenseForm`, `ResponsiveDialog`, Base UI, `DESIGN.md` tokens.

## Success Criteria

- [ ] Every primary route is reachable in one tap/click from any authenticated page on both breakpoints.
- [ ] Active route is visibly highlighted for parameterised routes (`/dashboard/:groupId`, etc.).
- [ ] Group switcher shows the current group + member count and switches groups without visiting `/groups`.
- [ ] `groupApi.list()` is fetched once per session and shared; `GroupsPage` no longer refetches on mount.
- [ ] Savings Goals stays hidden when no group is active, and does not flicker during route transitions.
- [ ] Mobile FAB renders only on Dashboard and Expenses pages, replaces each page's header Add Expense button on mobile, and opens that page's existing Add Expense flow (no FAB on Transfers/Savings/Groups/Profile).
- [ ] Active group is remembered across logins (`localStorage`, validated against the fetched group list) instead of resetting to `/groups` every session.
- [ ] Empty state (zero groups) renders the shell without a broken switcher.
- [ ] `npm test`, `npm run lint`, `npm run typecheck` pass; `HamburgerMenu` has no remaining references.

## Downstream (open for spec/design)

- D4 exact persistence semantics: localStorage key name, clear-on-sign-out — direction (remember last group) is settled, only the mechanics remain.
- Group switcher "top 3" ordering rule (recency vs API order) — still unspecified, default to API order unless design decides otherwise.
- Zero-group empty state: whether shell chrome renders with an empty switcher or is suppressed — still unspecified.
- Whether the shell warrants a new ADR in `docs/adr/` (supersedes the `DESIGN.md` Navigation section).
- Loading/error state for the shared group list inside nav chrome.

## User corrections after initial draft (2026-07-30)
- FAB scope corrected: Dashboard + Expenses pages only, replacing each page's own header button on mobile — not a shell-level independent dialog (see D5, verified via CodeGraph that both pages already own working dialog/refresh logic).
- Active-group memory: confirmed "remember last group across logins," not reset-per-session (D4).
