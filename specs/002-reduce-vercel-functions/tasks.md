---
description: "Task list for consolidating Vercel Serverless Functions to stay within Hobby plan limits."
---

# Tasks: Reduce Vercel Serverless Functions

**Input**: Design documents from `/specs/002-reduce-vercel-functions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach is MANDATORY per global personal memory. Write failing tests before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 [FR-004, SC-004] Conduct baseline latency measurement for core endpoints via script in `api/scripts/benchmark.ts`
- [X] T002 [FR-003] Initialize function count validation script in `api/scripts/check-function-count.ts`
- [X] T003 [FR-003, SC-003] Add `build:api` script to `api/package.json` that includes the function count check
- [X] T004 [P] Configure Vitest for handler testing in `api/vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] [Constitution X] Update `api/src/server.ts` to recursively load routes from `api/src/handlers/`
- [X] T006 [P] [Constitution X] Update `api/src/server.ts` to support dynamic path segments
- [X] T007 [FR-002] Create shared dispatcher utility in `api/src/utils/dispatcher.ts` per contract
- [X] T026 [FR-007] Implement `vercel.json` rewrite support in `api/src/server.ts` (BUG-003)

**Checkpoint**: Foundation ready - local dev parity and routing infrastructure established.

---

## Phase 3: User Story 1 - Consolidate Related Functions (Priority: P1) 🎯 MVP

**Goal**: Merge related API endpoints into consolidated handlers (Groups, Transactions, Members) to stay within limits.

**Independent Test**: Verify that original logical endpoints return correct data when handled by consolidated functions.

### Tests for User Story 1 (MANDATORY TDD)

- [X] T008 [P] [US1, Constitution VII] Create unit tests for Groups consolidation in `api/tests/unit/handlers/groups.test.ts`
- [X] T009 [P] [US1, Constitution VII] Create unit tests for Transactions consolidation in `api/tests/unit/handlers/transactions.test.ts`
- [X] T010 [P] [US1, Constitution VII] Create unit tests for Members consolidation in `api/tests/unit/handlers/members.test.ts`

### Implementation for User Story 1

- [X] T011 [US1, Constitution I] Implement consolidated Groups handler in `api/src/handlers/groups.ts`
- [x] T012 [US1, Constitution I] Implement consolidated Transactions handler in `api/src/handlers/transactions.ts` (covers Expenses, Transfers, Categories, Savings, Summary)
- [x] T013 [US1, Constitution I] Implement consolidated Members handler in `api/src/handlers/members.ts` (covers List, Member Income)
- [X] T027 [US1, FR-008] Implement method-aware routing for /api/invitations in `api/src/handlers/groups.ts`
- [X] T028 [US1, SC-002] Verify GET /api/invitations returns correct Invitation array format
- [X] T029 [US1, SC-002] Add regression test for InvitationList data mapping in `api/tests/unit/handlers/groups.invitations.test.ts`

**Checkpoint**: User Story 1 complete - core consolidated handlers are written and tested.

---

## Phase 4: User Story 2 - Remove or Migrate Redundant Functions (Priority: P2)

**Goal**: Convert read-only endpoints to SSG and cleanup original individual handler files.

**Independent Test**: Confirm SSG data is generated at build time, original endpoints return 404, and frontend correctly consumes static data.

### Tests for User Story 2 (MANDATORY TDD)

- [X] T014 [US2] Create unit tests for Categories SSG script in `api/tests/unit/scripts/generate-categories.test.ts`

### Implementation for User Story 2

- [X] T015 [US2] Implement Categories SSG generation script in `api/scripts/generate-categories.ts`
- [X] T016 [US2] Update `frontend/package.json` build step to run Categories SSG script
- [X] T017 [US2, SC-002] Remove redundant logical endpoints from original implementation and verify 404s:
    - [X] Remove `api/groups.ts` (Original)
    - [X] Remove `api/archive.ts`
    - [X] Remove `api/groups/transfer-ownership.ts`
    - [X] Remove `api/transfer-ownership.ts` (Redundant)
    - [X] Remove `api/expenses.ts`
    - [X] Remove `api/transfers.ts`
    - [X] Remove `api/summary.ts`
    - [X] Remove `api/savings.ts`
    - [X] Remove `api/categories.ts`
    - [X] Remove `api/members.ts`
    - [X] Remove `api/members/[id]/income.ts`
    - [X] Remove `api/invitations.ts`
    - [X] Remove `api/respond-invitation.ts`
- [X] T018 [US2] Verify `api/groups/transfer-ownership.ts` logic is mapped accurately to the new Groups handler before deletion.

**Checkpoint**: Clean codebase with SSG configured and zero redundant functions.

---

## Phase 5: User Story 3 - Compliance Verification (Priority: P3)

**Goal**: Enforce the 12-function limit at build time to prevent future regressions.

**Independent Test**: Build fails when adding a dummy function that exceeds the 12-function limit.

### Implementation for User Story 3

- [X] T019 [US3, FR-001, FR-003] Finalize `api/scripts/check-function-count.ts` logic to match Vercel Hobby plan file-based function counting
- [X] T020 [US3, SC-003] Verify build failure by temporarily adding a 13th function file in `api/` and running `npm run build:api`
- [X] T021 [US3, FR-005] Update `vercel.json` rewrites to map logical routes to the consolidated handlers in `api/src/handlers/`

**Checkpoint**: Deployment safety gate active and infrastructure-as-code routing configured.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [X] T022 [SC-002] Run full Vitest suite in `api/` to ensure 100% functional parity
- [X] T022a [Constitution IX] Run `npm run lint` and `tsc --noEmit` to verify code quality and type safety
- [X] T023 [SC-004] Run post-consolidation latency benchmark using `api/scripts/benchmark.ts` to verify <20% degradation
- [X] T024 [SC-002, SC-005] Manual end-to-end verification of all endpoints via `npm run dev` as specified in `quickstart.md`
- [X] T025 [P] Update `api/README.md` with new consolidated routing structure and dispatcher documentation

---

**Bugfix**: 2026-05-21 — BUG-003 Added T026 and reopened T024 to address local 404 errors.
**Bugfix**: 2026-05-21 — BUG-004 Reopened T011, T021 and added T027, T028.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 Setup. BLOCKS all user story implementations due to routing requirements.
- **User Stories (Phase 3+)**: All depend on Phase 2. US1 is the MVP. US2 and US3 can proceed in parallel after US1.
- **Polish (Final Phase)**: Depends on all stories being complete.

### Parallel Opportunities

- T004 (Vitest config) can run parallel to script setup.
- T005, T006 (Server updates) can run in parallel.
- T008, T009, T010 (Tests for handlers) can run in parallel once Foundation is complete.
- T011, T012, T013 (Handler implementations) can run in parallel.

---

## Parallel Example: User Story 1

```powershell
# Launch all handler tests for User Story 1 together:
# Terminal 1
npm run test api/tests/unit/handlers/groups.test.ts
# Terminal 2
npm run test api/tests/unit/handlers/transactions.test.ts
# Terminal 3
npm run test api/tests/unit/handlers/members.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Setup + Foundation).
2. Implement US1: Consolidated handlers.
3. **VALIDATE**: Run tests T008-T010 and verify behavior parity.

### Incremental Delivery

1. Foundation → Routing ready.
2. US1 → Core reduction achieved (MVP).
3. US2 → Cleanup and SSG optimization.
4. US3 → Vercel config mapping and limit enforcement.
5. Polish → Performance validation.
