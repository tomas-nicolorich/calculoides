# Feature Specification: Calculoides Core App

**Feature Branch**: `001-calculoides-core-app`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: User description: "Build Calculoides - a shared expense and budget management application for household groups. **Groups** A user can create a group and invite other users to join via email invitation or already registered users. A user can belong to multiple groups. Each group has a name and a list of members. **User income within a group** Each member of a group can set their monthly income within that group context. The application uses these income values to calculate each member's proportional share as a percentage of the group's total combined income. For example, if member A earns €2000 and member B earns €1000, A's share is 67% (66.67% rounded) and B's is 33% (33.33% rounded) **Budget categories** Group members can create budget categories (e.g. Rent, Utilities, Groceries). Each category has a total monthly budget amount, name, icon (emoji) and an optional subset of members. The app calculates how much each member owes for that category based on their income percentage. Members can see their individual share, the other member's shares and the group total for each category. If a subset of members is selected, the app calculates the percentages based on the selected members. **Budget transfers** Each member has the ability to \"transfer\" an amount of budget from a selected category to another user. The app should calculate accordingly by resting from the member transfering and adding to the member receiving. The owner should have the ability to transfer from and to all members. **Expense tracking** Members can log individual expense entries against a budget category. Each entry has a description, amount, date and the member who paid. The application tracks how much of each category's monthly budget has been spent and shows the remaining balance. The owner may have the ability to \"archive\" expenses for a specified date range (default the whole past month) to track past expenses. **Savings goals** Members can create a savings goal with a name, starting balance, a target balance, and a target date. The application calculates how much each member needs to save per month to reach the target by the target date, proportional to their income percentage. A member can override each user's monthly contribution amount; when this happens, the application recalculates the projected completion date based on the new contributions. The goal shows current progress, projected date, and each member's monthly contribution. **Summary view** The application provides a dashboard that shows, an Income Overview with each member's income and percentage, a Remaining Balance section showing how much each user is left with after \"taking away\" the sum of all categories against their income, a list of the last 5 expenses with the possibility to view all in another page, a Budget Transfers section and the Budget Categories section showing for each category its icon, name, total amount, each member's share and the remaining after taking into account the expenses. Also at the bottom of the Budget Categories section the app should show the total monthly budget of the group and of each member. **Target users** Initially a private household group (5 people). The application must be designed to support multiple independent groups with no data overlap, as it will be opened to the public in the future."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Group Setup & Income Distribution (Priority: P1)

As a household member, I want to create a group and invite my housemates so that we can share our expenses proportionally based on our individual incomes.

**Why this priority**: Fundamental to the entire application logic. Proportional distribution is the core differentiator.

**Independent Test**: Can be tested by creating a group with two members, setting their incomes (e.g., 2000 and 1000), and verifying the calculated shares (67% and 33%).

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they create a group named "My Home", **Then** they should be the owner and only member of the group.
2. **Given** a group owner, **When** they invite a user via email, **Then** the invited user should receive an invitation and be able to join the group.
3. **Given** a group member, **When** they update their income in the group context, **Then** the percentage shares for all members in that group must be recalculated immediately.

---

### User Story 2 - Budgeting & Spending (Priority: P1)

As a group member, I want to define budget categories (like Rent or Groceries) and log expenses against them so that we can track how much of our monthly budget is remaining.

**Why this priority**: This is the primary daily utility of the app. Without expense tracking, the budget is just a theoretical plan.

**Independent Test**: Create a category "Rent" for €1000, log an expense of €600, and verify the remaining balance is €400.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "Groceries" category with a €400 budget and a "Grocery basket" emoji, **Then** all members should see their individual share of that €400 based on their income.
2. **Given** a "Groceries" category, **When** a member logs a €50 expense for "Weekly shopping", **Then** the remaining balance for the category should update to €350.
3. **Given** a category with a restricted subset of members, **When** income percentages are calculated, **Then** only the income of those selected members should be used to determine the shares.

---

### User Story 3 - Savings Goals & Proportional Contributions (Priority: P2)

As a group member, I want to set a savings goal for a future purchase (like a new sofa) so that the app calculates how much each person needs to save monthly to reach the target on time.

