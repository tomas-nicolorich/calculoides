# Groups View Specification

## Purpose

Full-parity groups list at `app/(app)/groups/**`, replacing the current lean
port (plain Tailwind, no `app/_ui` atoms, per `GroupsClient.tsx`'s own
comment) with `main`'s list/create/select behavior using the ported design
system.

## Requirements

### Requirement: Group List Renders Name, Role, and Member Count Using Design-System Primitives

The groups list MUST render each group's name, the requesting user's role in
it, and its member count, using `app/_ui` primitives (e.g. `Card`) rather
than the current plain-Tailwind list items.

#### Scenario: Populated list shows role and member count
- GIVEN a user belongs to a group as `"member"` with 3 total members
- WHEN `/groups` renders
- THEN that group's card shows its name, `"member"`, and `"3 members"`, rendered via ported `app/_ui` components

#### Scenario: Empty state for a user with no groups
- GIVEN a user belongs to zero groups
- WHEN `/groups` renders
- THEN an empty state renders instead of an empty list, with a path to create a group

### Requirement: Group Creation Uses the Ported Form Component

Creating a group MUST go through a dedicated `CreateGroupForm` component
using ported `app/_ui` primitives (`Input`, `Button`) and the existing
`lib/actions/group.ts` `create` Server Action, replacing the current
inline plain-HTML form.

#### Scenario: Successful creation adds the group to the list
- GIVEN the create-group form is submitted with a valid name
- WHEN `create` resolves successfully
- THEN the new group appears in the list without a full page reload

#### Scenario: Server-side validation error surfaces inline
- GIVEN the create-group form is submitted with an invalid name
- WHEN `create` returns `{ ok: false, error }`
- THEN that error renders inline near the form and no group is added

### Requirement: Selecting a Group Navigates to Its Dashboard

Each group card MUST link to `/dashboard/[groupId]` for that group, using
`next/link` for client-side navigation.

#### Scenario: Selecting a group navigates to its dashboard
- GIVEN a rendered group card for group `abc123`
- WHEN the user activates it
- THEN navigation goes to `/dashboard/abc123`
