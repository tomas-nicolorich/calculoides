# App Navigation Shell Specification

## Purpose

Persistent navigation chrome (desktop sidebar; mobile top bar + tab bar), shared group switching, active-route state, cross-login group persistence, and a mobile Add Expense quick-add on Dashboard/Expenses. Replaces the hamburger-dropdown navigation.

## Requirements

### Requirement: Persistent Shell Chrome
The system MUST render a persistent shell (desktop: collapsible sidebar; mobile ≤639px: sticky top bar + fixed tab bar) around every authenticated route, even with zero groups.

#### Scenario: Authenticated route on desktop
- GIVEN a user on desktop viewport
- WHEN any authenticated route renders
- THEN the sidebar shows brand, group switcher, nav items, and bottom-pinned controls

#### Scenario: Zero-group user still sees chrome
- GIVEN a user with zero groups
- WHEN any authenticated route renders
- THEN chrome still renders, the switcher shows an empty state, and group-gated nav items are hidden

### Requirement: Desktop Sidebar Collapse
The sidebar SHALL support collapsed (68px) and expanded (232px) states, persisted in `localStorage`.

#### Scenario: User collapses sidebar
- GIVEN the sidebar is expanded
- WHEN the user toggles collapse
- THEN it renders at 68px and the choice persists after reload

### Requirement: Active Route Highlighting
Every nav surface MUST highlight the item matching the current route, including parameterized patterns (e.g. `/dashboard/:groupId`), via pattern matching not exact-string comparison.

#### Scenario: Parameterized route matches
- GIVEN the current path is `/dashboard/abc123`
- WHEN the sidebar renders
- THEN the Dashboard item is marked `aria-current="page"`

#### Scenario: No matching route
- GIVEN the current path matches no nav pattern
- WHEN the shell renders
- THEN no nav item is marked active

### Requirement: Bottom-Pinned Sidebar Controls
The desktop sidebar MUST pin theme toggle, collapse control, and Sign Out at the bottom of the rail, in both collapsed and expanded states.

#### Scenario: Collapsed rail still exposes controls
- GIVEN the sidebar is collapsed
- WHEN the user views the bottom of the rail
- THEN theme toggle, collapse, and Sign Out are present and operable

### Requirement: Group Switcher
The switcher MUST show the current group + member count, list up to the first 3 groups in `groupApi.list()` order, and offer "Show More" → `/groups` when more than 3 groups exist.

#### Scenario: Many groups
- GIVEN a user belongs to 5 groups
- WHEN the switcher opens
- THEN the first 3 (API order) are listed plus "Show More" linking to `/groups`

#### Scenario: Single group
- GIVEN a user belongs to exactly 1 group
- WHEN the switcher opens
- THEN that group is listed with no "Show More" entry

#### Scenario: Zero groups
- GIVEN a user belongs to 0 groups
- WHEN the switcher opens
- THEN it shows an empty/placeholder state with a path to `/groups`

### Requirement: Active Group Persistence
The system MUST persist the last active group id under a dedicated, namespaced `localStorage` key, restore it on login, validate it against the freshly fetched group list, and clear it if invalid or on sign-out.

#### Scenario: Restore valid group on login
- GIVEN a stored group id is present in the fetched group list
- WHEN the user logs in
- THEN that group becomes active without visiting `/groups`

#### Scenario: Stored group no longer valid
- GIVEN a stored group id is absent from the fetched group list (e.g. user left the group)
- WHEN the group list loads
- THEN the stored id is cleared and no group auto-selects

#### Scenario: Sign-out clears active group
- GIVEN a user is signed in with an active group
- WHEN the user signs out
- THEN the persisted active-group key is cleared

### Requirement: Conditional Savings Nav Item
The Savings Goals nav entry MUST be visible only while a group is active (`groupId` present) and MUST NOT flicker during route transitions.

#### Scenario: No active group
- GIVEN no group is currently active
- WHEN the shell renders
- THEN Savings Goals is not shown in any nav surface

### Requirement: Mobile Add Expense FAB
On mobile viewports only, a floating Add Expense button MUST render on Dashboard and Expenses only, replacing each page's header "Add Expense" button, and MUST open that page's own existing add-expense dialog/refresh flow rather than a new dialog.

#### Scenario: Dashboard on mobile
- GIVEN a user views Dashboard on mobile
- WHEN the page renders
- THEN the header button is hidden, the FAB shows, and tapping it opens Dashboard's existing dialog

#### Scenario: Desktop unaffected
- GIVEN a user views Dashboard or Expenses on desktop
- WHEN the page renders
- THEN the header button remains and no FAB renders

#### Scenario: Other pages never show the FAB
- GIVEN a user views Transfers, Savings, Groups, or Profile on mobile
- WHEN the page renders
- THEN no Add Expense FAB is shown
