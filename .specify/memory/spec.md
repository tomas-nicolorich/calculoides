# Project Specification: Calculoides

**Status**: Active
**Initial Feature**: `001-calculoides-core-app`
**Revision**: 2026-06-06 | Initial archival of Calculoides Core App
**Revision**: 2026-06-07 | Archival of Vercel Serverless Function Reduction feature [Source: specs/002-reduce-vercel-functions]

## User Scenarios & Testing

### User Story 1 - Group Setup & Income Distribution (Priority: P1) [Source: specs/001-calculoides-core-app]

As a household member, I want to create a group and invite my housemates so that we can share our expenses proportionally based on our individual incomes.

**Why this priority**: Fundamental to the entire application logic. Proportional distribution is the core differentiator.

**Independent Test**: Can be tested by creating a group with two members, setting their incomes (e.g., 2000 and 1000), and verifying the calculated shares (67% and 33%).

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they create a group named "My Home", **Then** they should be the owner and only member of the group.
2. **Given** a group owner, **When** they invite a user via email, **Then** the invited user should receive an invitation and be able to join the group. (Invitations MUST be dispatched via Resend and include a unique, secure join link pointing to `/invite/:token`)
3. **Given** a group member, **When** they update their income in the group context, **Then** the percentage shares for all members in that group must be recalculated immediately.

---

### User Story 2 - Budgeting & Spending (Priority: P1) [Source: specs/001-calculoides-core-app]

As a group member, I want to define budget categories (like Rent or Groceries) and log expenses against them so that we can track how much of our monthly budget is remaining.

**Why this priority**: This is the primary daily utility of the app. Without expense tracking, the budget is just a theoretical plan.

**Independent Test**: Create a category "Groceries" for €400, log an expense of €50, and verify the remaining balance for that member goes down by €50.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "Groceries" category with a €400 budget and a "Grocery basket" emoji, **Then** all members should see their individual share of that €400 based on their income.
2. **Given** a "Groceries" category, **When** a member logs a €50 expense for "Weekly shopping", **Then** the remaining balance for the that member on that category should go down by €50.
3. **Given** a category with a restricted subset of members, **When** income percentages are calculated, **Then** only the income of those selected members should be used to determine the shares.

---

### User Story 3 - Savings Goals & Proportional Contributions (Priority: P2) [Source: specs/001-calculoides-core-app]

As a group member, I want to set a savings goal for a future purchase (like a new sofa) so that the app calculates how much each person needs to save monthly to reach the target on time.

**Why this priority**: Encourages long-term financial planning within the group.

**Independent Test**: Set a goal for €1200 with a target date 6 months away, verify members are asked to save a total of €200/month divided by their income share.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "New Sofa" goal for €1200 with a 6-month deadline and an optional €200 starting amount, **Then** the app should show the remaining €1000 divided by members' monthly contribution (e.g., if A has 60% share, they save €100/month).
2. **Given** an active savings goal, **When** a member overrides their contribution amount, **Then** the app must recalculate and display the new projected completion date.

---

### User Story 4 - Budget Transfers & Archiving (Priority: P2) [Source: specs/001-calculoides-core-app]

As a group member, I want to transfer my budget share to another member (e.g., I pay for electricity, they pay for internet), and as an owner, I want to manage past month's data.

**Why this priority**: Adds flexibility for real-world scenarios where "who pays what" doesn't always align perfectly with the budget.

**Independent Test**: Transfer €50 from User A to User B for the "Utilities" category and verify their respective remaining balances update.

**Acceptance Scenarios**:

1. **Given** two members A and B, **When** A transfers €30 of their budget share to B, **Then** A's remaining personal balance decreases by €30 and B's increases by €30.
2. **Given** a group owner, **When** they select a date range (e.g., "last month") to archive expenses, **Then** those expenses should be moved to a historical record and cleared from the active dashboard.

---

### User Story 5 - Authentication & Navigation (Priority: P1) [Source: specs/001-calculoides-core-app]

As a user, I want to securely log in to the application and navigate between the dashboard, group settings, and my profile so that I can manage my finances privately and efficiently.

**Why this priority**: Required for security and basic application usability.

**Independent Test**: Navigate to the root URL; if not logged in, should be redirected to `/login`. After successful login, should reach the dashboard.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they attempt to access the dashboard, **Then** they should be redirected to the Login page.
2. **Given** a new user, **When** they fill out the Signup form with valid credentials, **Then** a new account should be created and they should be automatically logged in.
3. **Given** an authenticated user on the Dashboard, **When** they click a navigation link (e.g., "Settings"), **Then** the application should render the corresponding page without a full page reload.

