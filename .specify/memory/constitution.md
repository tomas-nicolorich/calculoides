<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.2.0
- List of modified principles:
  - I. TypeScript Integrity: Clarified const-object vs plain-function split; added cross-package import rule.
  - II. Frontend Architecture (FSD): Removed widgets layer; added entities layer with explicit domain object list.
  - III. Server-Side Financial Logic: Added Savings Goal, Archive, and Settlement definitions; clarified Calculation on Read and future caching constraints.
  - IV. Database & ORM Standards: Added RLS verification gate (per-migration policy + security advisor check).
  - VII. Comprehensive Testing Discipline: Removed CALC_ENVIRONMENT reference; sharpened to unit + integration test split.
  - X. Deployment & Environment Management: Removed local server mandate (was a temporary workaround).
- Added sections:
  - XI. Monorepo Package Boundaries
- Removed sections: None
- Follow-up TODOs:
  - ArchiveService does not yet calculate or persist Settlement — gap between domain spec and implementation.
  - shared/index.ts does not export rounding utilities — violates the new cross-package import rule (Principle I).
  - frontend/src/entities/ layer is missing — should be introduced per Principle II.
-->

# Calculoides Constitution

## Core Principles

### I. TypeScript Integrity
Strict TypeScript throughout. No `any`, no type assertions without justification in a comment. All shared domain types live in a dedicated types module and are imported, never redeclared. **Data-access services in the API must be implemented as exported constant objects (e.g. `export const GroupService = { ... }`), never as classes. Pure computation logic must be implemented as plain exported functions, never grouped into service objects or classes. Cross-package imports must always go through the workspace package's public export (e.g. `import { ... } from "shared"`); importing internal paths of another package via relative paths (e.g. `"../../../shared/logic/rounding"`) is forbidden. Anything needed across packages must be exported from the package's `index.ts`.**

### II. Frontend Architecture (FSD)
Use Feature-Sliced Design (FSD) as the frontend architecture. Layers from bottom to top: shared -> entities -> features -> pages -> app. No upward imports. Business logic stays in features and entities, never in pages. The `entities/` layer owns domain object types, API calls, and state for core domain objects (Group, Member, Category, Expense, Transfer, SavingsGoal) — these must not be duplicated inside feature slices.

### III. Server-Side Financial Logic
All percentage-based and monetary calculations are performed in Vercel functions - never in client-side React code. **Financial updates follow a "Calculation on Read" pattern: results are always derived from raw source data (income, expenses, transfers, contributions) on every request — no pre-computed columns are stored. This ensures retroactive correctness when income or budgets change. Rounding discrepancies in proportional shares are handled via "Remainder Absorption," assigning the rounding difference to the member with the highest income share. A caching layer may be introduced in the future when group or goal scale makes on-read computation measurably slow, but any cache must be invalidated on income, expense, transfer, or contribution changes — never silently stale. **Settlement is the sole exception to Calculation on Read: because an archived period is frozen and immutable, Settlement snapshots (net balance per member = total paid minus Budget Quota) are calculated once at archive time and stored. They must never be recalculated after the archive is committed.****

This applies to both budget categories and Savings Goals. A **Savings Goal** belongs to a Group and tracks a `targetAmount`, `startingAmount`, and `targetDate`. Monthly contributions are distributed proportionally by income share using Remainder Absorption. Members may override their contribution with a custom amount; the projected completion date is recalculated from the actual (post-override) totals on read.

**Archive** is a domain operation exclusively available to the Group Owner. It closes the current period by moving all expenses to an immutable historical record, calculating the final **Settlement** (net balance per member: total paid minus Budget Quota), and resetting all spent balances to zero. Archived records cannot be modified. Transfers do not persist across an Archive boundary — quota responsibilities reset to default income-proportional shares in the next period.

### IV. Database & ORM Standards
Prisma is the only ORM. **All model and relation names must follow the singular naming convention (e.g., `prisma.group`, `prisma.category`).** No raw SQL queries except in explicit migration files. Row-level Security (RLS) is enabled on every Supabase table. **PostgreSQL functions with `SECURITY DEFINER` should be used to optimize membership lookups in RLS policies, avoiding recursive lookups. Every migration that creates a new table must include RLS policies in the same migration file — a table without RLS is never acceptable in any environment. The Supabase security advisor (`get_advisors` with type `security`) must be run after any schema change and all findings resolved before merging.**

### V. Authentication & Session Management
Supabase Auth only. No alternative auth mechanisms. All routes that access user or group data require an authenticated session.

### VI. Strict Multi-tenancy
Every query must be scoped to the authenticated user's group membership. No cross-group data leakage is acceptable.

### VII. Comprehensive Testing Discipline
Unit tests with Vitest for all calculation logic, custom hooks, and utility functions. **Financial calculation logic must be testable without deployment — unit tests cover pure calculation functions directly, integration tests hit a real database.** Integration tests with Testing Library for user-facing features.

### VIII. Schema Validation
Zod for all form and API response validation. Schema definitions live alongside their types.

### IX. Code Quality Standards
ESLint with typescript-eslint strict ruleset. Prettier for formatting. **No linter errors or warnings are acceptable in committed code. Prefer nullish coalescing (`??`) over logical OR (`||`) for providing default values to avoid bugs with falsy values like `0` or `""`.**

### X. Deployment & Environment Management
Vercel for all environments. Environment variables are managed in the Vercel dashboard, not committed.

### XI. Monorepo Package Boundaries
The monorepo contains three packages with fixed responsibilities: **`shared/`** owns domain types, Zod validation schemas, and pure utility logic used across packages. **`api/`** owns all server-side logic, database access, and Vercel function handlers. **`frontend/`** owns all UI code. Dependency direction is strictly one-way: `frontend` and `api` may import from `shared`; `shared` must never import from `api` or `frontend`; `frontend` and `api` must never import from each other.

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
