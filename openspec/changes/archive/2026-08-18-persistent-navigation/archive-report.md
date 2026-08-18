# Archive Report: Persistent Navigation Shell

**Change**: persistent-navigation
**Archived**: 2026-08-18
**Artifact Store Mode**: openspec
**Status**: Closed — complete, verified, all artifacts archived

---

## Final State Summary

The `persistent-navigation` change has completed the full SDD cycle (proposal → spec → design → implementation → verification → archive). All 33 tasks across 3 slices are complete. The change introduced a persistent navigation shell (desktop sidebar + mobile top/tab bar), group switching with localStorage persistence, active-route highlighting, and a mobile Add Expense FAB. All work is implemented in the frontend only with no API/database changes.

### Closure Facts

- **Total Tasks**: 33/33 complete (11 Slice 1 + 14 Slice 2 + 8 Slice 3)
- **Verification Status**: PASS — 0 blockers, 0 critical findings
- **Requirements Coverage**: 8/8 requirements, 16/16 scenarios
- **Test Results**: 350 tests pass (54 files), 0 failed, 0 skipped
- **Build**: npm run typecheck — 0 errors (3 packages)
- **Scope**: Frontend-only; no Prisma, API, or schema changes

---

## Artifacts Archived

### OpenSpec Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| `proposal.md` | `openspec/changes/archive/2026-08-18-persistent-navigation/proposal.md` | ✅ Archived |
| `design.md` | `openspec/changes/archive/2026-08-18-persistent-navigation/design.md` | ✅ Archived |
| `tasks.md` | `openspec/changes/archive/2026-08-18-persistent-navigation/tasks.md` | ✅ Archived |
| `specs/app-navigation-shell/spec.md` | `openspec/changes/archive/2026-08-18-persistent-navigation/specs/app-navigation-shell/spec.md` | ✅ Archived |
| `verify-report.md` | `openspec/changes/archive/2026-08-18-persistent-navigation/verify-report.md` | ✅ Archived |

### Main Specs Updated

| Domain | Action | File |
|--------|--------|------|
| app-navigation-shell | Created | `openspec/specs/app-navigation-shell/spec.md` |

**Spec Merge Notes**: The delta spec for `app-navigation-shell` was a full spec (no pre-existing main spec). It was copied mechanically to `openspec/specs/app-navigation-shell/spec.md` with verified byte identity (diff -r status: 0).

---

## Requirements & Scenarios Delivered

### Specification Compliance

| # | Requirement | Scenarios | Status |
|---|-------------|-----------|--------|
| 1 | Persistent Shell Chrome | Authenticated route on desktop; Zero-group user still sees chrome | ✅ PASS |
| 2 | Desktop Sidebar Collapse | User collapses sidebar | ✅ PASS |
| 3 | Active Route Highlighting | Parameterized route matches; No matching route | ✅ PASS |
| 4 | Bottom-Pinned Sidebar Controls | Collapsed rail still exposes controls | ✅ PASS |
| 5 | Group Switcher | Many groups; Single group; Zero groups | ✅ PASS |
| 6 | Active Group Persistence | Restore valid group on login; Stored group no longer valid; Sign-out clears active group | ✅ PASS |
| 7 | Conditional Savings Nav Item | No active group | ✅ PASS |
| 8 | Mobile Add Expense FAB | Dashboard on mobile; Desktop unaffected; Other pages never show the FAB | ✅ PASS |

**Total**: 8/8 requirements, 16/16 scenarios all compliant with dedicated, runtime-passing tests.

---

## Implementation Summary

### Slice 1 (Shell + Nav Items) — COMPLETE
- Created persistent shell (`AppShell.tsx`) branching on `useIsMobile()`
- Desktop: 232px expanded / 68px collapsed sidebar, persisted via `useSidebarCollapsed()`
- Mobile: sticky top bar + fixed bottom tab bar with `safe-area-inset-bottom`
- Single `NAV_ITEMS` table drives all surfaces; `NavItemLink` implements `aria-current="page"` via `matchPath` on parameterized routes
- Removed obsolete `Layout.tsx` and `HamburgerMenu.tsx`
- Updated `frontend/DESIGN.md` Navigation section

