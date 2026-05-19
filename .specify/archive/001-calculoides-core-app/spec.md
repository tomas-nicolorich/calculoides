# Feature Specification: Calculoides Core App

**Feature Branch**: `001-calculoides-core-app`  
**Created**: 2026-05-12  
**Status**: Verified  
**Input**: User description: "Build Calculoides - a shared expense and budget management application for household groups. **Groups** A user can create a group and invite other users to join via email invitation or already registered users. A user can belong to multiple groups. Each group has a name and a list of members. **User income within a group** Each member of a group can set their monthly income within that group context. The application uses these income values to calculate each member's proportional share as a percentage of the group's total combined income. For example, if member A earns €2000 and member B earns €1000, A's share is 67% (66.67% rounded) and B's is 33% (33.33% rounded) **Budget categories** Group members can create budget categories (e.g. Rent, Utilities, Groceries). Each category has a total monthly budget amount, name, icon (emoji) and an optional subset of members. The app calculates how much each member owes for that category based on their income percentage. Members can see their individual share, the other member's shares and the group total for each category. If a subset of members is selected, the app calculates the percentages based on the selected members. **Budget transfers** Each member has the ability to \"transfer\" an amount of budget from a selected category to another user. The app should calculate accordingly by resting from the member transfering and adding to the member receiving. The owner should have the ability to transfer from and to all members. **Expense tracking** Members can log individual expense entries against a budget category. Each entry has a description, amount, date and the member who paid. The application tracks how much of each category's monthly budget has been spent and shows the remaining balance. The owner may have the ability to \"archive\" expenses for a specified date range (default the whole past month) to track past expenses. **Savings goals** Members can create a savings goal with a name, starting balance, a target balance, and a target date. The application calculates how much each member needs to save per month to reach the target by the target date, proportional to their income percentage. A member can override each user's monthly contribution amount; when this happens, the application recalculates the projected completion date based on the new contributions. The goal shows current progress, projected date, and each member's monthly contribution. **Summary view** The application provides a dashboard that shows, an Income Overview with each member's income and percentage, a Remaining Balance section showing how much each user is left with after \"taking away\" the sum of all categories against their income, a list of the last 5 expenses with the possibility to view all in another page, a Budget Transfers section and the Budget Categories section showing for each category its icon, name, total amount, each member's share and the remaining after taking into account the expenses. Also at the bottom of the Budget Categories section the app should show the total monthly budget of the group and of each member. **Target users** Initially a private household group (5 people). The application must be designed to support multiple independent groups with no data overlap, as it will be opened to the public in the future."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Group Setup & Income Distribution (Priority: P1)

As a household member, I want to create a group and invite my housemates so that we can share our expenses proportionally based on our individual incomes.

**Why this priority**: Fundamental to the entire application logic. Proportional distribution is the core differentiator.

**Independent Test**: Can be tested by creating a group with two members, setting their incomes (e.g., 2000 and 1000), and verifying the calculated shares (67% and 33%).

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they create a group named "My Home", **Then** they should be the owner and only member of the group.
2. **Given** a group owner, **When** they invite a user via email, **Then** the invited user should receive an invitation and be able to join the group. **(Clarification: Invitations MUST be dispatched via Resend and include a unique, secure join link pointing to `/invite/:token`)**
3. **Given** a group member, **When** they update their income in the group context, **Then** the percentage shares for all members in that group must be recalculated immediately.

---

### User Story 2 - Budgeting & Spending (Priority: P1)

As a group member, I want to define budget categories (like Rent or Groceries) and log expenses against them so that we can track how much of our monthly budget is remaining.

**Why this priority**: This is the primary daily utility of the app. Without expense tracking, the budget is just a theoretical plan.

**Independent Test**: Create a category "Groceries" for €400, log an expense of €50, and verify the remaining balance for that member goes down by €50.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "Groceries" category with a €400 budget and a "Grocery basket" emoji, **Then** all members should see their individual share of that €400 based on their income.
2. **Given** a "Groceries" category, **When** a member logs a €50 expense for "Weekly shopping", **Then** the remaining balance for the that member on that category should go down by €50.
3. **Given** a category with a restricted subset of members, **When** income percentages are calculated, **Then** only the income of those selected members should be used to determine the shares.

