# Changelog

## Merged Features Log

### Local Server Testing — 2024-05-23
**Branch:** `002-local-server-testing`
**Spec:** specs/002-local-server-testing

**What was added:**
- Implementation of a local development server capability using `CALC_ENVIRONMENT` to toggle between `local` and `remote` modes.
- Support for environment-specific configuration (`.env`, `.env.test`) for Supabase credentials.
- Vite proxy configuration for seamless `/api` routing in local development.
- Automated testing support against the local server infrastructure.

**New Components:**
- `api/src/server.ts`: Local Express-based entry point.
- `api/tests/server.integration.test.ts`: Integration tests for local server parity.

**Tasks Completed:** 17/17 tasks

### Calculoides Core App — 2026-06-06 [Source: specs/001-calculoides-core-app]
**Branch:** `001-calculoides-core-app`
**Spec:** `specs/001-calculoides-core-app`

**What was added:**
- Proportional income-based expense sharing logic.
- Group management with member invitations (Resend integration).
- Budget categories with member subsets and real-time quota calculation.
- Individual expense logging with GroupMember resolution.
- Savings goals with target dates and contribution overrides.
- Budget transfers between members.
- Owner-only archiving of past expenses for immutable historical records.
- Secure session-based authentication (Supabase Auth, no localStorage).
- Responsive dashboard with FSD architecture.

**New Components:**
- `api/`: Vercel serverless functions (Auth, Budget, Savings, Groups, Expenses).
- `frontend/`: React Vite app with FSD (Dashboard, Login, Settings, Savings).
- `prisma/`: Database schema (User, Group, Member, Category, Expense, etc.).

**Tasks Completed:** 122/122 tasks
