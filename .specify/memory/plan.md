# Project Plan: Calculoides

**Status**: Active
**Initial Feature**: `001-calculoides-core-app`
**Revision**: 2026-06-01 | Archival of Project Redesign feature [Source: specs/003-project-redesign]
**Revision**: 2024-05-23 | Archival of Local Server Testing feature
**Revision**: 2026-06-07 | Archival of Vercel Serverless Function Reduction feature [Source: specs/002-reduce-vercel-functions]

## Summary [Source: specs/001-calculoides-core-app]

Calculoides is a shared household budget management platform designed to automate proportional expense sharing based on individual income. Users organize into groups, set their group-specific incomes, and manage shared categories.

The technical approach leverages a modern, type-safe stack:
- **Frontend**: React 19 (Vite 8) with TypeScript 6.0.3, styled with Tailwind CSS 4, utilizing `@base-ui/react` unstyled primitives for custom sleek components, following Feature-Sliced Design (FSD). [Source: specs/003-project-redesign]
- **Backend**: Vercel Serverless Functions for all financial computations. API endpoints are consolidated into domain-based handlers to stay within plan limits [Source: specs/002-reduce-vercel-functions].
- **Local Development**: A custom Express-based local server simulates Vercel environments and rewrite rules for faster iteration [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions].
- **Data/Auth**: Supabase for authentication and PostgreSQL database via Prisma ORM.
- **Validation/Testing**: Zod for runtime validation and Vitest 4.1.6 for testing.

## Technical Context [Source: specs/001-calculoides-core-app]

**Language/Version**: TypeScript 6.0.3 (Strict Mode)
**Primary Dependencies**: React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.0, @base-ui/react 1.0.0-alpha.0 (Base UI), @tailwindcss/vite 4.0.0, Prisma 7.8.0, Zod 4.4.3, @supabase/supabase-js 2.105.4, resend 3.0.0, Express 4.19.2 (local only) [Source: specs/002-local-server-testing, specs/003-project-redesign]
**Storage**: PostgreSQL (Supabase) via Prisma ORM
**Testing**: Vitest 4.1.6
**Target Platform**: Web (Mobile-first, responsive) deployed on Vercel
**Project Type**: Web Application (Monorepo-style structure)
**Performance Goals**: <500ms for recalculations/UI updates, <200ms API response time (p95), <10s local server start, and <20% latency degradation for consolidated handlers [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions]
**Constraints**: Server-side financial calculations only, session-only auth (no localStorage), Supabase RLS enforcement, zero lint errors, mandatory `CALC_ENVIRONMENT` usage, and a strict limit of 12 serverless functions [Source: specs/002-local-server-testing, specs/002-reduce-vercel-functions].

## Project Structure [Source: specs/001-calculoides-core-app]

```text
api/               # Backend (Vercel Serverless)
├── src/
│   ├── handlers/      # [NEW] Consolidated domain handlers [Source: specs/002-reduce-vercel-functions]
│   ├── services/      # Financial logic, auth, and database access
│   ├── middleware/    # Auth and error handling
│   ├── utils/         # Dispatcher and shared utilities [Source: specs/002-reduce-vercel-functions]
│   └── server.ts      # Local Express server entry point (supports rewrites)
├── scripts/         # [NEW] Build gates and SSG generation scripts [Source: specs/002-reduce-vercel-functions]
└── tests/           # Vitest unit and integration tests

frontend/          # React Vite application (Frontend)
├── src/
│   ├── app/           # App initialization, providers, and global styles
│   ├── pages/         # Page components (Dashboard, Login, Expenses, Profile, etc.) [Source: specs/003-project-redesign]
│   ├── widgets/       # Complex UI components composed of features/entities
│   ├── features/      # Business logic and interactive components
│   ├── entities/      # Business entities and their domain logic
│   └── shared/        # Reusable UI components, API client, and utilities
└── tests/           # Frontend component and integration tests

prisma/            # Shared database schema and migrations
shared/            # Shared types and validation logic
```

**Structure Decision**: A split monorepo structure with `frontend/` (FSD) and `api/` (Vercel serverless functions) to enforce the separation of UI and financial logic. The local server in `api/src/server.ts` provides a bridge for local execution of serverless handlers.
