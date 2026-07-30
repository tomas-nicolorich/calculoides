# Tasks: Persistent Navigation Shell

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950-1150 total (S1 ~450-550, S2 ~350-420, S3 ~120-160) |
| 400-line budget risk | Low per slice / High for whole change (budget=800) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Shell+nav -> PR2 Group state+switcher -> PR3 FAB |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low (per-slice, vs 800-line budget)

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Shell + nav items | PR1 | `vitest run navigation.test.tsx` | Load any authed route desktop+mobile, check chrome + active item | Revert `AppShell.tsx`, `widgets/navigation/`, `App.tsx`; restore `Layout.tsx`/`HamburgerMenu.tsx` |
| 2 | Group-list + switcher + D4 | PR2 | `vitest run navigation.test.tsx groups.test.tsx` | Login w/ stored group id (restores), leave group (clears), sign out (clears key) | Revert `GroupListContext.tsx`, `ActiveGroupSync.tsx`, `GroupSwitcher.tsx`, `ActiveGroupContext.tsx`, `groupApi.list` sig, `GroupsPage.tsx`; S1 shell keeps per-route Savings gating |
| 3 | Mobile FAB | PR3 | `vitest run dashboard.test.tsx expenses-page.test.tsx` | Mobile: tap FAB opens existing dialog; desktop: header button, no FAB | Revert `AddExpenseFab.tsx`, its export, two page diffs |

## Slice 1 (PR 1): Shell + Nav Items
Covers: Persistent Shell Chrome, Desktop Sidebar Collapse, Active Route Highlighting, Bottom-Pinned Controls.

- [x] 1.1 RED — rewrite `frontend/tests/widgets/navigation.test.tsx`: desktop chrome (Authenticated route on desktop), zero-group chrome (Zero-group user still sees chrome), `aria-current` on param match (Parameterized route matches), no active on no match (No matching route), collapsed rail controls (Collapsed rail still exposes controls). Use `MemoryRouter` + provider harness + `matchMedia` mock.
- [x] 1.2 RED — add unit tests: `matchNavItem` (match/no-match), `useSidebarCollapsed` persistence (User collapses sidebar).
- [x] 1.3 GREEN — create `widgets/navigation/model/navItems.ts`: `NavItem`, `NAV_ITEMS`, `matchNavItem`, `groupSwitchTarget`.
- [x] 1.4 GREEN — create `widgets/navigation/model/useSidebarCollapsed.ts` (`calculoides.sidebarCollapsed`).
- [x] 1.5 GREEN — create `widgets/navigation/ui/NavItemLink.tsx` (aria-current, collapsed icon-only).
- [x] 1.6 GREEN — create `SidebarNav.tsx`, `MobileTopBar.tsx`, `MobileTabBar.tsx`, `AccountMenu.tsx`; Base UI `Menu`; Savings item keeps today's per-route gating (no switcher yet).
- [x] 1.7 GREEN — create `app/ui/AppShell.tsx` (branch on `useIsMobile`, `<main>` padding for tab bar/FAB).
- [x] 1.8 GREEN — modify `app/App.tsx`: wire `AppShell` inside `ProtectedRoute`. Confirm 1.1/1.2 pass.
- [x] 1.9 Delete `app/ui/Layout.tsx`, `widgets/navigation/ui/HamburgerMenu.tsx`.
- [x] 1.10 REFACTOR — remove dead imports/exports from old Layout/HamburgerMenu path.
- [x] 1.11 Rewrite Navigation section of `frontend/DESIGN.md` (~line 302).

## Slice 2 (PR 2): Group-List State + Switcher + D4 Persistence
Covers: Group Switcher, Active Group Persistence, Conditional Savings Nav Item.

- [ ] 2.1 RED — `ActiveGroupSync` rules: clear stale id (Stored group no longer valid), no auto-pick when unset.
- [ ] 2.2 RED — `groupSwitchTarget`: pattern re-bind, fallback `/dashboard/:id`.
- [ ] 2.3 RED — extend `navigation.test.tsx`: switcher many groups+Show More (Many groups), single group (Single group), zero groups (Zero groups).
- [ ] 2.4 RED — restore-on-login (Restore valid group on login), sign-out clears key (Sign-out clears active group).
- [ ] 2.5 RED — extend `tests/pages/groups.test.tsx`: `GroupsPage` no longer fetches on mount, reads `useGroupList()`.
- [ ] 2.6 GREEN — modify `entities/group/index.ts`: `groupApi.list(signal?)`.
- [ ] 2.7 GREEN — create `app/providers/GroupListContext.tsx` (`useApiQuery<Group[]>`, A1).
- [ ] 2.8 GREEN — modify `app/providers/ActiveGroupContext.tsx`: `ACTIVE_GROUP_STORAGE_KEY`, restore-in-initializer (A2), persist/clear effects (A4), drop unmount-nulling cleanup, add `useActiveGroupSetter`.
- [ ] 2.9 GREEN — create `app/providers/ActiveGroupSync.tsx` (A3, satisfies 2.1).
- [ ] 2.10 GREEN — create `widgets/navigation/ui/GroupSwitcher.tsx` (first 3 groups, Show More, empty state).
- [ ] 2.11 GREEN — wire `GroupSwitcher` into `SidebarNav`/`MobileTopBar`; gate Savings on `groupId` presence.
- [ ] 2.12 GREEN — modify `App.tsx`: `ProtectedRoute > GroupListProvider > [ActiveGroupSync, AppShell > Routes]`.
- [ ] 2.13 GREEN — refactor `pages/groups/ui/GroupsPage.tsx` onto `useGroupList()`; `onCreated`/retry -> `refresh()`. Confirm 2.1-2.5 pass.
- [ ] 2.14 REFACTOR — remove leftover local group-fetch state now owned by `GroupListContext`.

## Slice 3 (PR 3): Mobile Add Expense FAB
Covers: Mobile Add Expense FAB.

- [ ] 3.1 RED — extend `tests/pages/dashboard.test.tsx`: mobile hides header, shows FAB opening existing dialog (Dashboard on mobile); desktop unaffected (Desktop unaffected).
- [ ] 3.2 RED — extend `tests/pages/expenses-page.test.tsx`: mirror 3.1, incl. `disabled={!summary}`.
- [ ] 3.3 RED — add `AddExpenseFab` a11y spec (fixed position, `aria-label`, no dialog logic); include guard that other pages never render it (Other pages never show the FAB).
- [ ] 3.4 GREEN — create `shared/ui/AddExpenseFab.tsx` (presentational, A6).
- [ ] 3.5 GREEN — modify `shared/ui/index.tsx`: export `AddExpenseFab`.
- [ ] 3.6 GREEN — modify `pages/dashboard/ui/DashboardPage.tsx`: `useIsMobile`, hide header on mobile, render FAB -> `setCreateExpenseOpen(true)`.
- [ ] 3.7 GREEN — modify `pages/expenses/ui/ExpensesPage.tsx`: hide header CTA on mobile, render FAB -> `setExpenseDialog({mode:"form",expense:null})`; empty-state button unchanged. Confirm 3.1-3.3 pass.
- [ ] 3.8 REFACTOR — verify no orphan FAB usage elsewhere.