---

### User Story 6 - Local Development Mode (Priority: P1) [Source: specs/002-local-server-testing]

As a developer, I want to run Calculoides entirely on my local machine while maintaining a connection to Supabase so that I can work without dependency on Vercel deployment while using real data.

**Why this priority**: Core requirement for offline development (excluding DB) and faster iteration cycles.

**Independent Test**: Can be fully tested by setting `CALC_ENVIRONMENT=local`, launching the local development server, and performing a basic calculation or data entry that persists to Supabase without any network requests to vercel.app.

**Acceptance Scenarios**:

1. **Given** the app is configured for local mode via `CALC_ENVIRONMENT`, **When** the app starts, **Then** it connects to a local development address for the application logic but remains connected to the Supabase backend.
2. **Given** the local server is running, **When** I create a new item in Calculoides, **Then** it is persisted to the remote Supabase instance and remains visible after refresh.

---

### User Story 7 - Automated Local Testing (Priority: P2) [Source: specs/002-local-server-testing]

As a tester, I want to run the test suite against a stable local server connected to a test Supabase instance so that I can ensure feature parity.

**Why this priority**: Ensures that local development remains reliable and consistent with production behavior.

**Independent Test**: Running the existing test suite with `CALC_ENVIRONMENT=test-local` pointing to the local server and a test Supabase project.

**Acceptance Scenarios**:

1. **Given** the test environment is active, **When** tests are executed, **Then** they use the local server as the application backend.

---

### User Story 8 - Consolidate Related Functions (Priority: P1) [Source: specs/002-reduce-vercel-functions]

As a developer, I want to merge related API endpoints into a single serverless function so that I can stay within Vercel's Hobby plan limits while maintaining all site functionality.

**Why this priority**: Directly addresses the primary constraint of the Vercel Hobby plan (12 function limit).

**Independent Test**: Identify two or more related functions, combine them into one with a routing mechanism, and verify that all original endpoints still work correctly.

**Acceptance Scenarios**:

1. **Given** multiple API routes (e.g., `/api/user/get`, `/api/user/update`), **When** they are merged into a single function (e.g., `/api/user/[...action]`), **Then** both `GET` and `POST` requests to the original logical paths return expected results.
2. **Given** a consolidated function, **When** it is deployed, **Then** Vercel counts it as only one serverless function.

---

### User Story 9 - Remove or Migrate Unused/Low-Impact Functions (Priority: P2) [Source: specs/002-reduce-vercel-functions]

As a developer, I want to identify functions that can be converted to static generation or removed if they are redundant, further reducing the total count.

**Why this priority**: Simplifies the codebase and optimizes resource usage.

**Independent Test**: Delete a function or convert it to a static prop fetcher and verify the page still loads correctly.

**Acceptance Scenarios**:

1. **Given** a function that only fetches static data, **When** it is replaced by build-time data fetching (static generation), **Then** the function is removed from the Vercel deployment and the page remains functional.

---

### User Story 10 - Compliance Verification (Priority: P3) [Source: specs/002-reduce-vercel-functions]

As a maintainer, I want a way to verify that the total function count is 12 or fewer before a deployment is finalized.

**Why this priority**: Prevents future regressions where adding new features exceeds the deployment limit.

**Independent Test**: Run a check during the build process that counts the generated functions.

**Acceptance Scenarios**:

1. **Given** a build output, **When** the number of serverless functions is 12 or fewer, **Then** the build passes.
2. **Given** a build output, **When** the number of serverless functions exceeds 12, **Then** the build fails with a descriptive error.

## Requirements

### Functional Requirements [Source: specs/001-calculoides-core-app]

