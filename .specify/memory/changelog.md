# Changelog

## Merged Features Log

### Project Redesign — 2026-06-01
**Branch:** `003-project-redesign`
**Spec:** `specs/003-project-redesign`

**What was added:**
- Responsive card-based redesign of the core dashboard (Income Overview, Remaining Balance, Expenses, Budget Transfers, Budget Categories) and Savings Goal page.
- Beautiful dynamic horizontal stacked bar chart in Income Overview showing proportional income distributions with individual legend indicators.
- Global navigation drawer (Hamburger Menu) containing My Groups landing list, Profile management, and Dark Mode theme toggling.
- Dark mode compatibility for the entire application including form controls, custom selects, and status badges.
- Custom accessible Alert and Dialog modals to completely replace browser default `alert()` and `confirm()` prompts.
- Client-side network request deduplication within a 100ms window to reduce backend server load and prevent race conditions.
- Consolidated production build pipeline including root `postinstall` script for Vercel Prisma Client compilation.

**New Components:**
- `frontend/src/shared/ui/Card.tsx`: Reusable Dashboard Card primitive.
- `frontend/src/shared/ui/Dialog.tsx`: Custom accessible alert and confirmation modal using Base UI.
- `frontend/src/shared/ui/Select.tsx`: Reusable accessible `<Select>` component with proper theme-aware classes.
- `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx`: Interactive navigation menu.
- `frontend/src/widgets/dashboard/ui/`: New modular card widgets (IncomeOverview, RemainingBalance, RecentExpenses, BudgetTransfers, BudgetCategories).
- `frontend/src/pages/`: Redesigned page views (DashboardPage, LoginPage, ExpensesPage, TransfersPage, ProfilePage, SavingsPage).

**Tasks Completed:** 57/57 tasks

### Reduce Vercel Serverless Functions — 2026-06-07
**Branch:** `002-reduce-vercel-functions`
**Spec:** `specs/002-reduce-vercel-functions`

**What was added:**
- Consolidated 16 logical endpoints into 3 physical domain handlers (Groups, Transactions, Members) to stay within Vercel's 12-function limit.
- Implemented build-time function count validation script to prevent plan limit regressions.
- Migrated static metadata (Categories) to Build-time Static Site Generation (SSG).
- Added method-aware routing for consolidated handlers.
- Established local dev parity for Vercel rewrite rules.

**New Components:**
- `api/src/utils/dispatcher.ts`: Action-based request router.
- `api/src/handlers/`: Domain-specific API handlers.
- `api/scripts/check-function-count.ts`: Build gate for function limits.
- `api/scripts/generate-categories.ts`: SSG generation script.

**Tasks Completed:** 28/28 tasks

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
