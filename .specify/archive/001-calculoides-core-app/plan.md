# Implementation Plan: Calculoides Core App

**Branch**: `001-calculoides-core-app` | **Date**: 2026-05-12 | **Spec**: [specs/001-calculoides-core-app/spec.md](specs/001-calculoides-core-app/spec.md)
**Input**: Feature specification from `/specs/001-calculoides-core-app/spec.md`

## Summary

Calculoides is a shared household budget management platform designed to automate proportional expense sharing based on individual income. Users organize into groups, set their group-specific incomes, and manage shared categories (Rent, Groceries, etc.). The core differentiator is the automated calculation of personal "quotas" derived from group income percentages.

The technical approach leverages a modern, type-safe stack:
- **Frontend**: React (Vite) with TypeScript, styled with Tailwind CSS and Shadcn/UI, following Feature-Sliced Design (FSD). Uses React Router for navigation and protected routes.
- **Backend/Logic**: Vercel Serverless Functions for all financial computations (income percentages, savings projections) to ensure accuracy and central control. All percentage calculations MUST implement the "Remainder Absorption" strategy (round to 2 decimal places, highest income member absorbs 0.01 difference) and be exposed via a central utility to ensure consistency across Dashboard, Budget, and Savings views (BUG-027).
- **Data/Auth**: Supabase for authentication (session tokens only, no localStorage) and PostgreSQL database.
- **ORM**: Prisma for schema management and type-safe data access, with Supabase Row-Level Security (RLS) as the primary access control layer.
- **Validation/Testing**: Zod for runtime schema validation and Vitest for a comprehensive test suite (unit/integration). All date fields received via API MUST use `z.coerce.date()` to correctly handle ISO strings from JSON payloads.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (Strict Mode)  
**Primary Dependencies**: React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.0, Prisma 7.8.0, Zod 4.4.3, @supabase/supabase-js 2.105.4, resend 3.0.0
**Storage**: PostgreSQL (Supabase) via Prisma ORM (Schema is locked/final)
**Testing**: Vitest 4.1.6  
**Target Platform**: Web (Mobile-first, responsive) deployed on Vercel  
**Project Type**: Web Application (Monorepo-style structure)  
**Performance Goals**: <500ms for recalculations/UI updates, <200ms API response time (p95)  
- **Constraints**: Server-side financial calculations only, session-only auth (no localStorage), Supabase RLS enforcement, and cross-directory environment variable synchronization via Vite envDir. The project MUST maintain zero lint errors, with an absolute prohibition on the `any` type in both implementation and test code to ensure type-safety (BUG-038). Proxy configuration MUST use Vite's `loadEnv` utility to ensure environment variables are available within `defineConfig`. Backend dev servers (Vercel) MUST be synchronized with the frontend proxy port (3001). The API client MUST dynamically retrieve the JWT from the Supabase Auth session for every request to comply with the no-localStorage constraint. Backend-to-Supabase communication MUST support SSL certificate verification overrides for local development (e.g., `SELF_SIGNED_CERT_IN_CHAIN` handling). Implementation MUST include robust state transitions for terminal resolution in the AuthProvider to prevent persistent loading states. RLS policies MUST be audited to ensure group-wide visibility of members for peer identification and to allow group owners to modify income values for any member within their group. Frontend components MUST strictly prioritize the `User.name` property for display over technical identifiers like ID or email. **Expense logging MUST resolve the `GroupMember` ID for the payer from the authenticated user's session and the target group (BUG-015). Category creation MUST handle many-to-many relationship management for optional member subsets (BUG-017). The implementation MUST ensure that all non-nullable fields are correctly populated and that ID types are consistent between the Prisma schema and database migrations to prevent null constraint violations (BUG-018). The category view MUST provide a detailed per-member breakdown of proportional shares, current spending, and remaining balance (BUG-019). Invitations MUST be dispatched via Resend and include a unique, secure join link pointing to `/invite/:token` (BUG-021). Savings goal contribution overrides MUST include explicit existence checks for goal and member IDs to prevent Prisma foreign key violations (BUG-022). Implementation MUST provide a visible expense history through a dedicated `ExpenseList` widget on the dashboard and per-category history views supported by a `GET /api/expenses` endpoint (BUG-025).**