**Why this priority**: Encourages long-term financial planning within the group.

**Independent Test**: Set a goal for €1200 with a target date 6 months away, verify members are asked to save a total of €200/month divided by their income share.

**Acceptance Scenarios**:

1. **Given** a group, **When** a member creates a "New Sofa" goal for €1200 with a 6-month deadline, **Then** the app should show each member's monthly contribution (e.g., if A has 60% share, they save €120/month).
2. **Given** an active savings goal, **When** a member overrides their contribution amount, **Then** the app must recalculate and display the new projected completion date.

---

### User Story 4 - Budget Transfers & Archiving (Priority: P2)

As a group member, I want to transfer my budget share to another member (e.g., I pay for electricity, they pay for internet), and as an owner, I want to manage past month's data.

**Why this priority**: Adds flexibility for real-world scenarios where "who pays what" doesn't always align perfectly with the budget.

**Independent Test**: Transfer €50 from User A to User B for the "Utilities" category and verify their respective remaining balances update.

**Acceptance Scenarios**:

1. **Given** two members A and B, **When** A transfers €30 of their budget share to B, **Then** A's remaining personal balance decreases by €30 and B's increases by €30.
2. **Given** a group owner, **When** they select a date range (e.g., "last month") to archive expenses, **Then** those expenses should be moved to a historical record and cleared from the active dashboard.

---

### Edge Cases

- **Zero Income**: What happens if a group member has zero income? (Assumption: Their percentage share becomes 0%, and they owe nothing unless a custom contribution is set).
- **Overspending**: How does the system handle expenses that exceed the category budget? (Assumption: The remaining balance becomes negative and is highlighted).
- **No Members in Category**: What happens if a category is created with an empty subset of members? (Requirement says "optional subset", default is all members).
- **Rounding Errors**: How are fractions of a cent handled in proportional shares? (Assumption: Round to 2 decimal places, with the last member absorbing any 0.01 discrepancy to ensure the total is 100%).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support multiple independent groups with strictly isolated data.
- **FR-002**: System MUST calculate income percentage shares based on the total combined income of all members (or selected subset) in a group.
- **FR-003**: System MUST allow members to log expenses with description, amount, date, and payer.
- **FR-004**: System MUST display a dashboard showing income overview, remaining balance per user, recent expenses, transfers, and category status.
- **FR-005**: System MUST allow budget transfers between members within a group.
- **FR-006**: System MUST calculate monthly savings contributions based on target amount, target date, and income percentages.
- **FR-007**: System MUST allow group owners to archive expenses for specific date ranges.
- **FR-008**: System MUST support a single-owner model per group. The creator is the initial owner, and ownership can be transferred to any other active group member. Owners have exclusive permissions to transfer budgets for all members and archive expenses.

### Key Entities

- **User**: Individual account holder.
- **Group**: Container for shared budgeting, with a name and a collection of Members.
- **Member**: A User within the context of a specific Group, having a specific monthly income and an ownership status.
- **Budget Category**: A named bucket (e.g., "Rent") with an icon, total budget, and optionally a restricted list of Members.
- **Expense**: A specific transaction tied to a Budget Category, recorded by a Member.
- **Transfer**: A budget adjustment between two Members.
- **Savings Goal**: A target amount and date with calculated monthly contributions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a group and invite 4 housemates in under 3 minutes.
- **SC-002**: Proportional shares are recalculated and updated on the dashboard within 500ms of an income or category change.
- **SC-003**: 100% of expense entries are correctly reflected in the "Remaining Balance" sections of the dashboard.
- **SC-004**: System maintains data isolation such that no user can see data from a group they do not belong to.

## Assumptions

- **Currency**: The system defaults to a single currency per group (e.g., Euro as in the example).
- **Month Boundaries**: Budgets and incomes are reset/calculated on a standard calendar month basis.
- **Invite Logic**: Invitations are sent via email, and the system handles the delivery and acceptance flow.
- **Device**: The initial implementation is a responsive web application suitable for both desktop and mobile browsers.
- **Security**: Basic authentication (email/password) is required for all users.
