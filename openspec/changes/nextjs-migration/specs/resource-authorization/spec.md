# Resource Authorization Specification

## Purpose

Defines the explicit, transport-independent ownership/membership checks every Server Action or Route Handler MUST enforce for group, member, budget (expense/transfer/category/savings), and user resources. These checks are the sole enforcement layer for authorization in this system: they MUST hold whether or not Supabase RLS is also active on the underlying tables, and MUST NOT be weakened, skipped, or delegated to RLS during or after this migration. Ported verbatim from `api/_src/handlers/*`, each check MUST carry a passing test before its source handler is deleted.

## Requirements

### Requirement: Explicit Application-Layer Checks Are Authoritative Regardless of RLS

The system MUST perform an explicit ownership/membership check in the Server Action, Route Handler, or a service function it calls before returning or mutating any group-scoped resource, independent of whatever RLS policy exists on the underlying table.

#### Scenario: RLS active but explicit check absent
- GIVEN a table has an RLS policy that would deny the row
- WHEN a Server Action queries it via Prisma without performing its own membership check
- THEN the request MUST still be treated as unauthorized, because Prisma's direct connection does not evaluate RLS

#### Scenario: RLS inactive or misconfigured
- GIVEN RLS is disabled or misconfigured for a table
- WHEN a request targets a resource the caller does not own or belong to
- THEN the explicit application-layer check MUST still deny it with 403

### Requirement: Group Access Requires Membership or Ownership

The system MUST return a group's detail, member list, or group-scoped data only to a caller who is the group's owner or an existing member.

#### Scenario: Owner reads group
- GIVEN a user owns group G
- WHEN they request group G's detail
- THEN the group is returned

#### Scenario: Non-member denied
- GIVEN a user who is neither owner nor member of group G
- WHEN they request group G's members or detail
- THEN the request is denied with 403

### Requirement: Member Income Update Requires Membership

The system MUST allow updating a group member's income only to a caller who is that group's owner or a member of the same group.

#### Scenario: Fellow member updates income
- GIVEN a member of group G
- WHEN they update another member's income within G
- THEN the update succeeds

#### Scenario: Outsider denied
- GIVEN a user with no membership in group G
- WHEN they attempt to update a member's income in G
- THEN the request is denied

### Requirement: Member Removal Authorization Is Derived From the Target Member's Own Group

The system MUST resolve the group used for the removal-authorization check from the target member record's own `groupId`, never from a caller-supplied `groupId`, and MUST allow removal only to that group's owner or the member removing themselves.

#### Scenario: Owner removes a member of their own group
- GIVEN owner O of group G and member M belonging to G
- WHEN O removes M
- THEN M is removed from G

#### Scenario: Cross-group id substitution is rejected
- GIVEN O owns group A and M is a member of group B
- WHEN O submits a caller-supplied `groupId=A` alongside M's memberId
- THEN the system authorizes against M's actual group (B), not A, and denies O's request since O is not B's owner

#### Scenario: Self-removal allowed without ownership
- GIVEN a non-owner member of group G
- WHEN they remove themselves
- THEN the removal succeeds

### Requirement: Group-Scoped Budget Resources Require Membership

The system MUST allow reading or writing expenses, transfers, categories, and savings goals only to a caller who is a member or owner of the resource's own group, resolved from the resource's own `groupId`, never from an unvalidated caller-supplied value.

#### Scenario: Member creates an expense in their group
- GIVEN a member of group G
- WHEN they create an expense in G
- THEN the expense is created

#### Scenario: Non-member denied on transfer/savings/expense access
- GIVEN a user with no membership in group G
- WHEN they attempt to create or read an expense, transfer, savings goal, or category under G
- THEN the request is denied with 403

### Requirement: Category Deletion Requires Ownership

The system MUST allow deleting a budget category only to the owner of the category's own group.

#### Scenario: Owner deletes category
- GIVEN the owner of group G
- WHEN they delete a category belonging to G
- THEN the category is deleted

#### Scenario: Member without ownership denied
- GIVEN a non-owner member of group G
- WHEN they attempt to delete a category belonging to G
- THEN the request is denied with 403

### Requirement: User Profile Access Is Self-Scoped

The system MUST resolve "own profile" reads and writes (`me`, upsert) from the authenticated session's user id, never from a client-supplied id.

#### Scenario: User reads own profile
- GIVEN an authenticated user
- WHEN they request their profile
- THEN their own row is returned, keyed by their session id

#### Scenario: Client-supplied id ignored
- GIVEN an authenticated user submits a payload containing another user's id
- WHEN the profile is read or upserted
- THEN the system uses the session's own id, never the supplied id, so no other user's row is ever touched