- **FR-001**: System MUST support multiple independent groups with strictly isolated data.
- **FR-002**: System MUST calculate income percentage shares based on the total combined income of all members (or selected subset) in a group. Mid-month income updates MUST be applied retroactively to all expenses and budgets for the entire current calendar month, excluding already archived records.
- **FR-003**: System MUST allow members to log expenses with description, amount, date, and payer. Deletions of expenses MUST be permanent and irreversible. When logging an expense, the system MUST resolve the authenticated `User ID` to the specific `GroupMember ID` for the group containing the target category. The implementation MUST ensure that all non-nullable fields are correctly populated and that ID types are consistent between the Prisma schema and database migrations to prevent null constraint violations.
- **FR-004**: System MUST display a dashboard showing income overview, remaining balance per user, recent expenses, transfers, and category status. All categories MUST be visible to all members of the group. Deletions of budget categories MUST be permanent and irreversible.
- **FR-005**: System MUST allow budget transfers between members within a group, restricted to moving quota within the same budget category.
- **FR-006**: System MUST calculate monthly savings contributions based on target amount, target date, and income percentages. Any group member MUST be able to override their own or any other member's contribution. If contributions are overridden, the system MUST recalculate the projected date and display the variance from the original target date. System MUST provide explicit visual feedback for all contribution override actions.
- **FR-007**: System MUST allow group owners to archive expenses for specific date ranges; archived records MUST be moved to an immutable historical view. This view MUST preserve individual expense records while also displaying the final total monthly settlement amount per user. Upon archiving, the spent balance of the affected budget categories MUST reset to 0.
- **FR-008**: System MUST support a single-owner model per group. The creator is the initial owner, and ownership can be transferred to any other active group member. Owners have exclusive permissions to invite/remove members, transfer budgets for all members, modify the monthly income of any group member, and archive expenses. If an owner leaves without transferring, ownership MUST automatically transfer to the member with the longest tenure.
- **FR-009**: System MUST implement a routing architecture with protected routes for authenticated users and public routes for login/signup.
- **FR-010**: System MUST provide a user interface for authentication (Login and Signup) integrated with the backend session service. It MUST correctly handle environment-specific configuration for the Supabase client.
- **FR-011**: System MUST maintain a consistent communication contract between the frontend and backend API. In development, the frontend MUST use a robust proxy configuration to route `/api/*` requests to the local backend server (defaulting to `http://localhost:3001`).
- **FR-012**: System MUST ensure that the custom API client dynamically retrieves the current authentication session from the Supabase client for every request. Authentication tokens MUST NOT be stored in `localStorage`.
- **FR-013**: System MUST support an optional override for SSL certificate validation in development environments to allow communication with local Supabase instances using self-signed certificates.
- **FR-014**: System MUST ensure that initial session verification and data hydration reach a terminal state (success, error, or redirect) within a reasonable timeout (e.g., 5s) to avoid persistent loading states.
- **FR-015**: System MUST ensure that users are consistently displayed by their `name` property across all views in the UI.
- **FR-016**: System MUST display a detailed breakdown for each budget category showing each member's proportional share (percentage and currency amount), their current spent amount, and their remaining balance.
- **FR-017**: System MUST provide a way for users to view a list of all individual expense entries for any given category or the entire group.
- **FR-018**: System MUST apply a consistent percentage rounding strategy (2 decimal places with Remainder Absorption by the highest earner) across all views, including Budget categories, Savings goals, and Dashboard Overview.

### Functional Requirements: Local Server Testing [Source: specs/002-local-server-testing]

- **FR-019**: System MUST support a configuration toggle using the `CALC_ENVIRONMENT` variable to switch between `remote` and `local` application environments.
- **FR-020**: System MUST allow configuring separate Supabase credentials for local development via environment-specific configuration files (`.env` for `local`, `.env.test` for `test-local`).
- **FR-021**: All core CRUD operations in Calculoides MUST function identically when using the local server pointing to Supabase.
- **FR-022**: System MUST provide a mechanism to launch the local application server independently of Vercel.
- **FR-023**: System MUST provide clear feedback if the local server is reachable but the connection to Supabase fails. Feedback MUST be provided as a `503 Service Unavailable` HTTP status with a JSON payload: `{ "error": "Supabase Connection Failed", "details": "..." }`.

### Functional Requirements: Serverless Function Reduction [Source: specs/002-reduce-vercel-functions]

- **FR-024**: System MUST be configured to deploy no more than 12 serverless functions to Vercel.
- **FR-025**: Related API routes MUST be consolidated into shared handler functions (e.g., using dynamic routing or a central dispatcher).
- **FR-026**: The build process MUST report the current number of serverless functions and fail if the count exceeds 12.
- **FR-027**: All public-facing API endpoints MUST maintain their original behavior and response format.
- **FR-028**: Infrastructure-as-Code (vercel.json) MUST be used to explicitly manage function grouping and route mapping.
- **FR-029**: Consolidated handlers MUST preserve "Calculation on Read" and "Remainder Absorption" patterns for all financial logic (Constitution III).
- **FR-030**: The local development server MUST achieve parity with Vercel's rewrite engine by correctly mapping logical paths defined in `vercel.json` to their consolidated handlers.
- **FR-031**: Consolidated handlers MUST support method-aware dispatching (GET/POST/PATCH/DELETE) when multiple logical endpoints are merged into a single action-based route.