---

### User Story 3 - Savings Goals & Proportional Contributions (Priority: P2)

As a group member, I want to set a savings goal for a future purchase (like a new sofa) so that the app calculates how much each person needs to save monthly to reach the target on time.

**Why this priority**: Encourages long-term financial planning within the group.

**Independent Test**: Set a goal for €1200 with a target date 6 months away, verify members are asked to save a total of €200/month divided by their income share.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "New Sofa" goal for €1200 with a 6-month deadline and an optional €200 starting amount, **Then** the app should show the remaining €1000 divided by members' monthly contribution (e.g., if A has 60% share, they save €100/month).
2. **Given** an active savings goal, **When** a member overrides their contribution amount, **Then** the app must recalculate and display the new projected completion date.

**Bugfix**: 2026-06-01 — [BUG-033] Added requirement for starting amount and its modification for savings goals.

---

### User Story 4 - Budget Transfers & Archiving (Priority: P2)

As a group member, I want to transfer my budget share to another member (e.g., I pay for electricity, they pay for internet), and as an owner, I want to manage past month's data.

**Why this priority**: Adds flexibility for real-world scenarios where "who pays what" doesn't always align perfectly with the budget.

**Independent Test**: Transfer €50 from User A to User B for the "Utilities" category and verify their respective remaining balances update.

**Acceptance Scenarios**:

1. **Given** two members A and B, **When** A transfers €30 of their budget share to B, **Then** A's remaining personal balance decreases by €30 and B's increases by €30.
2. **Given** a group owner, **When** they select a date range (e.g., "last month") to archive expenses, **Then** those expenses should be moved to a historical record and cleared from the active dashboard.

---

### User Story 5 - Authentication & Navigation (Priority: P1)

As a user, I want to securely log in to the application and navigate between the dashboard, group settings, and my profile so that I can manage my finances privately and efficiently.

**Why this priority**: Required for security and basic application usability.

**Independent Test**: Navigate to the root URL; if not logged in, should be redirected to `/login`. After successful login, should reach the dashboard.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they attempt to access the dashboard, **Then** they should be redirected to the Login page.
2. **Given** a new user, **When** they fill out the Signup form with valid credentials, **Then** a new account should be created and they should be automatically logged in.
3. **Given** an authenticated user on the Dashboard, **When** they click a navigation link (e.g., "Settings"), **Then** the application should render the corresponding page without a full page reload.
4. **Given** a development environment, **When** the app is started, **Then** the Supabase client MUST be correctly initialized using environment variables defined in the project root.
5. **Given** a development environment with the frontend running, **When** a request is made to `/api/groups`, **Then** the Vite proxy MUST correctly forward the request to the backend server instead of falling back to `index.html`.

---

### Edge Cases

- **Zero Income**: What happens if a group member has zero income? (Assumption: Their percentage share becomes 0%, and they owe nothing unless a custom contribution is set).
- **Overspending**: How does the system handle expenses that exceed the category budget? (Assumption: The remaining balance becomes negative and is highlighted).
- **No Members in Category**: What happens if a category is created with an empty subset of members? (Requirement says "optional subset", default is all members).
- **Rounding Errors**: How are fractions of a cent handled in proportional shares? (Assumption: Round to 2 decimal places, with the highest income member absorbing any 0.01 discrepancy to ensure the total is 100%).

## Clarifications

