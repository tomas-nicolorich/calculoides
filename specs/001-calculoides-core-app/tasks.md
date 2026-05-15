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

- [x] T005 Initialize Prisma schema with base User and Group models in prisma/schema.prisma (reopened — BUG-008)
- [x] T006 Setup Supabase project and configure DATABASE_URL in .env
- [x] T007 Implement Supabase RLS base policies for multi-tenancy in prisma/migrations/ (reopened — BUG-011)
- [x] T008 [P] Setup API routing and error handling middleware in api/src/middleware/
- [x] T009 [P] Implement session-based authentication service in api/src/services/auth.ts (reopened — BUG-006)
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

- [x] T013 [P] [US1] Update prisma/schema.prisma with GroupMember and Invitation models (reopened — BUG-008, BUG-016)
- [x] T014 [US1] Implement income share calculation logic (Calculation on Read) with retroactive month-to-date handling in api/src/services/calculation.ts
- [x] T015 [US1] Create GroupService for CRUD and member management in api/src/services/group.ts
- [x] T016 [US1] Create InvitationService with email logic in api/src/services/invitation.ts (reopened — BUG-021)
- [x] T017 [US1] Implement POST /api/groups and POST /api/invitations endpoints
- [x] T018 [US1] Create Group creation and Income setting features in frontend/src/features/groups/
- [x] T019 [US1] Implement Group Member list and Invitation UI in frontend/src/features/members/ (reopened — BUG-011, BUG-014)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Budgeting & Spending (Priority: P1)

**Goal**: Define categories and log expenses against budgets

**Independent Test**: Category €400, expense €50 -> Verify remaining balance is €350

### Tests for User Story 2 (TDD) ⚠️

- [x] T020 [P] [US2] Unit test for category balance calculation in api/tests/logic/budget.test.ts
- [x] T021 [US2] Integration test for expense logging and RLS enforcement in api/tests/integration/expenses.test.ts (reopened — BUG-012)

### Implementation for User Story 2

- [x] T022 [P] [US2] Add Category, CategoryMember, and Expense models to prisma/schema.prisma
- [x] T023 [US2] Implement BudgetService for balance tracking in api/src/services/budget.ts (reopened — BUG-019)
- [x] T024 [US2] Implement ExpenseService for logging and validation in api/src/services/expense.ts (reopened — BUG-012, BUG-015, BUG-018)
- [x] T025 [US2] Create Category management and Expense logging endpoints in api/src/ (Verify permanent/non-soft deletions) (reopened — BUG-008, BUG-009, BUG-012, BUG-015, BUG-017, BUG-018)
- [x] T026 [US2] Implement Dashboard Summary widget in frontend/src/widgets/dashboard/ (reopened — BUG-014, BUG-019)
- [x] T027 [US2] Create Category list and Expense entry UI in frontend/src/features/budget/ (reopened — BUG-009, BUG-014, BUG-017, BUG-019)

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
- [x] T031 [US3] Create Savings Goal CRUD and override endpoints in api/src/ (reopened — BUG-020)
- [x] T032 [US3] Implement Savings Goal widget in frontend/src/features/savings/ (reopened — BUG-010, BUG-014, BUG-020)

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
- [x] T039 [US4] Implement Transfer UI in frontend/src/features/transfers/ (reopened — BUG-014)
- [x] T040 [US4] Add Archive management for Owners in frontend/src/features/admin/ (reopened — BUG-011)
- [x] T041 [US1] Implement automatic ownership succession logic in api/src/services/group.ts
- [x] T042 [US4] Implement manual ownership transfer API and UI in api/src/features/admin/

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Verify performance: <500ms for recalculations in production
- [x] T044 [P] Final security audit of Supabase RLS policies
- [x] T045 Update README.md and documentation with final implementation details
- [x] T046 Run full quickstart.md validation to ensure clean environment setup
- [x] T047 [SC-001] Manual QA: Perform timed walkthrough of Group Setup to verify <3 min flow
- [x] T048 [P] Setup React Router and basic routing structure in frontend/src/app/
- [x] T049 Create Auth feature (Login/Signup forms) in frontend/src/features/auth/ (reopened — BUG-002)
- [x] T050 Create Page components (Dashboard, Login, Settings) in frontend/src/pages/ (reopened — BUG-003)
- [x] T051 Implement Auth guarded routes and integrate features into pages (reopened — BUG-002, BUG-003, BUG-005, BUG-007)
- [x] T052 Configure Vite to load environment variables from the root directory (`envDir: '../'`) in frontend/vite.config.ts (reopened — BUG-003)
- [x] T053 Verify Supabase client initialization in AuthProvider.tsx with logs or tests (reopened — BUG-002, BUG-006)
- [x] T054 [P] [US5] Refactor `frontend/vite.config.ts` to use `loadEnv` for accessing environment variables
- [x] T055 Verify the API proxy is correctly forwarding requests to the backend server (defaulting to `http://localhost:3001`) (reopened — BUG-004)
- [x] T056 [P] [US5] Configure `vercel dev` to listen on port 3001 in `api/package.json`
- [x] T057 [US5] Update `quickstart.md` with consistent port instructions for `npm run dev` and `npm run dev:local`
- [x] T058 [P] [US5] Update `frontend/src/shared/api/client.ts` to dynamically retrieve and inject the Supabase session token into the `Authorization` header
- [x] T059 [US5] Add an integration test to verify that the `Authorization` header is present in outgoing requests after login
- [x] T060 [P] [US5] Implement SSL verification override or custom fetch options for Supabase client in development mode in api/src/services/auth.ts
- [x] T061 [US5] Add environment variable documentation for NODE_TLS_REJECT_UNAUTHORIZED or equivalent to quickstart.md
- [x] T062 [P] [US5] Implement robust state timeout/fallback in AuthProvider to ensure terminal state (BUG-007)
- [x] T063 [US5] Verify AuthGuard correctly handles delayed or failed session resolution (BUG-007)
- [x] T064 [P] Align prisma/schema.prisma relation names with data-model.md (singular naming for to-one relations) and regenerate Prisma client (BUG-008)
- [x] T065 [P] [US2] Audit and fix RLS policies for `categories` table to ensure group-wide visibility (BUG-009)
- [x] T066 [US2] Verify `BudgetService.listCategories` returns all categories for the group regardless of explicit membership (BUG-009)
- [x] T067 [P] [US3] Audit and fix RLS policies for `savings_goals` table to ensure visibility (BUG-010)
- [x] T068 [US3] Verify savings goal visibility and state synchronization in frontend (BUG-010)
- [x] T069 [P] [US1] Audit and fix RLS policies for `group_members` table to ensure visibility for all group members (BUG-011)
- [x] T070 [US1] Verify `Group` object hydration in frontend includes `ownerId` and `members` for proper Admin access (BUG-011)