## Key Entities

- **User**: Individual account holder. [Source: specs/001-calculoides-core-app]
- **Group**: Container for shared budgeting, with a name and a collection of Members. [Source: specs/001-calculoides-core-app]
- **Member**: A User within the context of a specific Group, having a specific monthly income, an ownership status, and a `joinedAt` timestamp. [Source: specs/001-calculoides-core-app]
- **Budget Quota**: The specific portion of a category's budget allocated to a member based on their income share or transfer adjustments. [Source: specs/001-calculoides-core-app]
- **Expense**: A specific transaction tied to a Budget Category, recorded by a Member. [Source: specs/001-calculoides-core-app]
- **Transfer**: A budget adjustment between two Members. [Source: specs/001-calculoides-core-app]
- **Savings Goal**: A target amount and date with calculated monthly contributions. [Source: specs/001-calculoides-core-app]
- **Local Server**: A local process hosting the Calculoides application logic. [Source: specs/002-local-server-testing]
- **Supabase**: The remote backend-as-a-service used for data persistence and authentication. [Source: specs/002-local-server-testing]
- **Serverless Function**: A physical deployment unit in Vercel. [Source: specs/002-reduce-vercel-functions]
- **Logical Endpoint**: A URL path that the application exposes (e.g., `/api/v1/resource`). [Source: specs/002-reduce-vercel-functions]
- **Endpoint Inventory**: The list of existing logical endpoints that must maintain parity. [Source: specs/002-reduce-vercel-functions]

## Edge Cases & Error Handling

- **Floating Point Precision**: Handled via `shared/logic/rounding.ts` (Remainder Absorption). [Source: specs/001-calculoides-core-app]
- **Network Failure**: Frontend MUST handle Supabase and Vercel timeouts gracefully with retry logic for read operations. [Source: specs/001-calculoides-core-app]
- **Invalid Invitation**: Invitations that are expired or already used MUST redirect to `/groups` with an error message. [Source: specs/001-calculoides-core-app]
- **Zero-Income Member**: Members with 0 income are excluded from proportional share calculations for shared categories but can still log individual expenses. [Source: specs/001-calculoides-core-app]
- **Supabase Unreachable (Local Mode)**: Local server MUST return `503 Service Unavailable` if connection to Supabase fails. [Source: specs/002-local-server-testing]
- **Function Size Limits**: If consolidated functions approach a **40MB bundle size threshold**, they will be split into smaller grouped functions. [Source: specs/002-reduce-vercel-functions]
- **Cold Starts**: Latency degradation up to 20% is accepted as a tradeoff for staying within function limits. [Source: specs/002-reduce-vercel-functions]

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create a group and invite 4 housemates in under 3 minutes. [Source: specs/001-calculoides-core-app]
- **SC-002**: Proportional shares are recalculated and updated on the dashboard within 500ms of an income or category change. [Source: specs/001-calculoides-core-app]
- **SC-003**: 100% of expense entries are correctly reflected in the dashboard and history view. [Source: specs/001-calculoides-core-app]
- **SC-004**: System maintains strict data isolation between groups. [Source: specs/001-calculoides-core-app]
- **SC-005**: 100% of unit and integration tests pass in all environments. [Source: specs/001-calculoides-core-app, specs/002-local-server-testing]
- **SC-006**: A developer can switch to local mode and connect in under 10 seconds. [Source: specs/002-local-server-testing]
- **SC-007**: The total number of unique physical serverless functions deployed to Vercel is 12 or fewer. [Source: specs/002-reduce-vercel-functions]
- **SC-008**: 100% of existing application features remain functional after function consolidation. [Source: specs/002-reduce-vercel-functions]
- **SC-009**: No logical endpoint experiences a latency increase of more than 20% due to consolidation. [Source: specs/002-reduce-vercel-functions]
- **SC-010**: 100% of logical endpoints defined in `vercel.json` are functional in the local development environment. [Source: specs/002-reduce-vercel-functions]

## Assumptions

- **Currency**: The system defaults to a single currency per group (e.g., Euro). [Source: specs/001-calculoides-core-app]
- **Manual Reset**: Budgets do not auto-reset; they rely on the owner's archive action. [Source: specs/001-calculoides-core-app]
- **Vercel Hobby Plan**: The system is constrained by the 12-function limit of the Hobby plan. [Source: specs/002-reduce-vercel-functions]
- **Supabase Persistence**: External data storage and authentication are managed by Supabase. [Source: specs/001-calculoides-core-app]
