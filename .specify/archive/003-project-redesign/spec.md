# Feature Specification: project-redesign

**Feature Branch**: `[###-project-redesign]`  
**Created**: 2026-05-26  
**Status**: Verified
**Input**: User description: "lets create the spec for 003-project-redesign. create the folder but remain on this branch. I want to redesign the app by taking big inspiration from all the images in @docs/ The design might be changed if it improves it, but if theres doubt in how to improve it just copy it from the images. As you can see its a card based layout with the following sections: Income Overview, Remaining Balance, Expenses, Budget Transfers and Budget Categories. Then theres a button that takes you to another page for the savings calculator. The design is sleek, colorful and subtle. Theres a hamburger menu on the top right with the following options: My Groups (a page with a list of all groups the user is part of and a button to create a new one), Profile (where a user can change their name and password) a dark mode toggle and an option to sign out. The expenses card shows the last 5 expenses with an option to see all in a new page with a filter by member and category"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Overview (Priority: P1)

As a user, I want to view a card-based dashboard so that I can get a quick overview of my Income, Remaining Balance, Expenses, Budget Transfers, and Budget Categories.

**Why this priority**: The dashboard is the core landing view of the application, providing immediate financial visibility.

**Independent Test**: Can be tested by loading the main screen and verifying the presence of all five distinct cards.

**Acceptance Scenarios**:

1. **Given** the user is logged in, **When** they load the application, **Then** they land on the "My Groups" page to select an active group.
2. **Given** the user has selected an active group, **When** they view the main dashboard, **Then** they see cards for Income Overview, Remaining Balance, Expenses, Budget Transfers, and Budget Categories populated with data for that specific group.
3. **Given** the user is on the dashboard, **When** they click the Savings Goal button, **Then** they are navigated to the Savings Goal page.

---

### User Story 2 - Expense Management (Priority: P2)

As a user, I want to see my most recent expenses on the dashboard and view/filter all expenses on a separate page so that I can track where my money is going.

**Why this priority**: Managing and tracking expenses is a primary function of a budgeting application.

**Independent Test**: Can be tested by verifying the expenses card shows recent items, navigating to the full list, and applying filters.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they look at the Expenses card, **Then** they see the 5 most recent expenses.
2. **Given** the user is on the dashboard, **When** they choose to view all expenses, **Then** they are taken to a new page showing the full list.
3. **Given** the user is on the full expenses page, **When** they apply a filter for a specific member or category, **Then** the list updates to show only matching expenses.

---

### User Story 3 - Global Navigation & Settings (Priority: P2)

As a user, I want to access my groups, profile, and app settings through a unified hamburger menu so that I can easily manage my account and preferences.

**Why this priority**: Access to group management, profile updates, and authentication features is necessary for full application usage.

**Independent Test**: Can be tested by opening the menu and interacting with the available settings and navigation options.

**Acceptance Scenarios**:

1. **Given** the user is on any main page, **When** they click the top-right hamburger menu, **Then** they see options for My Groups, Profile, Dark Mode, and Sign Out.
2. **Given** the user opens the menu and selects My Groups, **When** they navigate to the page, **Then** they can see their groups, select a group to view its dashboard, and have an option to create a new group.
3. **Given** the user opens the menu and selects Profile, **When** they navigate to the page, **Then** they can update their name and password.
4. **Given** the user clicks the dark mode toggle, **When** activated, **Then** the application switches visually to a dark color scheme.

---

### Edge Cases