- [x] T071 [P] [US2] Update shared/validation.ts to use z.coerce.date() for all API date inputs (BUG-012)
- [x] T072 [US2] Enhance integration tests to use ISO string dates in request payloads (BUG-012)
- [x] T073 [P] [US1] Update RLS policies for `group_members` to allow owners to update `income` for all group members (BUG-013)
- [x] T074 [US1] Update `GroupService` to allow owners to modify incomes of other members (BUG-013)
- [x] T075 [US1] Update Frontend Income setting UI to allow owners to edit other members' values (BUG-013)
- [x] T076 [P] [US1] Create a shared MemberName or UserDisplay component in frontend/src/shared/ui/ (BUG-014)
- [x] T077 [US1] Update API responses to ensure name is always included in member/user relations for hydration (BUG-014)
- [x] T078 [P] [US2] Implement GroupMember resolution logic in ExpenseService.logExpense to map Auth User ID to GroupMember ID (BUG-015) (reopened — BUG-018)
- [x] T079 [US2] Update Expense logging endpoint to fetch groupId from categoryId before logging (BUG-015) (reopened — BUG-018)

- [x] T080 [P] [US1] Create and apply database migration for InvitationStatus enum in calculoides schema (BUG-016)
- [x] T081 [US1] Verify invitation flow with InvitationStatus enum (BUG-016)
- [x] T082 [P] [US2] Update `BudgetService.createCategory` to handle nested `memberLinks` for optional member subsets in api/src/services/budget.ts (BUG-017)
- [x] T083 [US2] Implement multi-select member component in the Category creation form in frontend/src/features/budget/ (BUG-017)
- [x] T084 [US2] Verify and align ID types (UUID vs TEXT) between schema.prisma and migrations to resolve Null constraint violations (BUG-018)
- [x] T085 [US2] Update `BudgetService` to return per-member spending and quota breakdown for each category (BUG-019)
- [x] T086 [US2] Enhance Category card UI to display a list of members with their share, spent amount, and remaining balance (BUG-019)
- [x] T087 [US3] Implement interactive contribution overrides in `SavingsGoalList` UI (BUG-020)
- [x] T088 [US3] Display projected completion date variance and updated deadline in `SavingsGoalList` (BUG-020)
- [x] T089 [P] [US1] Integrate Resend SDK in `api/` and configure API keys in `.env` (BUG-021)
- [x] T090 [US1] Implement secure, single-use token generation for invitations in `InvitationService` (BUG-021)
- [x] T091 [US1] Implement HTML email template for group invitations and integrate with Resend (BUG-021)

**Status Update**: 2026-05-14 — Bugfix cycle completed. All bugs BUG-001 through BUG-011 resolved and verified. Final Prisma client regenerated and RLS policies updated.
**Status Update**: 2026-05-15 — BUG-012 patched. Reopened T021, T024, T025 and added T071, T072 for date validation fix.
**Status Update**: 2026-05-15 — BUG-013 patched. Added T073, T074, T075 for owner income modification permission.
**Status Update**: 2026-05-15 — BUG-014 patched. Reopened T019, T026, T027, T032, T039 and added T076, T077 for consistent user name display.
**Status Update**: 2026-05-15 — BUG-015 patched. Reopened T024, T025 and added T078, T079 for GroupMember resolution fix.
**Status Update**: 2026-05-15 — BUG-016 patched. Reopened T013 and added T080, T081 for database migration fix.
**Status Update**: 2026-05-15 — BUG-017 patched. Reopened T025, T027 and added T082, T083 for Category member selection fix.
**Status Update**: 2026-05-15 — BUG-018 patched. Reopened T024, T025, T078, T079 and added T084 for Null constraint violation fix.
**Status Update**: 2026-05-15 — BUG-019 patched. Reopened T023, T026, T027 and added T085, T086 for detailed category breakdown fix.
**Status Update**: 2026-05-15 — BUG-020 patched. Reopened T031, T032 and added T087, T088 for interactive savings goal overrides fix.
**Status Update**: 2026-05-15 — BUG-021 patched. Reopened T016 and added T089, T090, T091 for invitation email fix.