### Slice 2 (Group State + Switcher + D4 Persistence) — COMPLETE
- `GroupListProvider`: shared group list fetched once from `groupApi.list(signal?)`
- `ActiveGroupSync`: validates persisted group id against the fetched list, clears on sign-out
- `GroupSwitcher`: displays current group + member count, top 3 groups in API order, "Show More" → `/groups`, empty state for zero groups
- Active-group persistence (localStorage key: `calculoides.activeGroupId`): optimistic restore on login, validated after group list loads, cleared on sign-out or group removal
- `GroupsPage` refactored to use `useGroupList()` instead of local fetch
- Savings item gated on `groupId` presence, no flicker during route transitions

### Slice 3 (Mobile Add Expense FAB) — COMPLETE
- `AddExpenseFab`: pure presentational component (no state, dialog, or data logic)
- Mobile-only rendering on Dashboard and Expenses pages only
- Each page owns its own `isMobile` conditional and connects FAB to its pre-existing dialog state
- Desktop: header "Add Expense" button remains, no FAB
- Other pages (Transfers, Savings, Groups, Profile): no FAB on any breakpoint
- Expenses FAB respects `disabled={!summary}` during summary load

---

## Verification & Testing

### Build & Test Results (per verify-report)

| Check | Result |
|-------|--------|
| **TypeScript** | ✅ `npm run typecheck` — 0 errors, 3 packages (api, shared, frontend) |
| **Tests** | ✅ 350 tests pass, 0 failed, 0 skipped (`npm test`) |
| **Lint** | ✅ 0 new warnings (6 pre-existing `react-refresh/only-export-components` unchanged) |
| **Coverage** | Not gated; not available in this repo's config |

### Test Coverage Summary

- **Unit**: `matchNavItem`, `groupSwitchTarget`, `useSidebarCollapsed`, `ActiveGroupSync` rules
- **Component**: Shell surfaces (sidebar/top-bar/tab-bar item sets), `aria-current`, Savings gating, collapse persistence, switcher (0/1/5 groups), `AddExpenseFab` a11y
- **Integration**: Dashboard/Expenses FAB↔header swap per breakpoint, `GroupsPage` group list consumption

### Known Open Gaps (Non-blocking)

1. **`MobileTopBar`/`MobileTabBar` RTL coverage**: These shell components have zero test coverage rendering them with `useIsMobile() === true`. Slice 3 closed this gap for Dashboard/Expenses (via a different `useIsMobile` mock technique), but not for the shell components themselves. Carried forward from Slice 1/2, not a Slice 3 defect. Recommend closing before further mobile work stacks on top.

2. **`frontend/DESIGN.md` Navigation section stale reference** (WARNING, not CRITICAL): Line 309 still describes a "per-route group-selection flow" and references non-existent "Groups feature docs"; doesn't mention `GroupSwitcher` or `AddExpenseFab`. This became outdated after Slice 2's D4 (persistent, cross-route active-group mechanism). Recommend a doc fix before the next feature stacks on top. Does not block delivery; no test or runtime behavior depends on this prose.

---

## File Changes Across All Slices

### Created
- `frontend/src/app/ui/AppShell.tsx`
- `frontend/src/widgets/navigation/model/navItems.ts`
- `frontend/src/widgets/navigation/model/useSidebarCollapsed.ts`
- `frontend/src/widgets/navigation/ui/NavItemLink.tsx`
- `frontend/src/widgets/navigation/ui/SidebarNav.tsx`
- `frontend/src/widgets/navigation/ui/MobileTopBar.tsx`
- `frontend/src/widgets/navigation/ui/MobileTabBar.tsx`
- `frontend/src/widgets/navigation/ui/AccountMenu.tsx`
- `frontend/src/widgets/navigation/ui/GroupSwitcher.tsx`
- `frontend/src/app/providers/GroupListContext.tsx`
- `frontend/src/app/providers/ActiveGroupSync.tsx`
- `frontend/src/shared/ui/AddExpenseFab.tsx`

### Modified
- `frontend/src/app/providers/ActiveGroupContext.tsx` (persist/clear on user change; drop unmount cleanup; add `useActiveGroupSetter`)
- `frontend/src/app/App.tsx` (mount `GroupListProvider` and `ActiveGroupSync`)
- `frontend/src/entities/group/index.ts` (`groupApi.list` adds optional `signal?: AbortSignal`)
- `frontend/src/pages/groups/ui/GroupsPage.tsx` (consume `useGroupList()` instead of local fetch)
- `frontend/src/pages/dashboard/ui/DashboardPage.tsx` (hide header button on mobile, render FAB → existing dialog)
- `frontend/src/pages/expenses/ui/ExpensesPage.tsx` (hide header CTA on mobile, render FAB → existing dialog)
- `frontend/src/shared/ui/index.tsx` (export `AddExpenseFab`)
- `frontend/tests/widgets/navigation.test.tsx` (complete rewrite for shell surfaces)
- `frontend/tests/pages/dashboard.test.tsx` (extend with mobile FAB tests)
- `frontend/tests/pages/expenses-page.test.tsx` (extend with mobile FAB tests)
- `frontend/DESIGN.md` (rewrite Navigation section)