- What happens when a user has zero expenses or no groups?
- What happens if the member or category filters return no results?
- How are Budget Categories presented when some are assigned to specific Member Subsets?
- How does the UI gracefully handle very long group names or user names?
- Does the dark mode preference persist across sessions?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a card-based dashboard containing sections for Income Overview, Remaining Balance, Expenses, Budget Transfers, and Budget Categories. All Budget Categories for the active Group MUST be visible to all members, regardless of Member Subset assignment.
- **FR-002**: System MUST provide a prominent button on the dashboard that navigates to the Savings Goal page. The Savings Goal page MUST adhere to the "sleek, colorful, and subtle" card-based design pattern established in SC-003. All cards and elements on the Savings Goal page, including status badges, labels, forms, projected dates, and state-specific backgrounds (e.g. success card background), MUST support full dark-mode compatibility with sufficient text-to-background contrast (minimum 4.5:1 ratio) to ensure visual legibility under both Light and Dark themes. (Clarified to specify dark mode compatibility and contrast requirements — BUG-015)
- **FR-003**: System MUST display up to the 5 most recent expenses within the Expenses dashboard card.
- **FR-004**: System MUST allow users to navigate from the Expenses card to a dedicated full expenses page.
- **FR-005**: System MUST provide filtering controls on the full expenses page to filter by member (the individual who paid for the expense) and category.
- **FR-006**: System MUST provide a hamburger menu anchored to the top right of the application layout.
- **FR-007**: System MUST provide a "My Groups" page, serving as the initial landing page after login, accessible via the menu, listing the user's groups (allowing selection to change the active dashboard context) with a button to create a new one.
- **FR-008**: System MUST provide a "Profile" page, accessible via the menu, where users can update their name and password.
- **FR-009**: System MUST include a toggle switch for Dark Mode within the hamburger menu.
- **FR-010**: System MUST include a functional Sign Out option within the hamburger menu.
- **FR-011**: ~~The "Income Overview" card MUST display each member's individual income and their calculated Income Percentage, the total combined Group income, and a horizontal stacked bar chart visually representing the distribution of Income Percentages across members.~~ The "Income Overview" card MUST display each member's individual income and their calculated Income Percentage, the total combined Group income, and a horizontal stacked bar chart visually representing the distribution of Income Percentages across members. Each member's bar segment MUST be visually distinct (using a dynamic, rotating color palette) to prevent adjacent segments from merging, and a matching color-coded visual indicator/dot MUST be displayed next to each member's name in the below-chart breakdown to serve as a legend. (Clarified to prevent adjacent segment color merging and add visual legend — BUG-014)
- **FR-012**: The "Remaining Balance" card MUST display the "Total Combined Remaining" for the group, as well as a per-member breakdown showing each member's individual remaining balance alongside their Income and Total Budget Quota ("Budgeted").
- **FR-013**: The "Budget Transfers" card MUST display a log of the most recent transfers (similar to the Expenses card) and include a "View All" button navigating to a dedicated transfers page with filtering by member and category. The card MUST NOT include a button to create new transfers.
- **FR-014**: The "Budget Categories" card MUST list all categories, showing their total target amount and a breakdown of each member's Budget Quota, Spent amount, and remaining amount ("left"). It MUST include an "+ Add" button that allows any member to create a new category.
- **FR-015**: Within the "Budget Categories" card, each member's breakdown row MUST include a button to initiate a new Transfer for that specific category.
- **FR-016**: The "Budget Categories" card MUST provide Edit and Delete actions for each category. Any member MUST be able to edit a category, but only the Owner MUST be able to delete a category.
- **FR-017**: The login and registration screen (`LoginPage.tsx` and `LoginForm.tsx`) MUST be updated to adhere to the "sleek, colorful, and subtle" card-based design pattern established in SC-003 and use the global Tailwind 4 color variables.
- **FR-018**: System MUST ensure all interactive form inputs (such as `<input>`, `<select>`, `<option>`, and `<textarea>`) are styled with explicit background, border, text, and placeholder colors under both Light and Dark themes to maintain sufficient visual contrast (minimum 4.5:1 ratio) and prevent browser default user-agent styles from displaying unreadable text in dark mode.

### Key Entities

