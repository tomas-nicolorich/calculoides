# Tasks: Local Server Testing

**Input**: Design documents from `/specs/002-local-server-testing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Update `api/package.json` to add `"start:api:local": "tsx src/server.ts"`
- [X] T002 Update root `package.json` to add `"dev:local": "turbo run dev:frontend start:api:local"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `api/src/server.ts` with basic Express, CORS, and `dotenv` configuration
- [X] T004 Implement `loadRoutes` utility in `api/src/server.ts` to dynamically register files in `api/*.ts` as Express routes
- [X] T005 [P] Add Vercel-compatible response polyfills (`status`, `json`) in `api/src/server.ts` to ensure handler compatibility
- [X] T006 [P] Implement Supabase connection health check in `api/src/server.ts` to provide 503 feedback if DB is unreachable (FR-005)

**Checkpoint**: Foundation ready - local server can start, register routes, and validate backend connectivity.

---

## Phase 3: User Story 1 - Local Development Mode (Priority: P1) 🎯 MVP

**Goal**: A developer can run Calculoides entirely on their local machine while maintaining a connection to Supabase.

**Independent Test**: Set `CALC_ENVIRONMENT=local`, launch the local server with `npm run start:api:local`, and verify that `curl http://localhost:3001/api/groups` (or similar) works with a valid Supabase token.

### Implementation for User Story 1

- [X] T007 [US1] Implement route handler logic in `api/src/server.ts` to import default exports from `api/*.ts` and pass `req`, `res`
- [X] T008 [US1] Update `frontend/vite.config.ts` to add proxy configuration for `/api` pointing to `http://localhost:3001` when `process.env.CALC_ENVIRONMENT === 'local'`
- [X] T009 [US1] Add logic in `api/src/server.ts` to parse JSON bodies using `express.json()` to match Vercel behavior
- [X] T010 [US1] Verify local server reachability and proxying by running `npm run dev:local` and performing a login/data fetch in the UI

**Checkpoint**: User Story 1 is functional. The app can be used locally without Vercel.

---

## Phase 4: User Story 2 - Automated Local Testing (Priority: P2)

**Goal**: Run the test suite against a stable local server connected to a test Supabase instance.

**Independent Test**: Running `npm run test:local` and seeing all tests pass while using the local API server.

### Implementation for User Story 2

- [X] T011 [US2] Update root `package.json` to add `"test:local": "cross-env CALC_ENVIRONMENT=test-local turbo run test"`
- [X] T012 [US2] Create integration test `api/tests/server.integration.test.ts` that starts the local server and verifies a basic endpoint (e.g., `/api/groups`)
- [X] T013 [US2] Add error-path testing in `api/tests/server.integration.test.ts` to verify 503 response when Supabase is unreachable (Constitution VII)
- [X] T014 [US2] Update `api/src/server.ts` to handle `CALC_ENVIRONMENT=test-local` by loading `.env.test` if it exists (FR-002)

**Checkpoint**: All user stories should now be independently functional.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T015 [P] Clean up any console logs or debug statements in `api/src/server.ts`
- [X] T016 [P] Update `specs/002-local-server-testing/quickstart.md` with the `.env` vs `.env.test` logic and error response format
- [X] T017 Run full validation: `CALC_ENVIRONMENT=local npm run dev` and ensure no regression in `remote` mode

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001, T002.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion.
- **Polish (Final Phase)**: Depends on all user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of US2.
- **User Story 2 (P2)**: Depends on US1 logic being mostly present in `api/src/server.ts`.

### Parallel Opportunities

- T005 [P] can be worked on while T003 and T004 are being finalized.
- T013, T014, T015 [P] can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (T001-T002).
2. Complete Foundational (T003-T005).
3. Complete US1 (T006-T009).
4. **STOP and VALIDATE**: Test local development mode manually.

### Incremental Delivery

1. Setup + Foundation -> Server starts.
2. Add US1 -> Local dev works.
3. Add US2 -> Automated tests work.
