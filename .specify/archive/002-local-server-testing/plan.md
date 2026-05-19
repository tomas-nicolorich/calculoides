# Implementation Plan: Local Server Testing

**Branch**: `002-local-server-testing` | **Date**: 2024-05-22 | **Spec**: `/specs/002-local-server-testing/spec.md`
**Input**: Feature specification from `/specs/002-local-server-testing/spec.md`

## Summary

Implement a local development server capability for Calculoides that allows developers to run and test the application logic (including financial calculations) on their local machines without relying on Vercel deployments. The system will use the `CALC_ENVIRONMENT` variable to toggle between `local` and `remote` modes, while maintaining a connection to a remote or test Supabase instance for data persistence and authentication.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js (Vercel-compatible)
**Primary Dependencies**: Prisma, Supabase SDK, Zod, Turbo, Vitest
**Storage**: Supabase (PostgreSQL)
**Testing**: Vitest (Unit), Testing Library (Integration)
**Target Platform**: Local Node.js environment (simulating Vercel)
**Project Type**: Web application (Monorepo with `api`, `frontend`, `shared`)
**Performance Goals**: Local server start and Supabase connection < 10s (SC-001)
**Constraints**: Must use `CALC_ENVIRONMENT` (FR-001); MUST NOT use client-side for financial logic (Constitution III)
**Scale/Scope**: Development and test environments only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **III. Server-Side Financial Logic**: The local server MUST host the same calculation logic as the Vercel functions to ensure consistency. Client-side React must remain logic-free.
2. **IV. Database & ORM Standards**: Prisma must continue to be used for all data access in the local server. RLS must be respected.
3. **VII. Comprehensive Testing Discipline**: New tests are required for environment switching and local server reachability.
4. **X. Deployment & Environment Management**: `CALC_ENVIRONMENT` toggle implementation must align with standard environment management.

## Project Structure

### Documentation (this feature)

```text
specs/002-local-server-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
api/                     # Vercel functions / Local server logic
├── src/
│   ├── calculations/    # Financial logic (Constitution III)
│   ├── server.ts        # [NEW] Local server entry point
│   └── routes/          # API endpoints
shared/                  # Shared types and validation (Constitution I, VIII)
frontend/                # FSD-structured React app (Constitution II)
```

**Structure Decision**: Monorepo structure with a new entry point in `api/` to host functions locally via a simple Express or Node server.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