### Deleted
- `frontend/src/app/ui/Layout.tsx`
- `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx`

**Total Changed Lines** (across all 3 slices): ~1,100-1,200 total (breakdown: Slice 1 ~450-550, Slice 2 ~350-420, Slice 3 ~384 per final verify-report)

---

## Delivery & Review Metrics

### Slice Breakdown

| Slice | Goal | PR Target | Changed Lines | Budget | Status |
|-------|------|-----------|----------------|--------|--------|
| 1 | Shell + nav | stacked-to-main | ~450-550 | 800 | ✅ Under budget, low per-slice risk |
| 2 | Group state + switcher | stacked-to-main | ~350-420 | 800 | ✅ Under budget, low per-slice risk |
| 3 | Mobile FAB | stacked-to-main | 384 | 800 | ✅ Under budget, low per-slice risk (4.2x forecast but within PR budget) |

**Delivery Strategy**: auto-chain (stacked-to-main). Each slice targets main through stacked PRs; independently shippable.

---

## Final-State Authority & Reconciliation

### Source Ranking

Per the SDD archive skill's Final-State Authority hierarchy:

1. **Native review authority** (not applicable): no review receipt present for this change; receipt-driven development was explicitly disabled for this repo clone
2. **Persisted tasks artifact**: `tasks.md` shows 33/33 complete with all checkboxes marked `[x]`
3. **Explicit final-state facts in launch prompt**: none provided; dispatcher confirmed all_done status
4. **Verify-report and apply-progress snapshots** (lowest rank): Used for historical context; verify-report describes final state (all 3 slices included, whole-change verdict: PASS)

### Stale/Superseded Claims

- The WARNING about `frontend/DESIGN.md` being stale (per verify-report line 309) is recorded here for transparency, but does not block archive. The documentation drift is noted and recommended for post-archive correction by a follow-up doc fix task.

---

## Closure Checklist

- [x] All 33 implementation tasks marked complete in persisted `tasks.md`
- [x] Verification report: PASS (0 blockers, 0 critical findings)
- [x] 8/8 requirements, 16/16 scenarios verified compliant
- [x] 350 tests pass, 0 failed, 0 skipped
- [x] `npm run typecheck`: 0 errors
- [x] Delta specs merged into main specs (openspec/specs/app-navigation-shell/)
- [x] Change folder moved to archive with date prefix (openspec/changes/archive/2026-08-18-persistent-navigation/)
- [x] Mechanical copy/move verified with diff -r (empty output = byte identity confirmed)
- [x] Source directory confirmed removed from openspec/changes/
- [x] Archive report persisted (this file)

---

## Next Steps

**Recommended Follow-Up**:
1. **Post-archive doc fix**: Update `frontend/DESIGN.md` Navigation section (lines ~302-309) to mention `GroupSwitcher` and `AddExpenseFab`, fix/remove the stale "per-route group-selection flow" phrase, and remove dangling "Groups feature docs" reference.
2. **Optional coverage improvement**: Add RTL test coverage for `MobileTopBar` and `MobileTabBar` rendering with `useIsMobile() === true`.

**Archive Complete**: The `persistent-navigation` SDD change is now closed. All artifacts, design decisions, and test evidence are preserved in `openspec/changes/archive/2026-08-18-persistent-navigation/`. The main spec for `app-navigation-shell` is now the source of truth at `openspec/specs/app-navigation-shell/spec.md`.

---

## Metadata

- **Artifact Store**: openspec
- **Change Folder**: `openspec/changes/persistent-navigation/` → moved to `openspec/changes/archive/2026-08-18-persistent-navigation/`
- **Spec Copy**: `openspec/specs/app-navigation-shell/spec.md` (created)
- **Archive Date**: 2026-08-18 (ISO format)
- **Mechanical Operations**: All copy/move verified via diff -r with empty output (byte identity confirmed)
- **Task Completion**: 33/33 persisted checkboxes marked `[x]`
