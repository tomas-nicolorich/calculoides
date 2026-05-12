<!--
Sync Impact Report:
- Version change: N/A → 1.0.0
- List of modified principles: (Initial principles established based on user input)
  - I. TypeScript Integrity
  - II. Frontend Architecture (FSD)
  - III. Server-Side Financial Logic
  - IV. Database & ORM Standards
  - V. Authentication & Session Management
  - VI. Strict Multi-tenancy
  - VII. Comprehensive Testing Discipline
  - VIII. Schema Validation
  - IX. Code Quality Standards
  - X. Deployment & Environment Management
- Added sections: Core Principles, Governance
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
Strict TypeScript throughout. No `any`, no type assertions without justification in a comment. All shared domain types live in a dedicated types module and are imported, never redeclared.

### II. Frontend Architecture (FSD)
Use Feature-Sliced Design (FSD) as the frontend architecture. Layers from bottom to top: shared -> entities -> features -> widgets -> pages -> app. No upward imports. Business logic stays in features and entities, never in pages or widgets.

### III. Server-Side Financial Logic
All percentage-based and monetary calculations are performed in Vercel functions - never in client-side React code. The UI renders results only; it does not own calculation logic.

### IV. Database & ORM Standards
Prisma is the only ORM. No raw SQL queries except in explicit migration files. Row-level Security is enabled on every Supabase table. All data access respects RLS policies; the service role key is never exposed to the client.

### V. Authentication & Session Management
Supabase Auth only. No alternative auth mechanisms. All routes that access user or group data require an authenticated session.

### VI. Strict Multi-tenancy
Every query must be scoped to the authenticated user's group membership. No cross-group data leakage is acceptable.

### VII. Comprehensive Testing Discipline
Unit tests with Vitest for all calculation logic, custom hooks, and utility functions. Integration tests with Testing Library for user-facing features. Tests are colocated with the module they test. No feature is considered done without test coverage for its happy path and primary error path.

### VIII. Schema Validation
Zod for all form and API response validation. Schema definitions live alongside their types.

### IX. Code Quality Standards
ESLint with typescript-eslint strict ruleset. Prettier for formatting. No linter warnings are acceptable in committed code.

### X. Deployment & Environment Management
Vercel for all environments. Environment variables are managed in the Vercel dashboard, not committed. Preview deployments are active for all PRs.

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

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
