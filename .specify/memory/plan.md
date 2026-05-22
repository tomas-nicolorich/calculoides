# Project Plan: Calculoides

**Status**: Active
**Initial Feature**: `001-calculoides-core-app`
**Revision**: 2024-05-23 | Archival of Local Server Testing feature
**Revision**: 2026-06-07 | Archival of Vercel Serverless Function Reduction feature [Source: specs/002-reduce-vercel-functions]

## Summary [Source: specs/001-calculoides-core-app]

Calculoides is a shared household budget management platform designed to automate proportional expense sharing based on individual income. Users organize into groups, set their group-specific incomes, and manage shared categories.

The technical approach leverages a modern, type-safe stack:
- **Frontend**: React 19 (Vite 8) with TypeScript 6.0.3, styled with Tailwind CSS 4 and Shadcn/UI, following Feature-Sliced Design (FSD).
- **Backend**: Vercel Serverless Functions for all financial computations. API endpoints are consolidated into domain-based handlers to stay within plan limits [Source: specs/002-reduce-vercel-functions].
- **Local Development**: A custom Express-based local server simulates Vercel environments and rewrite rules for faster iteration [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions].
- **Data/Auth**: Supabase for authentication and PostgreSQL database via Prisma ORM.
- **Validation/Testing**: Zod for runtime validation and Vitest 4.1.6 for testing.

## Technical Context [Source: specs/001-calculoides-core-app]

**Language/Version**: TypeScript 6.0.3 (Strict Mode)
**Primary Dependencies**: React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.0, Prisma 7.8.0, Zod 4.4.3, @supabase/supabase-js 2.105.4, resend 3.0.0, Express 4.19.2 (local only) [Source: specs/002-local-server-testing]
**Storage**: PostgreSQL (Supabase) via Prisma ORM
**Testing**: Vitest 4.1.6
**Target Platform**: Web (Mobile-first, responsive) deployed on Vercel
**Project Type**: Web Application (Monorepo-style structure)
**Performance Goals**: <500ms for recalculations/UI updates, <200ms API response time (p95), <10s local server start, and <20% latency degradation for consolidated handlers [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions]
**Constraints**: Server-side financial calculations only, session-only auth (no localStorage), Supabase RLS enforcement, zero lint errors, mandatory `CALC_ENVIRONMENT` usage, and a strict limit of 12 serverless functions [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions].

## Project Structure [Source: specs/001-calculoides-core-app]

```text
api/               # Backend (Vercel Serverless)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ handlers/      # [NEW] Consolidated domain handlers [Source: specs/002-reduce-vercel-functions]
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ services/      # Financial logic, auth, and database access
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ middleware/    # Auth and error handling
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ utils/         # Dispatcher and shared utilities [Source: specs/002-reduce-vercel-functions]
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ server.ts      # Local Express server entry point (supports rewrites)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ scripts/         # [NEW] Build gates and SSG generation scripts [Source: specs/002-reduce-vercel-functions]
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ tests/           # Vitest unit and integration tests
```

frontend/          # React Vite application (Frontend)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/           # App initialization, providers, and global styles
â”‚   â”œâ”€â”€ pages/         # Page components (Dashboard, Login, etc.)
â”‚   â”œâ”€â”€ widgets/       # Complex UI components composed of features/entities
â”‚   â”œâ”€â”€ features/      # Business logic and interactive components
â”‚   â”œâ”€â”€ entities/      # Business entities and their domain logic
â”‚   â””â”€â”€ shared/        # Reusable UI components, API client, and utilities
â””â”€â”€ tests/           # Frontend component and integration tests

prisma/            # Shared database schema and migrations
shared/            # Shared types and validation logic
```

**Structure Decision**: A split monorepo structure with `frontend/` (FSD) and `api/` (Vercel serverless functions) to enforce the separation of UI and financial logic. The local server in `api/src/server.ts` provides a bridge for local execution of serverless handlers.