- **Expense**: Contains details such as amount, date, category, and member.
- **Group**: A collaborative unit that users can be part of, containing a name and associated members.
- **User Profile**: Contains the user's display name, authentication credentials (password), and preferences (theme).
- **Remaining Balance**: A derived UI concept representing a Member's unallocated funds, calculated as their Income minus the sum of their Budget Quotas across all categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard renders all five required cards and populates them with initial data in under 2 seconds.
- **SC-002**: Users can successfully filter expenses, with the UI reflecting the filtered list instantaneously.
- **SC-003**: 100% of the UI follows the "sleek, colorful, and subtle" card-based design pattern inspired by the provided mockups.
- **SC-004**: Users can toggle dark mode and see immediate, application-wide visual changes.
- SC-005: System MUST deduplicate identical backend requests occurring within a 100ms window to ensure performance and prevent redundant server load.
- SC-006: System MUST NOT use browser default `alert()` or `confirm()` dialogs. All user feedback and confirmations MUST use custom UI components following the design pattern established in SC-003.

## Assumptions

- The underlying data architecture and APIs to fetch income, balance, expenses, transfers, categories, and groups already exist. The frontend MUST use the logical paths defined in the system's URL rewrites (e.g., `/api/summary`, `/api/categories`, `DELETE /api/transactions/:id`) rather than direct nested transaction paths.
- The Prisma Client must be generated during Vercel's build phase using a root-level `postinstall` script to ensure that the required generated client modules are compiled and available in the serverless functions runtime.
- The backend API files (such as `api/src/env.ts`) MUST be compatible with both the CommonJS environment of Vercel Serverless Functions and local ESM execution, avoiding runtime redeclaration of system globals like `__filename` and `__dirname`.
- Authentication mechanisms (sign out, change password) are supported by the existing backend.
- Dark mode user preference will be stored locally (e.g., localStorage) unless a backend preference API is provided.
- The Savings Goal page already exists or will be implemented independently of this specific UI redesign.

**Bugfix**: 2026-05-29 — BUG-014 Clarified FR-011 to require distinct segment colors and color legend indicators in Income Overview.
**Bugfix**: 2026-05-29 — BUG-013 Added FR-018 to ensure proper contrast for form controls in dark mode.
**Bugfix**: 2026-05-29 — BUG-012 Added ESM/CJS compatibility assumption for environment configuration in Vercel.
**Bugfix**: 2026-05-29 — BUG-011 Specified root build script / postinstall requirement for Vercel Prisma compilation.
**Bugfix**: 2026-06-02 — BUG-009 Corrected Base UI package name in implementation plan to fix dialog import error.
**Bugfix**: 2026-06-01 — BUG-008 Added SC-006 to explicitly forbid browser default alerts in favor of custom UI dialogs.
**Bugfix**: 2026-05-27 — BUG-001 Added edge case for defensive rendering of malformed group data.
**Bugfix**: 2026-05-28 — BUG-002 Clarified that frontend MUST use logical API paths (rewrites) for transactions.
**Bugfix**: 2026-05-29 — BUG-003 Added SC-005 for request deduplication to prevent duplicate backend calls.
**Bugfix**: 2026-05-31 — BUG-007 Fixed misrouted category deletion by ensuring distinct logical paths for categories.
**Bugfix**: 2026-05-30 — BUG-006 Updated FR-002 to include visual design requirements for the Savings Goal page.
**Bugfix**: 2026-05-30 — BUG-005 Defined logical path `DELETE /api/transactions/:id` for expense deletion.
**Bugfix**: 2026-05-29 — BUG-010 Added FR-017 to include visual design requirements for the Login/Registration screens.
**Bugfix**: 2026-05-28 — BUG-004 Clarified redirection requirement for Savings Goal navigation button.
**Bugfix**: 2026-05-29 — BUG-015 Updated FR-002 to specify proper theme-aware styling, contrasts, and state classes on the Savings Goal page.
**Bugfix**: 2026-05-29 — BUG-016 Clarified component-level styling and contrast requirements for form select/option dropdowns to guarantee FR-018.