### Session 2026-05-12
- Q: Should budget transfers be category-specific or general? → A: Category-Specific: Transfers move budget "quota" within the same category.
- Q: What is the state of archived expenses? → A: Immutable History: Archived records are moved to a historical view and become read-only.
- Q: What happens if an owner leaves without transferring ownership? → A: Automatic Succession: Ownership transfers to the member with the longest tenure.
- Q: Can non-owners manage group members? → A: Owner-Only: Only the group owner can invite or remove members.
- Q: How to handle savings goal contribution overrides? → A: Dynamic Deadline: Recalculate completion date and show difference between original and projected.
- Q: How should mid-month income updates be handled? → A: Retroactive: Changes apply to all expenses and budgets for the entire current calendar month.
- Q: Should historical records maintain income percentage history? → A: Detailed History: Archived records MUST preserve individual expense entries while also displaying the final total monthly settlement amount per user. Underlying share logic is preserved for that specific archive period.
- Q: How do budget categories reset? → A: Manual Archive Reset: Categories do not automatically reset based on the calendar; the spent balance resets to 0 only when the group owner performs an archive action.
- Q: Are budget categories private if they have a subset of members? → A: All Visible: All group members can see all categories and their statuses, even if they are not part of a specific category's member subset.
- Q: How are deletions handled? → A: Permanent: Deletions of expenses and budget categories are immediate and irreversible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support multiple independent groups with strictly isolated data.
- **FR-002**: System MUST calculate income percentage shares based on the total combined income of all members (or selected subset) in a group. Mid-month income updates MUST be applied retroactively to all expenses and budgets for the entire current calendar month, excluding already archived records.
- **FR-003**: System MUST allow members to log expenses with description, amount, date, and payer. Deletions of expenses MUST be permanent and irreversible. When logging an expense, the system MUST resolve the authenticated `User ID` to the specific `GroupMember ID` for the group containing the target category (BUG-015). **The implementation MUST ensure that all non-nullable fields are correctly populated and that ID types are consistent between the Prisma schema and database migrations to prevent null constraint violations (BUG-018).**
- **FR-004**: System MUST display a dashboard showing income overview, remaining balance per user, recent expenses, transfers, and category status. All categories MUST be visible to all members of the group. Deletions of budget categories MUST be permanent and irreversible.
- **FR-005**: System MUST allow budget transfers between members within a group, restricted to moving quota within the same budget category.
- **FR-006**: System MUST calculate monthly savings contributions based on target amount, target date, and income percentages. Any group member MUST be able to override their own or any other member's contribution. If contributions are overridden, the system MUST recalculate the projected date and display the variance from the original target date. **System MUST provide explicit visual feedback (e.g., loading spinners, success toasts, or error messages) for all contribution override actions to ensure terminal state resolution for the user (BUG-026).**
- **FR-007**: System MUST allow group owners to archive expenses for specific date ranges; archived records MUST be moved to an immutable historical view. This view MUST preserve individual expense records while also displaying the final total monthly settlement amount per user. Upon archiving, the spent balance of the affected budget categories MUST reset to 0.
- **FR-008**: System MUST support a single-owner model per group. The creator is the initial owner, and ownership can be transferred to any other active group member. Owners have exclusive permissions to invite/remove members, transfer budgets for all members, modify the monthly income of any group member, and archive expenses. If an owner leaves without transferring, ownership MUST automatically transfer to the member with the longest tenure.
- **FR-009**: System MUST implement a routing architecture with protected routes for authenticated users and public routes for login/signup.
- **FR-010**: System MUST provide a user interface for authentication (Login and Signup) integrated with the backend session service. It MUST correctly handle environment-specific configuration for the Supabase client.
- **FR-011**: System MUST maintain a consistent communication contract between the frontend and backend API. In development, the frontend MUST use a robust proxy configuration to route `/api/*` requests to the local backend server (defaulting to `http://localhost:3001`) to avoid SPA routing fallbacks. All backend development servers (e.g., Vercel CLI, custom Express server) MUST be configured to listen on this specific port to ensure proxy connectivity.
- **FR-012**: System MUST ensure that the custom API client dynamically retrieves the current authentication session from the Supabase client for every request. Authentication tokens MUST NOT be stored in `localStorage` to maintain security and comply with session-only auth constraints.
- **FR-013**: System MUST support an optional override for SSL certificate validation in development environments to allow communication with local Supabase instances using self-signed certificates.
- **FR-014**: System MUST ensure that initial session verification and data hydration reach a terminal state (success, error, or redirect) within a reasonable timeout (e.g., 5s) to avoid persistent loading states.
- **FR-015**: System MUST ensure that users are consistently displayed by their `name` property across all views in the UI. Identifiers such as ID or email MUST NOT be used for user display purposes.
- **FR-016**: System MUST display a detailed breakdown for each budget category showing each member's proportional share (percentage and currency amount), their current spent amount, and their remaining balance.
- **FR-017**: System MUST provide a way for users to view a list of all individual expense entries for any given category or the entire group (BUG-025).
- **FR-018**: System MUST apply a consistent percentage rounding strategy (2 decimal places with Remainder Absorption by the highest earner) across all views, including Budget categories, Savings goals, and Dashboard Overview (BUG-027).

