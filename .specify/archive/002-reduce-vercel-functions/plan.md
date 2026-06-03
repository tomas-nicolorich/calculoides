# Plan: Reduce Vercel Serverless Functions

## Goal
Consolidate API endpoints to stay within Vercel Hobby plan limit (12 functions) while maintaining 100% functional parity and enforcing compliance.

## Tasks

### Phase 1: Setup & Enforcement (Priority: P1) - COMPLETED
- [x] T001: Implement function count enforcement script in `api/scripts/check-function-count.ts`.
- [x] T002: Add `build:api` script to `api/package.json` that runs the enforcement script.
- [x] T003: Verify that `npm run build:api` fails currently (13 functions > 12 limit).

### Phase 2: Foundational Infrastructure (Priority: P1) - COMPLETED
- [x] T004: Create unit tests for dispatcher utility in `api/tests/unit/utils/dispatcher.test.ts`.
- [x] T005: Create integration tests for recursive route loading in `api/tests/integration/server.test.ts`.
- [x] T006: Implement action-based dispatcher in `api/src/utils/dispatcher.ts`.
- [x] T007: Update `api/src/server.ts` to recursively load handlers and map dynamic segments.
- [ ] T026: Implement `vercel.json` rewrite support in `api/src/server.ts` (BUG-003).

### Phase 3: User Story 1 - Consolidation (Priority: P1) - IN PROGRESS
- [x] T008: Create unit tests for consolidated Groups handler in `api/tests/unit/handlers/groups.test.ts`.
- [x] T009: Create unit tests for consolidated Transactions handler in `api/tests/unit/handlers/transactions.test.ts`.
- [x] T010: Create unit tests for consolidated Members handler in `api/tests/unit/handlers/members.test.ts`.
- [ ] T011: Implement consolidated Groups handler in `api/groups.ts` (reopened — BUG-004).
- [x] T012: Implement consolidated Transactions handler in `api/transactions.ts`.
- [x] T013: Implement consolidated Members handler in `api/members.ts`.
- [ ] T027: Implement method-aware routing for /api/invitations in Groups handler (BUG-004).

### Phase 4: User Story 2 - Redundant Removal (Priority: P2) - COMPLETED
- [x] T014: Create unit tests for Categories SSG script in `api/tests/unit/scripts/generate-categories.test.ts`.
- [x] T015: Implement Categories SSG generation script in `api/scripts/generate-categories.ts`.
- [x] T016: Update `frontend/package.json` build step to run Categories SSG script.
- [x] T017: Remove redundant logical endpoints from root `api/` and subdirectories.

### Phase 5: User Story 3 - Compliance (Priority: P3) - IN PROGRESS
- [x] T019: Finalize `api/scripts/check-function-count.ts` logic for file-based counting.
- [x] T020: Verify build failure gate by temporarily adding a 13th function.
- [ ] T021: Update `vercel.json` rewrites to map logical routes to consolidated handlers (reopened — BUG-004).

### Phase 6: Verification & Polish (Priority: P1) - IN PROGRESS
- [x] T022: Run full Vitest suite in `api/` to ensure 100% functional parity.
- [x] T023: Run post-consolidation latency benchmark using `api/scripts/benchmark.ts`.
- [ ] T024: Manual end-to-end verification of all endpoints via `npm run dev` (reopened — BUG-003).
- [ ] T028: Verify GET /api/invitations returns correct Invitation array format (BUG-004).
- [x] T025: Update `api/README.md` to document new architecture.

## Success Criteria
1. [x] Physical serverless function count <= 3.
2. [x] All 49 existing tests passing.
3. [x] `npm run build:api` passes.
4. [x] Latency degradation < 20% (verified: absolute diff < 2ms).
5. [x] Zero lint and TSC errors.
6. [ ] Local endpoint parity (SC-005).

**Bugfix**: 2026-05-21 — BUG-003 Updated Phase 2 and Phase 6 to include local rewrite support.
**Bugfix**: 2026-05-21 — BUG-004 Updated Phase 3, Phase 5, and Phase 6 for method-aware routing.
**Bugfix**: 2026-05-21 — BUG-005 Reopened Phase 3 and added T029 for regression testing.
