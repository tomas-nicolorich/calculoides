# Tasks: project-redesign

**Input**: Design documents from `/specs/003-project-redesign/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as requested by the TDD workflow and project standards.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install `@base-ui/react` and `@tailwindcss/vite` in `frontend/package.json`
- [X] T002 Create FSD folder structure (shared, entities, features, widgets, pages) in `frontend/src`
- [X] T003 [P] Setup global Tailwind 4 configuration and color variables in `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define redesign Zod schemas for dashboard and expense data in `shared/src/schemas/redesign.ts`
- [X] T005 [P] Create redesign TypeScript types and interfaces in `shared/src/types/redesign.ts`
- [X] T006 Implement API client hooks for fetching dashboard and group data in `frontend/src/shared/api/dashboardHooks.ts`. Use logical paths (e.g., `/api/summary`) supported by rewrites.
- [X] T007 [P] Configure Vitest and RTL for the new frontend structure in `frontend/vitest.config.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Dashboard Overview (Priority: P1) 🎯 MVP

**Goal**: Redesign the main dashboard with Income, Balance, Transfers, and Categories cards.

**Independent Test**: Verify that the dashboard renders all four initial cards with correct group-specific data.

### Tests for User Story 1

- [X] T008 [P] [US1] Unit test for dashboard data transformation logic in `frontend/tests/shared/api/dashboard.test.ts`
- [X] T009 [P] [US1] Component test for Dashboard Card primitive in `frontend/tests/shared/ui/Card.test.tsx`
- [X] T009b [US1] Write failing integration test for Dashboard rendering all 5 cards in `frontend/tests/pages/dashboard.test.tsx`
- [X] T009c [US1] Write failing test for Owner-only category deletion in `frontend/tests/widgets/categories.test.tsx`
- [X] T033 [US1] Investigate and fix duplicate backend calls in `frontend/src/shared/api/dashboardHooks.ts`. Ensure request deduplication or proper lifecycle management. [BUG-003]

### Implementation for User Story 1

- [X] T010 [P] [US1] Create reusable Dashboard Card primitive using Base UI in `frontend/src/shared/ui/Card.tsx`
- [X] T011 [US1] Implement Income Overview widget with horizontal stacked bar chart in `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`
- [X] T012 [US1] Implement Remaining Balance widget with per-member breakdown in `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx`
- [X] T013a [US1] Implement Budget Categories list with per-member breakdown in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`
- [X] T013b [US1] Implement "Add Category" and "Edit Category" dialogs in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`
- [X] T013c [US1] Implement Owner-only "Delete Category" logic with confirmation in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`. MUST NOT use browser `confirm()`.
- [X] T013d [US1] Add "Initiate Transfer" button to each member's breakdown row in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` [R15]
- [X] T014a [US1] Implement Budget Transfers log widget (last 5) in `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx`
- [X] T014b [US1] Create dedicated full Budget Transfers list page with filtering in `frontend/src/pages/transfers/ui/TransfersPage.tsx` [R13]
- [X] T015a [US1] Assemble main Dashboard page with card-based layout in `frontend/src/pages/dashboard/ui/DashboardPage.tsx`
- [X] T015b [US1] Add prominent "Savings Goal" navigation button to Dashboard in `frontend/src/pages/dashboard/ui/DashboardPage.tsx` [R02]
- [X] T036 [US1] Create redesign test for Savings Goal page in `frontend/tests/pages/savings.test.tsx`
- [X] T037 [US1] Redesign Savings Goal page using `Card` primitives and Tailwind 4 color variables in `frontend/src/pages/savings/ui/SavingsPage.tsx` [BUG-006]
- [X] T038 [US1] Update Savings Goal widgets (List and Form) to match the new aesthetic in `frontend/src/features/savings/` [BUG-006]
- [X] T039 [US1] Create a custom Alert/Dialog primitive using Base UI in `frontend/src/shared/ui/Dialog.tsx`
- [X] T040 [US1] Replace browser `confirm()` in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` with the new custom Dialog component.

**Checkpoint**: At this point, the core dashboard should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Expense Management (Priority: P2)

**Goal**: Display recent expenses on the dashboard and provide a full list page with filters.

**Independent Test**: Verify recent expenses show on dashboard, and full list page correctly filters by member and category.

### Tests for User Story 2

- [X] T016 [P] [US2] Unit test for expense filtering and pagination logic in `api/src/services/expenseService.test.ts`
- [X] T017 [P] [US2] Integration test for "View All" navigation from dashboard to expenses page in `frontend/tests/pages/expenses.test.tsx`

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement Recent Expenses (last 5) card widget in `frontend/src/widgets/dashboard/ui/RecentExpenses.tsx`
- [X] T019 [US2] Create dedicated full Expenses list page in `frontend/src/pages/expenses/ui/ExpensesPage.tsx`
- [X] T020 [US2] Implement Expense Filter feature (member and category) in `frontend/src/features/expense-filtering/ui/ExpenseFilter.tsx`
- [X] T021 [US2] Integrate expense filters with the full expenses list page in `frontend/src/pages/expenses/ui/ExpensesPage.tsx`
- [X] T034 [US2] Define and implement logical API path for transaction deletion in `vercel.json` rewrites (mapped to `DELETE /api/transactions/:id`)
- [X] T035 [US2] Update frontend expense deletion logic to use `DELETE` method and the correct logical path

**Checkpoint**: At this point, users can manage and view expenses across the dashboard and dedicated page.

---

## Phase 5: User Story 3 - Global Navigation & Settings (Priority: P2)

**Goal**: Implement the global hamburger menu, My Groups page, and Profile management.

**Independent Test**: Verify menu navigation to all pages, group selection functionality, and profile updates.

### Tests for User Story 3

- [X] T022 [P] [US3] Unit test for theme toggle and persistence logic in `frontend/tests/features/theme.test.tsx`
- [X] T023 [P] [US3] Component test for Hamburger Menu accessibility in `frontend/tests/widgets/navigation.test.tsx`

### Implementation for User Story 3

- [X] T024 [P] [US3] Implement Global Hamburger Menu widget using Base UI in `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx`
- [X] T025 [US3] Create My Groups landing page with group selection and creation logic (Fixed BUG-001: added defensive rendering for group.role)
- [X] T026 [US3] Create Profile page for name and password updates in `frontend/src/pages/profile/ui/ProfilePage.tsx`

**Bugfix**: 2026-06-02 — BUG-009 Reopened dialog-related tasks due to dependency resolution error.
**Bugfix**: 2026-06-01 — BUG-008 Updated from bugfix patch to address browser alerts.
**Bugfix**: 2026-05-31 — BUG-007 Updated from bugfix patch
**Bugfix**: 2026-05-30 — BUG-006 Updated from bugfix patch to address Savings Goal redesign.
**Bugfix**: 2026-05-27 — BUG-001 Updated from bugfix patch
**Bugfix**: 2026-05-28 — BUG-002 Updated from bugfix patch
**Bugfix**: 2026-05-30 — BUG-005 Updated from bugfix patch to address transaction deletion 404.
**Bugfix**: 2026-05-28 — BUG-004 Updated from bugfix patch to correct Savings Goal navigation.
- [X] T027 [US3] Implement Theme Toggle feature for Dark Mode in `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx`
- [X] T028 [US3] Integrate Sign Out and navigation links into the Hamburger Menu in `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx`

**Checkpoint**: All navigation and account management features should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T029 [P] Ensure Dark Mode persistence in `localStorage` within `frontend/src/app/providers/ThemeProvider.tsx`
- [X] T030 Optimize dashboard rendering and data pre-fetching in `frontend/src/pages/dashboard/ui/DashboardPage.tsx`
- [X] T031 [P] Update `quickstart.md` with new redesign verification and setup steps
- [X] T032 Final UI review for "sleek, colorful, and subtle" aesthetic consistency across all cards

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Recommended order: US1 (MVP) -> US2 -> US3.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2).
- **User Story 3 (P2)**: Can start after Foundational (Phase 2).

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Once Foundational phase completes, US1, US2, and US3 implementation can start in parallel.
- All tests for a user story marked [P] can run in parallel.
- Card primitive (T010) can be developed in parallel with data fetching (T006).

---

## Parallel Example: User Story 1

```powershell
# Launch tests for User Story 1 together:
# T008 [P] [US1] Unit test for dashboard data transformation logic
# T009 [P] [US1] Component test for Dashboard Card primitive

# Launch implementation tasks for User Story 1 together:
# T010 [P] [US1] Create reusable Dashboard Card primitive
# T011 [US1] Implement Income Overview widget
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently against `spec.md` SC-001.

### Incremental Delivery

1. Foundation ready (Phase 1-2).
2. Add User Story 1 -> Dashboard MVP.
3. Add User Story 2 -> Expense Tracking.
4. Add User Story 3 -> Nav & Settings.
5. Polish phase for final refinement.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable and testable.
- Vitest and RTL are the primary testing tools.
- Tailwind 4 and Base UI are the primary UI building blocks.
