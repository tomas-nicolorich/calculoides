# Project Knowledge: Calculoides

## Active Technologies
- **Frontend**: React 19.2.6 (Vite 8.0.12), TypeScript 6.0.3, Tailwind CSS 4.3.0, Shadcn/UI (FSD)
- **Backend**: Vercel Serverless (Node/TS), Prisma 7.8.0, Zod 4.4.3
- **Infrastructure**: Supabase (Auth, PostgreSQL), Resend (Emails)
- **Testing**: Vitest 4.1.6

## Project Structure
- `api/`: Vercel serverless functions (consolidated handlers, financial logic).
- `api/src/handlers/`: Consolidated domain handlers (Groups, Transactions, Members).
- `api/scripts/`: Build gates and SSG generation scripts.
- `frontend/`: React application (FSD architecture).
- `prisma/`: Database schema and migrations.
- `shared/`: Shared validation logic and types.
- `.specify/memory/`: Project specification and archival memory.

## Commands
- `npm run dev`: Start both frontend and api (using Vercel CLI).
- `npm run dev:local`: Start both frontend and local api server (using `CALC_ENVIRONMENT=local`).
- `npm run build:api`: Verify serverless function count is within limits (max 12).
- `npm run start:api:local`: Start the local Express-based API server.
- `npm run test`: Run Vitest test suite.
- `npm run test:local`: Run tests against the local server.
- `npx prisma studio`: Open Prisma database manager.
- `npx prisma migrate dev`: Apply database migrations.

## Recent Changes
- **002-reduce-vercel-functions**: Consolidated API endpoints into domain-based handlers to stay within Vercel's 12-function limit. Implemented build-time function count validation and SSG for metadata. [2026-06-07]
- **Constitution v1.1.0**: Updated core principles to include singular Prisma naming, service object patterns, "Calculation on Read", "Remainder Absorption", and formalized local server testing. [2024-05-22]
- **002-local-server-testing**: Implemented local Express-based API server, environment-aware Vite proxy, and `CALC_ENVIRONMENT` toggle for offline-compatible development. [2024-05-23]
- **001-calculoides-core-app**: Initial implementation of household budget management, proportional expense sharing, savings goals, and budget transfers. [2026-06-06]

## Known Issues & Gotchas

### ⚠️ Serverless Function Limits
**Issue:** Deployment failure due to "Serverless Function Limit Exceeded".
**Root Cause:** Vercel Hobby plan has a hard limit of 12 physical functions.
**Prevention Rule:** Always run `npm run build:api` before deployment to verify count (SC-007).

### ⚠️ Function Bundle Size
**Issue:** Deployment failure if a consolidated function exceeds Vercel's size limits.
**Root Cause:** Merging too many dependencies or logical paths into one file.
**Prevention Rule:** Consolidated handlers MUST NOT exceed a **40MB** bundle size. If approaching the limit, split into smaller sub-resource handlers (FR-025).

### ⚠️ Local Rewrite Parity
**Issue:** Local 404s for URLs defined only in `vercel.json` rewrites.
**Root Cause:** Local Express server not aware of Vercel rewrite rules.
**Prevention Rule:** Local server MUST use the rewrite engine to map logical paths to consolidated handlers (FR-030).

### ⚠️ Supabase Connection Feedback
**Issue:** Frontend might show generic error when local server can't reach Supabase.
**Root Cause:** Missing explicit connectivity check in local server entry point.
**Prevention Rule:** Local server MUST return `503 Service Unavailable` with JSON payload `{ "error": "Supabase Connection Failed" }` if health check fails (FR-023).

### ⚠️ Local Environment Files
**Issue:** Incorrect credentials loaded in local development or test modes.
**Root Cause:** Improper `.env` vs `.env.test` resolution.
**Prevention Rule:** Use `CALC_ENVIRONMENT` to select the correct env file (`.env` for `local`, `.env.test` for `test-local`) (FR-020).

### ⚠️ Proportional Share Rounding
**Issue:** Sum of proportional shares might not equal 100% due to floating point precision.
**Root Cause:** Rounding discrepancies in currency divisions.
**Prevention Rule:** Always use the `shared/logic/rounding.ts` utility (Remainder Absorption strategy: round to 2 decimals, highest earner absorbs 0.01 difference).

### ⚠️ Supabase SSL in Local Dev
**Issue:** Connection failures when using self-signed certificates for local Supabase.
**Root Cause:** `NODE_TLS_REJECT_UNAUTHORIZED` defaults to 1.
**Prevention Rule:** Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in local `.env` if using self-signed certs (FR-013).

### ⚠️ API Proxy Port
**Issue:** Frontend cannot communicate with local API.
**Root Cause:** Port mismatch between Vite proxy and Vercel dev server.
**Prevention Rule:** Backend dev server MUST listen on port 3001 (synchronized with frontend proxy).

### ⚠️ Session Retrieval
**Issue:** 401 Unauthorized in API requests.
**Root Cause:** JWT not being sent or retrieved from session.
**Prevention Rule:** API client MUST dynamically retrieve JWT from Supabase session for every request (no localStorage allowed).

### ⚠️ Payer Resolution
**Issue:** Expenses logged with wrong member ID.
**Root Cause:** Using Auth User ID instead of GroupMember ID.
**Prevention Rule:** Always resolve `GroupMember` ID from the authenticated user and the group context before logging expenses.

### ⚠️ Savings Goal Projections
**Issue:** Projected completion dates showing 1/1/1970 (Epoch).
**Root Cause:** Improper handling of empty or zero contribution overrides.
**Prevention Rule:** Ensure `startingAmount` is explicitly handled and projections are recalculated with terminal loading state resolution.
