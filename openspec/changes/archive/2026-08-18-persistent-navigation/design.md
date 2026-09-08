# Design: Persistent Navigation Shell

Artifact store: hybrid. Engram topic: `sdd/persistent-navigation/design`.
Inputs: `proposal.md` (D1–D6, authoritative), `specs/app-navigation-shell/spec.md`.

## Technical Approach

One `AppShell` replaces `Layout` and branches on `useIsMobile()` (D3). All three nav surfaces
render from a single `NAV_ITEMS` table through one `NavItemLink` renderer, so desktop and mobile
cannot drift. Group list moves into `GroupListProvider` (D1) built on the existing `useApiQuery`
hook. Active-group persistence (D4) splits into two halves: an *optimistic* localStorage restore
inside `ActiveGroupProvider` (no `groupId` flicker for the gated Savings item) and a *validation*
pass in `ActiveGroupSync` once the group list settles. The FAB stays out of the shell entirely (D5).

## Architecture Decisions

| # | Decision | Alternatives rejected | Rationale |
|---|---|---|---|
| A1 | `GroupListProvider` wraps `useApiQuery<Group[]>(user?.id ?? null, fetcher, [])`; `groupApi.list` gains an optional `signal?: AbortSignal` | Bespoke `useState`+`useEffect` fetch (today's `GroupsPage`) | Reuses the repo's abort/refresh/error pattern; keyed on user id so a re-login refetches. `list(signal?)` is additive — no caller breaks. |
| A2 | Restore persisted group id in `useState` initializer (synchronous), validate later | Wait for the list before restoring | Spec forbids Savings-item flicker; deferring restore guarantees one render with `groupId === null`. |
| A3 | Validation lives in `ActiveGroupSync` (renders `null`), mounted inside `GroupListProvider` | Put the effect in `GroupListProvider` or in `AppShell` | Keeps both contexts single-purpose (D1) and `AppShell` free of side effects; the sync rule is unit-testable in isolation. |
| A4 | Clear the persisted key when `useAuth().user` transitions to `null` | Clear inside `AuthProvider.signOut()` | Also covers token expiry / `SIGNED_OUT` from another tab, not just the explicit button. |
| A5 | Sidebar owns its collapse state via `useSidebarCollapsed()`; `<main>` is a flex sibling | `AppShell` owns collapse and offsets `<main>` | No width coupling → collapse never re-lays-out page content. |
| A6 | Pages own the `isMobile` conditional; `AddExpenseFab` is pure presentation | FAB reads `useIsMobile()` itself | Both pages already need `isMobile` to hide the header button; one conditional per page cannot desync from itself. |
| A7 | Switcher select = `setGroupId(id)` + navigate via `groupSwitchTarget(pathname, id)` | Always navigate to `/dashboard/:id` | Switching group while on Expenses should stay on Expenses. Pure helper, unit-testable. |

## Interfaces / Contracts

```ts
// widgets/navigation/model/navItems.ts
export type NavSurface = "sidebar" | "tabBar";
export interface NavItem {
  label: string;                 // "Dashboard"
  icon: LucideIcon;             // each surface picks its own size
  pattern: string;              // "/dashboard/:groupId" — matchPath input
  to: (groupId: string | null) => string;
  requiresGroup: boolean;        // Savings + all group-scoped items
  surfaces: readonly NavSurface[];
}
export const NAV_ITEMS: readonly NavItem[];      // Dashboard, Expenses, Transfers, Savings*, Groups, Profile(sidebar only)
export function matchNavItem(pathname: string, items?): NavItem | null;      // matchPath, end: true
export function groupSwitchTarget(pathname: string, groupId: string): string; // matched pattern re-bound, else /dashboard/:id
```

```ts
// app/providers/GroupListContext.tsx
interface GroupListContextValue { groups: Group[]; loading: boolean; error: string | null; refresh: () => void; }
export function GroupListProvider({ children }: { children: ReactNode }): JSX.Element;
export function useGroupList(): GroupListContextValue;   // throws outside provider (repo convention)
```

```ts
// app/providers/ActiveGroupContext.tsx  (MODIFIED)
export const ACTIVE_GROUP_STORAGE_KEY = "calculoides.activeGroupId";
// useState(() => localStorage.getItem(KEY))          ← restore (A2)
// effect: persist on change; remove key when value is null
// effect: user?.id === null → setGroupId(null) + removeItem   (A4)
export function useActiveGroup(): string | null;                 // unchanged
export function useSetActiveGroup(groupId: string | undefined): void; // cleanup that nulls on unmount REMOVED (D4)
export function useActiveGroupSetter(): (id: string | null) => void;  // NEW — switcher + sync
```

```ts
// app/providers/ActiveGroupSync.tsx  → renders null
// when !loading && !error: groupId && !groups.some(g => g.id === groupId) → setGroupId(null)
// when !loading && !groupId && groups.length: leave null (no auto-pick; /groups is the entry point)
```

```ts
// shared/ui/AddExpenseFab.tsx  (exported from shared/ui/index.tsx)
interface AddExpenseFabProps { onClick: () => void; disabled?: boolean; label?: string /* "Add Expense" */ }
// fixed bottom-right above the tab bar, safe-area aware, aria-label={label}, Plus icon. No dialog/data logic.
```

Surface props: `SidebarNav {}` · `MobileTopBar {}` · `MobileTabBar {}` · `AccountMenu {}` (all consume
context/router directly, like today's `HamburgerMenu`) · `NavItemLink { item; groupId; active; collapsed? }`
· `GroupSwitcher { variant: "sidebar" | "pill"; collapsed?: boolean }`.

## Data Flow

    AuthProvider ──user──→ ActiveGroupProvider ──groupId──→ (localStorage: calculoides.activeGroupId)
                                    │
                             ProtectedRoute
                                    │
                           GroupListProvider ──groupApi.list(signal)──→ GET /groups
                              │           │
                     ActiveGroupSync   AppShell ── useIsMobile ──┬─ SidebarNav ─┐
                     (validate/clear)     │                     └─ MobileTopBar├─ NavItemLink ← NAV_ITEMS
                                          │                        MobileTabBar ┘   ↑ matchNavItem(useLocation)
                                          └─ <main> ── route page ── AddExpenseFab → page's own dialog state

## File Changes

| File | Action | Description |
|---|---|---|
| `frontend/src/app/ui/AppShell.tsx` | Create | Breakpoint branch, landmarks, `<main>` bottom padding for tab bar + FAB |
| `frontend/src/widgets/navigation/model/navItems.ts` | Create | `NAV_ITEMS`, `matchNavItem`, `groupSwitchTarget` |
| `frontend/src/widgets/navigation/model/useSidebarCollapsed.ts` | Create | `calculoides.sidebarCollapsed` localStorage state |
| `frontend/src/widgets/navigation/ui/NavItemLink.tsx` | Create | Single link renderer (`aria-current="page"`, collapsed icon-only) |
| `.../ui/SidebarNav.tsx`, `MobileTopBar.tsx`, `MobileTabBar.tsx`, `AccountMenu.tsx` | Create | Surfaces; `<nav aria-label>` each; Base UI `Menu` for popups (D6); `ThemeToggle` wrapped, not modified |
| `.../ui/GroupSwitcher.tsx` | Create | Base UI `Menu`; current group + member count, first 3 in API order, "Show More" → `/groups`, empty state |
| `frontend/src/app/providers/GroupListContext.tsx` | Create | A1 |
| `frontend/src/app/providers/ActiveGroupSync.tsx` | Create | A3 |
| `frontend/src/shared/ui/AddExpenseFab.tsx` | Create | Presentational only (A6) |
| `frontend/src/app/providers/ActiveGroupContext.tsx` | Modify | D4 restore/persist/clear; drop unmount cleanup; add `useActiveGroupSetter` |
| `frontend/src/app/App.tsx` | Modify | `ProtectedRoute > GroupListProvider > [ActiveGroupSync, AppShell > Routes]` |
| `frontend/src/entities/group/index.ts` | Modify | `list: (signal?: AbortSignal)` |
| `frontend/src/pages/groups/ui/GroupsPage.tsx` | Modify | Use `useGroupList()`; delete local fetch; `onCreated`/retry → `refresh()` |
| `frontend/src/pages/dashboard/ui/DashboardPage.tsx` | Modify | `useIsMobile()`; header button `{!isMobile && …}`; `{isMobile && <AddExpenseFab onClick={() => setCreateExpenseOpen(true)} />}` |
| `frontend/src/pages/expenses/ui/ExpensesPage.tsx` | Modify | Header CTA `{!isMobile && …}`; `<AddExpenseFab disabled={!summary} onClick={() => setExpenseDialog({ mode: "form", expense: null })} />`; empty-state button unchanged |
| `frontend/src/shared/ui/index.tsx` | Modify | Export `AddExpenseFab` |
| `frontend/tests/widgets/navigation.test.tsx` | Modify | Rewrite for shell surfaces |
| `frontend/DESIGN.md` | Modify | Rewrite Navigation section (line ~302) |
| `frontend/src/app/ui/Layout.tsx`, `widgets/navigation/ui/HamburgerMenu.tsx` | Delete | Superseded |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `matchNavItem` (param routes, no match), `groupSwitchTarget`, `useSidebarCollapsed`, `ActiveGroupSync` restore/clear rules | Vitest pure fns + RTL `renderHook` with mocked `localStorage` |
| Component | Sidebar/top-bar/tab-bar item sets, `aria-current`, Savings gating, collapse persistence, switcher (0/1/5 groups, Show More), `AddExpenseFab` a11y | RTL in `tests/widgets/navigation.test.tsx` + `MemoryRouter` + provider harness; `matchMedia` mock for `useIsMobile` |
| Integration | Dashboard/Expenses FAB↔header swap per breakpoint and that the FAB opens the page's existing dialog; `GroupsPage` no longer fetches on mount | Extend `tests/pages/dashboard.test.tsx`, `expenses-page.test.tsx`, `groups.test.tsx` |

## Threat Matrix

N/A — no server routing, shell command, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. `ProtectedRoute` and API authorization are
untouched; the persisted group id is only a client-side navigation hint and every `/groups`,
`/summary`, `/expenses` call remains server-authorized per request.

## Migration / Rollout

No data migration. Two new namespaced localStorage keys (`calculoides.activeGroupId`,
`calculoides.sidebarCollapsed`) — the unnamespaced `theme` key is untouched; both become inert on
revert. Sliced for the 800-line review budget, each slice independently shippable:

1. **Shell + nav items** — `navItems`, `NavItemLink`, four surfaces (no switcher yet), `useSidebarCollapsed`, `AppShell`, `App.tsx`, delete `Layout`/`HamburgerMenu`, `DESIGN.md`, nav tests. Savings gating keeps today's per-route behavior.
2. **Group-list state + switcher + D4** — `GroupListContext`, `groupApi.list(signal)`, `ActiveGroupContext` persistence, `ActiveGroupSync`, `GroupSwitcher` imported into `SidebarNav`/`MobileTopBar`, `GroupsPage` refactor.
3. **FAB** — `AddExpenseFab`, `shared/ui` export, Dashboard + Expenses wiring.

## Open Questions

- [ ] Whether an ADR in `docs/adr/` should supersede the `DESIGN.md` Navigation section (proposal left this open; design assumes DESIGN.md rewrite is sufficient).
- [ ] Group-list loading state inside nav chrome: switcher renders a `Skeleton` pill while `loading` — not spec'd, assumed acceptable.