**Bugfix**: 2026-05-13 — [BUG-001] Added missing requirements for Routing and Frontend Auth UI.
**Bugfix**: 2026-05-14 — [BUG-002] Added requirement for environment configuration for Supabase initialization.
**Bugfix**: 2026-05-14 — [BUG-003] Added FR-011 to define API communication contract and proxy requirements.
**Bugfix**: 2026-05-14 — [BUG-004] Updated FR-011 to mandate port synchronization for backend dev servers.
**Bugfix**: 2026-05-14 — [BUG-005] Added FR-012 to define token propagation strategy for the API client.
**Bugfix**: 2026-05-14 — [BUG-006] Added FR-013 to handle SSL verification overrides for local development.
**Bugfix**: 2026-05-14 — [BUG-007] Added requirement for terminal state handling in auth initialization and success criteria for loading states.
**Bugfix**: 2026-05-14 — [BUG-008] Clarified Prisma relation naming convention to use singular names for to-one relations to ensure consistency between data-model.md and implementation.
**Bugfix**: 2026-05-14 — [BUG-009] Clarified category visibility requirements to ensure all members see all group categories by default regardless of explicit membership.
**Bugfix**: 2026-05-14 — [BUG-010] Added SC-006 to ensure savings goal visibility after creation.
**Bugfix**: 2026-05-14 — [BUG-011] Clarified that all group members MUST be visible to each other within the group context and ownership status MUST be correctly propagated to the frontend for admin access.
**Bugfix**: 2026-05-15 — [BUG-012] Added SC-007 to mandate correct coercion of ISO date strings in API requests.
**Bugfix**: 2026-05-15 — [BUG-013] Updated FR-008 to grant group owners the permission to modify monthly incomes for any member in their group.
**Bugfix**: 2026-05-15 — [BUG-014] Added FR-015 to enforce consistent user display across the UI using the `name` property exclusively.
**Bugfix**: 2026-05-17 — [BUG-017] Clarified that category creation MUST support selecting an optional subset of members, requiring explicit join logic for CategoryMember.
**Bugfix**: 2026-05-19 — [BUG-019] Added FR-016 to mandate detailed per-member breakdown in category views.
**Bugfix**: 2026-05-20 — [BUG-020] Clarified requirement for interactive savings goal contribution overrides and variance display in FR-006.
**Bugfix**: 2026-05-25 — [BUG-025] Added FR-017 to mandate visible expense history.
**Bugfix**: 2026-05-28 — [BUG-029] Clarified that category subset shares MUST be recalculated based only on subset members' incomes.
**Bugfix**: 2026-05-31 — [BUG-032] Re-verified requirement for immediate UI reactivity after savings goal contribution overrides (SC-011).

### Key Entities

