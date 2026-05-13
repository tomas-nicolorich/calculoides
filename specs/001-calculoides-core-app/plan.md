# Implementation Plan: Calculoides Core App

**Branch**: `001-calculoides-core-app` | **Date**: 2026-05-12 | **Spec**: [specs/001-calculoides-core-app/spec.md](specs/001-calculoides-core-app/spec.md)
**Input**: Feature specification from `/specs/001-calculoides-core-app/spec.md`

## Summary

Calculoides is a shared household budget management platform designed to automate proportional expense sharing based on individual income. Users organize into groups, set their group-specific incomes, and manage shared categories (Rent, Groceries, etc.). The core differentiator is the automated calculation of personal "quotas" derived from group income percentages.

The technical approach leverages a modern, type-safe stack:
- **Frontend**: React (Vite) with TypeScript, styled with Tailwind CSS and Shadcn/UI, following Feature-Sliced Design (FSD).
- **Backend/Logic**: Vercel Serverless Functions for all financial computations (income percentages, savings projections) to ensure accuracy and central control.
- **Data/Auth**: Supabase for authentication (session tokens only, no localStorage) and PostgreSQL database.
- **ORM**: Prisma for schema management and type-safe data access, with Supabase Row-Level Security (RLS) as the primary access control layer.
- **Validation/Testing**: Zod for runtime schema validation and Vitest for a comprehensive test suite (unit/integration).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (Strict Mode)  
**Primary Dependencies**: React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.0, Prisma 7.8.0, Zod 4.4.3, @supabase/supabase-js 2.105.4  
**Storage**: PostgreSQL (Supabase) via Prisma ORM (Schema is locked/final)
**Testing**: Vitest 4.1.6  
**Target Platform**: Web (Mobile-first, responsive) deployed on Vercel  
**Project Type**: Web Application (Monorepo-style structure)  
**Performance Goals**: <500ms for recalculations/UI updates, <200ms API response time (p95)  
**Constraints**: Server-side financial calculations only, session-only auth (no localStorage), Supabase RLS enforcement  
**Scale/Scope**: Initial core app (groups, income, categories, expenses, transfers, savings)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence/Notes |
|------|--------|----------------|
| I. TypeScript Integrity | ✅ | TypeScript 6.0.3 in strict mode specified. |
| II. FSD Architecture | ✅ | FSD mentioned in tech stack and architectural decisions. |
| III. Server-Side Financial Logic | ✅ | Explicitly stated in architectural decisions and spec. |
| IV. Database & ORM Standards | ✅ | Prisma specified; RLS enforcement required at DB level. |
| V. Authentication & Session Management | ✅ | Supabase Auth with session tokens only (no localStorage). |
| VI. Strict Multi-tenancy | ✅ | Queries scoped via RLS and group membership logic. |
| VII. Comprehensive Testing Discipline | ✅ | Vitest specified for unit/integration tests. |
| VIII. Schema Validation | ✅ | Zod specified for all schema validation. |
| IX. Code Quality Standards | ✅ | ESLint/Prettier defaults assumed; strict mode TS. |
| X. Deployment & Environment Management | ✅ | Vercel specified with preview environments. |

## Project Structure

```text
frontend/
├── src/
│   ├── app/
│   ├── pages/
│   ├── widgets/
│   ├── features/
│   ├── entities/
│   └── shared/
└── tests/

api/
├── src/
│   ├── services/
│   ├── utils/
│   └── types/
└── tests/

prisma/
└── schema.prisma
```

**Structure Decision**: A split monorepo structure with `frontend/` (FSD) and `api/` (Vercel serverless functions) to enforce the separation of UI and financial logic. `prisma/` at root for shared schema.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
