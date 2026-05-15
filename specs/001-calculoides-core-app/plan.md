# Implementation Plan: Calculoides Core App

**Branch**: `001-calculoides-core-app` | **Date**: 2026-05-12 | **Spec**: [specs/001-calculoides-core-app/spec.md](specs/001-calculoides-core-app/spec.md)
**Input**: Feature specification from `/specs/001-calculoides-core-app/spec.md`

## Summary

Calculoides is a shared household budget management platform designed to automate proportional expense sharing based on individual income. Users organize into groups, set their group-specific incomes, and manage shared categories (Rent, Groceries, etc.). The core differentiator is the automated calculation of personal "quotas" derived from group income percentages.

The technical approach leverages a modern, type-safe stack:
- **Frontend**: React (Vite) with TypeScript, styled with Tailwind CSS and Shadcn/UI, following Feature-Sliced Design (FSD). Uses React Router for navigation and protected routes.
- **Backend/Logic**: Vercel Serverless Functions for all financial computations (income percentages, savings projections) to ensure accuracy and central control.
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
- **Constraints**: Server-side financial calculations only, session-only auth (no localStorage), Supabase RLS enforcement, and cross-directory environment variable synchronization via Vite envDir. Proxy configuration MUST use Vite's `loadEnv` utility to ensure environment variables are available within `defineConfig`. Backend dev servers (Vercel) MUST be synchronized with the frontend proxy port (3001). The API client MUST dynamically retrieve the JWT from the Supabase Auth session for every request to comply with the no-localStorage constraint. Backend-to-Supabase communication MUST support SSL certificate verification overrides for local development (e.g., `SELF_SIGNED_CERT_IN_CHAIN` handling). Implementation MUST include robust state transitions for terminal resolution in the AuthProvider to prevent persistent loading states. RLS policies MUST be audited to ensure group-wide visibility of members for peer identification and to allow group owners to modify income values for any member within their group. Frontend components MUST strictly prioritize the `User.name` property for display over technical identifiers like ID or email. **Expense logging MUST resolve the `GroupMember` ID for the payer from the authenticated user's session and the target group (BUG-015). Category creation MUST handle many-to-many relationship management for optional member subsets (BUG-017). The implementation MUST ensure that all non-nullable fields are correctly populated and that ID types are consistent between the Prisma schema and database migrations to prevent null constraint violations (BUG-018). The category view MUST provide a detailed per-member breakdown of proportional shares, current spending, and remaining balance (BUG-019). Invitations MUST be dispatched via Resend and include a unique, secure join link pointing to `/invite/:token` (BUG-021).**

**Bugfix**: 2026-05-15 — [BUG-020] Updated from bugfix patch: Mandated implementation of interactive savings goal contribution overrides and variance display.
**Bugfix**: 2026-05-15 — [BUG-021] Updated from bugfix patch: Added Resend integration and secure join link strategy for invitations.

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
**Bugfix**: 2026-05-14 — [BUG-004] Updated from bugfix patch: Added requirement for backend port synchronization (3001).
**Bugfix**: 2026-05-14 — [BUG-005] Updated from bugfix patch: Mandated dynamic JWT retrieval for API client.
**Bugfix**: 2026-05-14 — [BUG-006] Updated from bugfix patch: Added SSL verification override requirement for local development.
**Bugfix**: 2026-05-14 — [BUG-007] Updated from bugfix patch: Added requirement for terminal state handling in auth initialization.
**Bugfix**: 2026-05-14 — [BUG-008] Updated from bugfix patch: Mandated alignment of Prisma schema relation names with data-model.md (singular naming for to-one relations).
**Bugfix**: 2026-05-14 — [BUG-009] Updated from bugfix patch: Added requirement to audit RLS and listing logic for category visibility.
**Bugfix**: 2026-05-14 — [BUG-010] Updated from bugfix patch: Added requirement for RLS and state sync audit for savings goals.
**Bugfix**: 2026-05-14 — [BUG-011] Updated from bugfix patch: Added requirement to audit RLS for group_members to ensure group-wide visibility and verify frontend ownership propagation.
**Bugfix**: 2026-05-15 — [BUG-012] Updated from bugfix patch: Mandated use of `z.coerce.date()` for all API date inputs.
**Bugfix**: 2026-05-15 — [BUG-013] Updated from bugfix patch: Mandated update to RLS policies to allow group owners to modify income values for any group member.
**Bugfix**: 2026-05-15 — [BUG-014] Updated from bugfix patch: Mandated that frontend components strictly use the `User.name` property for display.
**Bugfix**: 2026-05-15 — BUG-015 Updated with GroupMember resolution requirement for expense logging.
**Bugfix**: 2026-05-15 — [BUG-016] Updated with InvitationStatus enum requirement for Prisma schema.
**Bugfix**: 2026-05-15 — [BUG-017] Updated from bugfix patch: Added requirement for many-to-many member selection in category creation.
**Bugfix**: 2026-05-15 — [BUG-020] Updated from bugfix patch: Mandated implementation of interactive savings goal contribution overrides and variance display.