**Bugfix**: 2026-05-15 — [BUG-020] Updated from bugfix patch: Mandated implementation of interactive savings goal contribution overrides and variance display.
**Bugfix**: 2026-06-03 — [BUG-035] Updated from bugfix patch: Mandated fix for Epoch date (1/1/1970) in savings goal projections.
**Bugfix**: 2026-06-03 — [BUG-036] Updated from bugfix patch: Mandated fix for missing startingAmount when 0 and null projection values in /savings.
**Bugfix**: 2026-05-15 — [BUG-021] Updated from bugfix patch: Added Resend integration and secure join link strategy for invitations.
**Bugfix**: 2026-05-15 — [BUG-022] Updated from bugfix patch: Mandated explicit ID validation for savings goal contribution overrides.
**Bugfix**: 2026-05-15 — [BUG-023] Updated from bugfix patch: Mandated consistent user name display in savings goals implementation.
**Bugfix**: 2026-05-15 — [BUG-024] Updated from bugfix patch: Mandated audit of prisma/schema.prisma to ensure primary key UUID defaults and remove incorrect defaults from foreign keys.
**Bugfix**: 2026-05-25 — [BUG-025] Updated from bugfix patch: Mandated implementation of expense history visibility and API endpoint.
**Bugfix**: 2026-05-26 — [BUG-026] Updated from bugfix patch: Mandated implementation of explicit visual feedback and terminal resolution in savings goal overrides.
**Bugfix**: 2026-05-27 — [BUG-027] Updated from bugfix patch: Mandated consistent percentage rounding across all dashboard and category views.
**Bugfix**: 2026-05-28 — [BUG-028] Updated from bugfix patch: Mandated comprehensive audit and update of financial logic to ensure Remainder Absorption is applied consistently across all proportional calculations.
**Bugfix**: 2026-05-28 — [BUG-029] Updated from bugfix patch: Mandated dynamic recalculation of proportional shares for categories restricted to member subsets.
**Bugfix**: 2026-05-29 — [BUG-030] Updated from bugfix patch: Addressed implementation drift where CategoryExpenseList import was missing in DashboardPage.tsx.
**Bugfix**: 2026-05-30 — [BUG-031] Updated from bugfix patch: Mandated implementation of mandatory state synchronization and cache invalidation in savings goal contribution overrides.
**Bugfix**: 2026-05-31 — [BUG-032] Updated from bugfix patch: Re-mandated audit and fix of state synchronization logic for savings goals.
**Bugfix**: 2026-06-01 — [BUG-033] Updated from bugfix patch: Mandated support for starting amount in savings goals.
**Bugfix**: 2026-06-02 — [BUG-034] Updated from bugfix patch: Mandated implementation of UI state synchronization and automated reactivity tests for savings goals.
**Bugfix**: 2026-06-03 — [BUG-035] Updated from bugfix patch: Mandated fix for Epoch date (1/1/1970) in savings goal projections.
**Bugfix**: 2026-06-03 — [BUG-036] Updated from bugfix patch: Mandated fix for missing startingAmount when 0 and null projection values in /savings.
**Bugfix**: 2026-06-04 — [BUG-037] Updated from bugfix patch: Mandated fix for missing `update` method in `apiClient.savings`.
**Bugfix**: 2026-06-05 — [BUG-038] Updated from bugfix patch: Mandated zero-lint-error status and prohibition of `any` type across the codebase.
**Bugfix**: 2026-06-06 — [BUG-039] Updated from bugfix patch: Mandated terminal loading state resolution for savings goals.

**Bugfix**: 2026-05-15 — [BUG-019] Updated from bugfix patch: Added requirement for detailed per-member breakdown in category views.
**Bugfix**: 2026-05-15 — [BUG-018] Updated from bugfix patch: Mandated ID type consistency and population of non-nullable fields.
## Constitution Check
...
| X. Deployment & Environment Management | ✅ | Vercel specified with preview environments. |

## Project Structure
...
**Structure Decision**: A split monorepo structure with `frontend/` (FSD) and `api/` (Vercel serverless functions) to enforce the separation of UI and financial logic. `prisma/` at root for shared schema.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

**Bugfix**: 2026-05-13 — [BUG-001] Added React Router and Frontend Auth UI to technical context.
**Bugfix**: 2026-05-14 — [BUG-002] Updated with environment variable synchronization requirement.
**Bugfix**: 2026-05-14 — [BUG-003] Updated from bugfix patch: Added requirement for Vite `loadEnv` in proxy configuration.
**Bugfix**: 2026-05-14 — [BUG-004] Updated from bugfix patch: Added requirement for port synchronization (3001) for backend dev servers.
**Bugfix**: 2026-05-14 — [BUG-005] Updated from bugfix patch: Mandated dynamic JWT retrieval for API client.
**Bugfix**: 2026-05-14 — [BUG-006] Updated from bugfix patch: Added SSL verification override requirement for local development.
**Bugfix**: 2026-05-14 — [BUG-007] Updated from bugfix patch: Added requirement for terminal state handling in auth initialization.
**Bugfix**: 2026-05-14 — [BUG-008] Updated from bugfix patch: Mandated alignment of Prisma schema relation names with data-model.md (singular naming for to-one relations).
**Bugfix**: 2026-05-14 — [BUG-009] Updated from bugfix patch: Added requirement to audit RLS and listing logic for category visibility.
**Bugfix**: 2026-05-14 — [BUG-010] Updated from bugfix patch: Added requirement for RLS and state sync audit for savings goals.
**Bugfix**: 2026-05-14 — [BUG-011] Updated from bugfix patch: Added requirement to audit RLS for group_members to ensure group-wide visibility and verify frontend ownership propagation.
**Bugfix**: 2026-05-15 — [BUG-012] Updated from bugfix patch: Mandated use of `z.coerce.date()` for all API date inputs.
**Bugfix**: 2026-05-15 — [BUG-013] Updated from bugfix patch: Mandated update to RLS policies to allow group owners to modify income values for any group member.
**Bugfix**: 2026-05-15 — [BUG-014] Mandated that frontend components strictly use the `User.name` property for display.
**Bugfix**: 2026-05-15 — [BUG-015] Updated with GroupMember resolution requirement for expense logging.
**Bugfix**: 2026-05-15 — [BUG-016] Updated with InvitationStatus enum requirement for Prisma schema.
**Bugfix**: 2026-05-15 — [BUG-017] Updated from bugfix patch: Added requirement for many-to-many member selection in category creation.
**Bugfix**: 2026-05-15 — [BUG-020] Updated from bugfix patch: Mandated implementation of interactive savings goal contribution overrides and variance display.
