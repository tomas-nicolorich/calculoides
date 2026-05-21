# Feature Specification: Reduce Vercel Serverless Functions

**Feature Branch**: `002-reduce-vercel-functions`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "reduce the number of vercel Serverless Functions to be no more than 12"

## Clarifications

### Session 2026-05-20

- Q: If a consolidated serverless function approaches the deployment size limit (e.g., 50MB), what is the preferred mitigation strategy? → A: Split into smaller groups.
- Q: If consolidating multiple endpoints into one function significantly increases cold start latency, what is the preferred fallback? → A: Accept the latency.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidate Related Functions (Priority: P1)

As a developer, I want to merge related API endpoints into a single serverless function so that I can stay within Vercel's Hobby plan limits while maintaining all site functionality.

**Why this priority**: This is the most effective way to reduce the function count without losing features. It directly addresses the primary constraint.

**Independent Test**: Identify two or more related functions, combine them into one with a routing mechanism, and verify that all original endpoints still work correctly.

**Acceptance Scenarios**:

1. **Given** multiple API routes (e.g., `/api/user/get`, `/api/user/update`), **When** they are merged into a single function (e.g., `/api/user/[...action]`), **Then** both `GET` and `POST` requests to the original logical paths return expected results.
2. **Given** a consolidated function, **When** it is deployed, **Then** Vercel counts it as only one serverless function.

---

### User Story 2 - Remove or Migrate Unused/Low-Impact Functions (Priority: P2)

As a developer, I want to identify functions that can be converted to static generation or removed if they are redundant, further reducing the total count.

**Why this priority**: This simplifies the codebase and ensures we are not wasting resources on unused logic.

**Independent Test**: Can be tested by deleting a function or converting it to a static prop fetcher and verifying the page still loads correctly.

**Acceptance Scenarios**:

1. **Given** a function that only fetches static data, **When** it is replaced by build-time data fetching (static generation), **Then** the function is removed from the Vercel deployment and the page remains functional.

---

### User Story 3 - Compliance Verification (Priority: P3)

As a maintainer, I want a way to verify that the total function count is 12 or fewer before a deployment is finalized.

**Why this priority**: Prevents future regressions where adding a new feature accidentally breaks the deployment limit.

**Independent Test**: Run a check during the build process that counts the generated functions.

**Acceptance Scenarios**:

1. **Given** a build output, **When** the number of serverless functions is 12 or fewer, **Then** the build passes.
2. **Given** a build output, **When** the number of serverless functions exceeds 12, **Then** the build fails with a descriptive error.

### Edge Cases

- **Function Size Limits**: If consolidated functions approach a **40MB bundle size threshold**, they will be split into smaller grouped functions. Priority for splitting will be given to the most complex sub-resource handler within that group.
- **Execution Time**: Execution times remain on a per-request basis, so consolidating multiple logical endpoints into one handler does not affect the timeout limits for individual requests.
- **Cold Starts**: If merging disparate logic paths into one function increases cold start times, we will accept the latency as a tradeoff for staying within limits, provided total request latency does not degrade by more than 20% (per SC-004).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST be configured to deploy no more than 12 serverless functions to Vercel (SC-001).
- **FR-002**: Related API routes MUST be consolidated into shared handler functions (e.g., using dynamic routing or a central dispatcher).
- **FR-003**: The build process MUST report the current number of serverless functions and fail if the count exceeds 12.
- **FR-004**: All public-facing API endpoints MUST maintain their original behavior and response format.
- **FR-005**: Infrastructure-as-Code (vercel.json) MUST be used to explicitly manage function grouping and route mapping.
- **FR-006**: Consolidated handlers MUST preserve "Calculation on Read" and "Remainder Absorption" patterns for all financial logic (Constitution III).
- **FR-007**: The local development server MUST achieve parity with Vercel's rewrite engine by correctly mapping logical paths defined in `vercel.json` to their consolidated handlers.
- **FR-008**: Consolidated handlers MUST support method-aware dispatching (GET/POST/PATCH/DELETE) when multiple logical endpoints are merged into a single action-based route.

### Key Entities *(include if feature involves data)*

- **Serverless Function**: A physical deployment unit in Vercel.
- **Logical Endpoint**: A URL path that the application exposes (e.g., `/api/v1/resource`).
- **Endpoint Inventory**: The list of existing logical endpoints that must maintain parity (see Research for baseline).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The total number of unique physical serverless functions deployed to Vercel is 12 or fewer.
- **SC-002**: 100% of existing application features remain functional after the reduction (zero regression).
- **SC-003**: Build and deployment to Vercel succeeds without "Serverless Function Limit Exceeded" errors.
- **SC-004**: No logical endpoint experiences a performance degradation (latency increase) of more than 20% due to consolidation.
- **SC-005**: 100% of logical endpoints defined in `vercel.json` rewrites are accessible and functional in the local development environment (`npm run dev`).

## Assumptions

- The project is currently exceeding the Vercel Hobby plan limit of 12 serverless functions.
- The 12-function limit refers to the total number of unique serverless functions deployed, not the number of requests or logical routes (which can be multiplexed).
- The team has access to the Vercel dashboard or CLI to verify the count.
- External dependencies (databases, third-party APIs) are not affected by this consolidation.

**Bugfix**: 2026-05-21 — BUG-003 Added FR-007 and SC-005 to ensure local development environment parity with Vercel rewrites.
**Bugfix**: 2026-05-21 — BUG-004 Added FR-008 for method-aware dispatching to fix InvitationList TypeError.
**Bugfix**: 2026-05-21 — BUG-005 Clarified FR-008 to explicitly include response schema validation for multi-method endpoints.
