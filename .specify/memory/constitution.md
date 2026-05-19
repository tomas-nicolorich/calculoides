<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- List of modified principles:
  - I. TypeScript Integrity: Added guidance on service implementation (objects vs classes).
  - III. Server-Side Financial Logic: Added "Calculation on Read" and "Remainder Absorption" patterns for accuracy.
  - IV. Database & ORM Standards: Mandated singular Prisma model naming and optimized RLS lookup patterns.
  - VII. Comprehensive Testing Discipline: Integrated CALC_ENVIRONMENT for high-fidelity local testing.
  - IX. Code Quality Standards: Formalized zero-tolerance for eslint errors and nullish coalescing preference.
  - X. Deployment & Environment Management: Formalized local server logic for environment simulation.
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - plan-template.md: ✅ Updated (verified dynamic gates)
  - spec-template.md: ✅ Updated (no changes needed)
  - tasks-template.md: ✅ Updated (no changes needed)
- Follow-up TODOs: None
-->

# Calculoides Constitution

## Core Principles

### I. TypeScript Integrity
Strict TypeScript throughout. No `any`, no type assertions without justification in a comment. All shared domain types live in a dedicated types module and are imported, never redeclared. **Service logic in the API must be implemented as exported constant objects instead of classes to align with functional patterns and reduce boilerplate.**

### II. Frontend Architecture (FSD)
Use Feature-Sliced Design (FSD) as the frontend architecture. Layers from bottom to top: shared -> entities -> features -> widgets -> pages -> app. No upward imports. Business logic stays in features and entities, never in pages or widgets.

### III. Server-Side Financial Logic
All percentage-based and monetary calculations are performed in Vercel functions - never in client-side React code. **Financial updates follow a "Calculation on Read" pattern to ensure retroactive correctness. Rounding discrepancies in proportional shares are handled via "Remainder Absorption," assigning the rounding difference to the member with the highest earner.**

### IV. Database & ORM Standards
Prisma is the only ORM. **All model and relation names must follow the singular naming convention (e.g., `prisma.group`, `prisma.category`).** No raw SQL queries except in explicit migration files. Row-level Security (RLS) is enabled on every Supabase table. **PostgreSQL functions with `SECURITY DEFINER` should be used to optimize membership lookups in RLS policies, avoiding recursive lookups.**

### V. Authentication & Session Management
Supabase Auth only. No alternative auth mechanisms. All routes that access user or group data require an authenticated session.

### VI. Strict Multi-tenancy
Every query must be scoped to the authenticated user's group membership. No cross-group data leakage is acceptable.

### VII. Comprehensive Testing Discipline
Unit tests with Vitest for all calculation logic, custom hooks, and utility functions. **Local development must support the `CALC_ENVIRONMENT` variable to toggle between `local` and `remote` server logic, ensuring high-fidelity testing of financial functions without deployment.** Integration tests with Testing Library for user-facing features.

### VIII. Schema Validation
Zod for all form and API response validation. Schema definitions live alongside their types.

### IX. Code Quality Standards
ESLint with typescript-eslint strict ruleset. Prettier for formatting. **No linter errors or warnings are acceptable in committed code. Prefer nullish coalescing (`??`) over logical OR (`||`) for providing default values to avoid bugs with falsy values like `0` or `""`.**

### X. Deployment & Environment Management
Vercel for all environments. **A local development server (`api/src/server.ts`) must be maintained to simulate the Vercel environment for offline testing and rapid iteration.** Environment variables are managed in the Vercel dashboard, not committed.

## Governance

The constitution is the ultimate authority for project standards. All development must align with these principles to ensure consistency, security, and maintainability.

### Amendment Procedure

1. Amendments must be proposed via Pull Request with a clear rationale.
2. Changes require approval from core maintainers.
3. Upon approval, the constitution version is bumped according to semantic versioning.

### Compliance Review

1. All PRs and code reviews must verify compliance with the constitution.
2. Non-compliant code will not be merged.
3. Automated linting and testing must pass in all CI environments.

**Version**: 1.1.0 | **Ratified**: 2024-05-12 | **Last Amended**: 2024-05-22