- **User**: Individual account holder.
- **Group**: Container for shared budgeting, with a name and a collection of Members.
- **Member**: A User within the context of a specific Group, having a specific monthly income, an ownership status, and a `joinedAt` timestamp (used for tenure logic).
- **Budget Quota**: The specific portion of a category's budget allocated to a member based on their income share or transfer adjustments.
- **Expense**: A specific transaction tied to a Budget Category, recorded by a Member.
- **Transfer**: A budget adjustment between two Members.
- **Savings Goal**: A target amount and date with calculated monthly contributions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a group and invite 4 housemates in under 3 minutes.
- **SC-002**: Proportional shares are recalculated and updated on the dashboard within 500ms of an income or category change.
- **SC-003**: 100% of expense entries are correctly reflected in the "Remaining Balance" sections of the dashboard and ARE VISIBLE in the history view (BUG-025).
- **SC-004**: System maintains data isolation such that no user can see data from a group they do not belong to.
- **SC-005**: The application NEVER remains in a persistent loading state for more than 5 seconds without user feedback or an automated fallback.
- **SC-006**: Savings goals are immediately visible on the dashboard/savings tab after successful creation.
- **SC-007**: API endpoints MUST correctly handle ISO 8601 date strings in JSON request bodies by coercing them into JavaScript Date objects during validation.
- **SC-008**: Expense creation correctly resolves the payer's GroupMember identity from their session (BUG-015).
- **SC-009**: Savings goal contribution overrides MUST validate that both the target goal and member exist before performing the update to prevent foreign key violations (BUG-022).
- **SC-010**: Users can view a chronological list of recent expenses on the dashboard and a full history within each category view (BUG-025).
- **SC-011**: Savings goal projections and contribution values MUST be updated in the UI within 500ms of a successful contribution override without requiring a page reload (BUG-031).
- SC-012**: Savings goals MUST support an optional `startingAmount` (default 0) that is subtracted from the `targetAmount` before calculating monthly contributions. (BUG-033)
- **SC-013**: System MUST support updating existing savings goal metadata (name, targetAmount, targetDate, startingAmount) via the UI and API client (BUG-037).
- **SC-014**: The application MUST maintain zero lint errors across both `api/` and `frontend/` directories, with strict enforcement against the use of `any` in both implementation and test code (BUG-038).
- **SC-015**: Savings goal updates MUST correctly resolve the loading state in all terminal scenarios (success, error, or settlement) to ensure the loading spinner is dismissed without a page reload (BUG-039).

## Assumptions

- **Currency**: The system defaults to a single currency per group (e.g., Euro as in the example).
- **Manual Reset**: Budgets do not auto-reset; they rely on the owner's archive action to clear spent balances.
- **Invite Logic**: Invitations are sent via email using Resend, and the system handles the delivery and acceptance flow via secure, single-use tokens.
- **Device**: The initial implementation is a responsive web application suitable for both desktop and mobile browsers with a mobile-first design.
- **Security**: Basic authentication (email/password) is required for all users.

---

**Bugfix**: 2026-05-15 — [BUG-015] Clarified Payer-to-GroupMember resolution requirements for expense logging.
**Bugfix**: 2026-05-15 — [BUG-016] Clarified that Invitation status uses a custom InvitationStatus enum instead of a generic string.
**Bugfix**: 2026-05-15 — [BUG-018] Mandated ID type consistency and population of non-nullable fields for expense creation.
**Bugfix**: 2026-05-15 — [BUG-021] Clarified email delivery requirements using Resend and secure join links.
**Bugfix**: 2026-05-15 — [BUG-022] Added requirement for ID validation and graceful error handling in savings goal contribution overrides.
**Bugfix**: 2026-05-15 — [BUG-023] Clarified requirement for consistent name display in savings goals feature (US3) in compliance with FR-015.
**Bugfix**: 2026-05-15 — [BUG-024] Clarified requirement to ensure primary key UUID defaults and remove incorrect defaults from foreign keys in prisma/schema.prisma to resolve persistent null constraint violations.
**Bugfix**: 2026-05-26 — [BUG-026] Added requirement for explicit visual feedback and terminal resolution in savings goal contribution overrides.
**Bugfix**: 2026-05-27 — [BUG-027] Mandated consistent percentage rounding strategy across all views including Dashboard and Categories.
**Bugfix**: 2026-05-28 — [BUG-028] Clarified that Remainder Absorption MUST be applied to all proportional financial calculations, including categories and savings goals.
**Bugfix**: 2026-05-29 — [BUG-030] Patched missing CategoryExpenseList import in DashboardPage.tsx.
**Bugfix**: 2026-05-30 — [BUG-031] Added SC-011 to mandate immediate UI updates after savings goal contribution overrides.
**Bugfix**: 2026-06-02 — [BUG-034] Re-verified requirement for immediate UI reactivity after savings goal contribution overrides (SC-011).
**Bugfix**: 2026-06-03 — [BUG-035] Clarified requirement for robust date calculation in savings projections.
**Bugfix**: 2026-06-03 — [BUG-036] Clarified requirement for explicit inclusion of startingAmount (initialAmount) even if 0, and non-null projections.
**Bugfix**: 2026-06-06 — [BUG-039] Added SC-015 to mandate terminal loading state resolution for savings goals.

