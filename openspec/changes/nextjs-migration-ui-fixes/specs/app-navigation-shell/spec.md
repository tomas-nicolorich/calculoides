# App Navigation Shell Specification

## Purpose

Persistent chrome (desktop sidebar; mobile top bar + tab bar) around every
`(app)` route, group switching derived from the URL, an account menu with
sign-out, and the root-route entry redirect. Supersedes the unlanded
`persistent-navigation` delta — that implementation was React-Router-era
(`<Link to>`, `useLocation`, `ActiveGroupContext`) and died with `frontend/`.
This spec targets Next.js Server/Client Component boundaries instead
(design.md ADR-3 through ADR-6).

## Requirements

### Requirement: Persistent Shell Renders via CSS-First Responsive Branching

The system MUST render both the desktop sidebar tree and the mobile
top-bar/tab-bar tree on every server render, gated by Tailwind
`hidden md:flex` / `md:hidden` classes, rather than a client-side
`useIsMobile()` branch. This avoids an SSR flash where the first frame
renders the wrong tree before hydration (ADR-3).

#### Scenario: Desktop viewport shows the sidebar tree
- GIVEN a user on a desktop viewport requests any `(app)` route
- WHEN the page renders
- THEN the sidebar (brand, group switcher, nav items, account menu) is visible and the mobile top/tab bars are `display:none`

#### Scenario: Mobile viewport shows the top/tab bar tree
- GIVEN a user on a mobile viewport requests any `(app)` route
- WHEN the page renders, before any client JS executes
- THEN the mobile top bar and tab bar are visible and the desktop sidebar is `display:none` — no first-frame mismatch

### Requirement: `children` Reaches the Shell as a Prop, Never an Import

`app/(app)/layout.tsx` MUST stay a Server Component and pass `children` as a
prop into the client `AppShell`. `AppShell` MUST NOT import page content
directly, so every route below it keeps server-rendering independently of
the shell's client bundle (ADR-4).

#### Scenario: Page content server-renders independently of the shell
- GIVEN `AppShell` is a `"use client"` component
- WHEN `app/(app)/dashboard/[groupId]/page.tsx` renders
- THEN it server-renders and streams as a prop into `AppShell`, never entering `AppShell`'s client bundle

### Requirement: Active Group Is Derived From the URL, Not a Context

The group switcher and nav item hrefs MUST derive the active group from
`useParams<{ groupId?: string }>()`, falling back to `usePathname()`. Because
`/members` has no `[groupId]` route segment and is instead scoped by a
`?groupId=` query string, nav item hrefs MUST be built through a function of
`groupId`, not string concatenation (ADR-5).

#### Scenario: Dashboard route derives groupId from the path segment
- GIVEN the current path is `/dashboard/abc123`
- WHEN the shell renders
- THEN the group switcher and nav highlighting resolve `groupId` as `"abc123"` from the route param

#### Scenario: Members nav item builds a query-string href
- GIVEN the active group is `abc123`
- WHEN the nav item for Members computes its href
- THEN it produces `/members?groupId=abc123`, not `/members/abc123`

#### Scenario: No active group hides group-scoped nav items
- GIVEN no `groupId` is resolvable from params or path
- WHEN the shell renders
- THEN nav items whose `requiresGroup` is true are not shown

### Requirement: Account Menu Exposes Identity and Sign-Out

The account menu MUST render the signed-in user's name and email, received
as props from `app/(app)/layout.tsx`'s existing `getUser()` +
`UserService.getUser()` call, and MUST offer sign-out via a new Server
Action (ADR-6).

#### Scenario: Signing out clears the session and redirects
- GIVEN a signed-in user opens the account menu
- WHEN they select "Sign out"
- THEN `signOut()` (`lib/actions/session.ts`, `"use server"`) calls `supabase.auth.signOut()` and redirects to `/login`

#### Scenario: Sign-out invalidates the server session, not just the browser store
- GIVEN sign-out completed
- WHEN a subsequent request targets a protected route
- THEN it is rejected by `getUser()` and redirected to `/login` — sign-out is not merely a client-side `auth.signOut()` that leaves the httpOnly cookie valid

### Requirement: Group Switcher Lists the User's Real Groups

`app/(app)/layout.tsx` MUST populate the switcher from
`GroupService.getGroupsForUser(userId)` rather than an empty-array stub.

#### Scenario: Switcher lists the signed-in user's groups
- GIVEN a user belongs to 2 groups
- WHEN the shell renders
- THEN the group switcher lists both groups by name, sourced from `getGroupsForUser`

### Requirement: Root Route Redirects Based on Session State

`app/page.tsx` MUST be a Server Component that checks the session and
redirects: signed-in users to `/groups`, signed-out users to `/login`. It
MUST NOT render the current placeholder shell-online message.

#### Scenario: Signed-in user visits `/`
- GIVEN a user has a valid, verified Supabase session
- WHEN they request `/`
- THEN they are redirected to `/groups`

#### Scenario: Signed-out user visits `/`
- GIVEN a request has no valid session
- WHEN it targets `/`
- THEN it is redirected to `/login`
