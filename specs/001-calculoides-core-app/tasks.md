# Tasks: Calculoides Core App

**Input**: Design documents from `/specs/001-calculoides-core-app/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md

**Tests**: Tests are requested as part of the TDD approach (Vitest 4.1.6).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure (frontend/, api/, prisma/) per plan.md
- [x] T002 Initialize monorepo dependencies (Vite 8, React 19, Prisma 7, Vitest 4)
- [x] T003 [P] Configure Tailwind CSS 4 and Shadcn/UI in frontend/
- [x] T004 [P] Configure ESLint and Prettier for strict TypeScript 6.0.3

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Initialize Prisma schema with base User and Group models in prisma/schema.prisma
- [x] T006 Setup Supabase project and configure DATABASE_URL in .env
- [x] T007 Implement Supabase RLS base policies for multi-tenancy in prisma/migrations/
- [x] T008 [P] Setup API routing and error handling middleware in api/src/middleware/
- [x] T009 [P] Implement session-based authentication service in api/src/services/auth.ts
- [x] T010 Setup Zod schema validation utility in shared/validation.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Group Setup & Income Distribution (Priority: P1) 🎯 MVP

**Goal**: Create groups and calculate proportional income shares

**Independent Test**: Create group with members A (€2000) and B (€1000) -> Verify shares are 67% and 33%

### Tests for User Story 1 (TDD) ⚠️

- [x] T011 [P] [US1] Unit test for income share calculation with remainder absorption and retroactive mid-month income updates in api/tests/logic/shares.test.ts
- [x] T012 [US1] Integration test for group creation and invitation flow in api/tests/integration/groups.test.ts

### Implementation for User Story 1

- [x] T013 [P] [US1] Update prisma/schema.prisma with GroupMember and Invitation models
- [x] T014 [US1] Implement income share calculation logic (Calculation on Read) with retroactive month-to-date handling in api/src/services/calculation.ts
- [x] T015 [US1] Create GroupService for CRUD and member management in api/src/services/group.ts
- [x] T016 [US1] Create InvitationService with email logic in api/src/services/invitation.ts
- [x] T017 [US1] Implement POST /api/groups and POST /api/invitations endpoints
- [x] T018 [US1] Create Group creation and Income setting features in frontend/src/features/groups/
- [x] T019 [US1] Implement Group Member list and Invitation UI in frontend/src/features/members/

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Budgeting & Spending (Priority: P1)

**Goal**: Define categories and log expenses against budgets

**Independent Test**: Category €400, expense €50 -> Verify remaining balance is €350

### Tests for User Story 2 (TDD) ⚠️

- [x] T020 [P] [US2] Unit test for category balance calculation in api/tests/logic/budget.test.ts
- [x] T021 [US2] Integration test for expense logging and RLS enforcement in api/tests/integration/expenses.test.ts

### Implementation for User Story 2

- [x] T022 [P] [US2] Add Category, CategoryMember, and Expense models to prisma/schema.prisma
- [x] T023 [US2] Implement BudgetService for balance tracking in api/src/services/budget.ts
- [x] T024 [US2] Implement ExpenseService for logging and validation in api/src/services/expense.ts
- [x] T025 [US2] Create Category management and Expense logging endpoints in api/src/ (Verify permanent/non-soft deletions)
- [x] T026 [US2] Implement Dashboard Summary widget in frontend/src/widgets/dashboard/
- [x] T027 [US2] Create Category list and Expense entry UI in frontend/src/features/budget/

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Savings Goals (Priority: P2)

**Goal**: Calculate proportional contributions for future savings targets

**Independent Test**: €1200 goal in 6 months -> Verify members are asked to save €200/month divided by share

### Tests for User Story 3 (TDD) ⚠️

- [x] T028 [P] [US3] Unit test for savings goal projected dates and overrides in api/tests/logic/savings.test.ts

### Implementation for User Story 3

- [x] T029 [P] [US3] Add SavingsGoal and SavingsGoalContribution models to prisma/schema.prisma
- [x] T030 [US3] Implement SavingsService with dynamic deadline logic in api/src/services/savings.ts
- [x] T031 [US3] Create Savings Goal CRUD and override endpoints in api/src/
- [x] T032 [US3] Implement Savings Goal widget in frontend/src/features/savings/

**Checkpoint**: User Stories 1, 2, and 3 should now be independently functional

---

## Phase 6: User Story 4 - Budget Transfers & Archiving (Priority: P2)

**Goal**: Transfer quota between members and archive past expenses

**Independent Test**: Transfer €50 from A to B -> Verify personal balances update

### Tests for User Story 4 (TDD) ⚠️

- [x] T033 [P] [US4] Unit test for Budget Quota transfer logic in api/tests/logic/transfers.test.ts
- [x] T034 [US4] Integration test for owner-only archiving in api/tests/integration/archive.test.ts

### Implementation for User Story 4

- [x] T035 [P] [US4] Add Transfer model and archive flags to prisma/schema.prisma
- [x] T036 [US4] Implement TransferService for Budget Quota adjustments in api/src/services/transfer.ts
- [x] T037 [US4] Implement ArchiveService for immutable historical records (preserves full detail) and reset spent_balance in api/src/services/archive.ts
- [x] T038 [US4] Create Transfer and Archive endpoints in api/src/
- [x] T039 [US4] Implement Transfer UI in frontend/src/features/transfers/
- [x] T040 [US4] Add Archive management for Owners in frontend/src/features/admin/
- [x] T045 [US1] Implement automatic ownership succession logic in api/src/services/group.ts
- [x] T046 [US4] Implement manual ownership transfer API and UI in api/src/features/admin/

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T041 [P] Verify performance: <500ms for recalculations in production
- [ ] T042 [P] Final security audit of Supabase RLS policies
- [ ] T043 Update README.md and documentation with final implementation details
- [ ] T044 Run full quickstart.md validation to ensure clean environment setup
- [ ] T047 [SC-001] Manual QA: Perform timed walkthrough of Group Setup to verify <3 min flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - P1 stories (US1, US2) should be prioritized
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core - No story dependencies
- **User Story 2 (P1)**: Independent, but visually integrates with US1 percentages
- **User Story 3 (P2)**: Independent logic, depends on US1 shares
- **User Story 4 (P2)**: Independent, depends on US1 (owner status) and US2 (categories)

### Parallel Opportunities

- T003 and T004 (Config) can run in parallel
- T008 and T009 (API Infra) can run in parallel
- Once Phase 2 is done, US1 (T011-T019) and US2 (T020-T027) can theoretically start in parallel if needed
- T041 and T042 (Polish) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Setup + Foundational
2. Implement US1 (Groups & Income)
3. Implement US2 (Budgets & Expenses)
4. **VALIDATE**: Ensure core proportional spending works before adding Savings or Transfers.

### Incremental Delivery

1. Foundation -> Group/Income -> Budgeting -> Savings -> Transfers -> Archiving
2. Each step delivers a functional slice of the product.
