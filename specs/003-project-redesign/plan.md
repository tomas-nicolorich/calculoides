# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Redesign the application using a card-based layout inspired by the provided mockups. The design will be implemented using BaseUI components and Tailwind CSS for a sleek, colorful, and subtle aesthetic. The core of the redesign includes a comprehensive dashboard (Income Overview, Remaining Balance, Expenses, Budget Transfers, and Budget Categories), a new Expenses page with filtering, the Savings Goal page, and a global hamburger menu for navigation and settings.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 20+  
**Primary Dependencies**: React 19, Tailwind CSS 4, @base-ui/react, @supabase/supabase-js, Zod  
**Storage**: PostgreSQL (Supabase), Prisma 7.8.0  
**Testing**: Vitest 4.1.6, @testing-library/react 16.3.2  
**Target Platform**: Vercel (Web)  
**Project Type**: Web application  
**Performance Goals**: Dashboard renders in < 2 seconds  
**Constraints**: FSD architecture, strict multi-tenancy, server-side financial logic  
**Scale/Scope**: ~5 main dashboard sections, ~4 dedicated sub-pages (Expenses, Transfers, Savings, My Groups), global navigation menu

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TypeScript Integrity**: Strict typing, constant object services.
- [x] **Frontend Architecture (FSD)**: shared -> entities -> features -> widgets -> pages -> app.
- [x] **Server-Side Financial Logic**: "Calculation on Read" and "Remainder Absorption" in Vercel functions.
- [x] **Database & ORM Standards**: Prisma singular naming, RLS policies.
- [x] **Authentication & Session Management**: Supabase Auth only.
- [x] **Strict Multi-tenancy**: Group-scoped queries.
- [x] **Comprehensive Testing Discipline**: Vitest for logic/hooks, RTL for UI.
- [x] **Schema Validation**: Zod for forms and APIs.
- [x] **Code Quality Standards**: ESLint strict, Prettier, `??` preference.
- [x] **Deployment & Environment Management**: Vercel, local server simulation.

## Project Structure

### Documentation (this feature)

```text
specs/003-project-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
api/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── app/
│   ├── pages/
│   ├── widgets/
│   ├── features/
│   ├── entities/
│   ├── shared/
│   └── main.tsx
└── tests/

shared/
└── src/
    ├── types/
    └── schemas/
```

**Structure Decision**: Web application (Option 2) with Feature-Sliced Design (FSD) in the frontend and a Vercel-compatible API structure in the backend. Shared types and schemas will reside in the `shared` workspace.

**Complexity Tracking**

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
| **[BUG-001]** Defensive Rendering | API responses may contain nulls or missing fields causing crashes. | Direct property access (rejected due to runtime TypeErrors). |
| **[BUG-002]** API Routing | Frontend MUST call logical paths (e.g., `/api/summary`) mapped via `vercel.json` rewrites. | Direct action dispatch (rejected to preserve clean frontend API). |
| **[BUG-003]** Request Deduplication | React Strict Mode or double-mounting causes redundant backend calls. | Single-flight request management (rejected to maintain standard hook patterns without deduplication logic). |
| **[BUG-004]** Navigation Drift | "Savings Goal" button redirects to incorrect page due to route mismatch or guard logic. | Explicit verification of route mapping in router configuration. |
| **[BUG-005]** Transaction Deletion | Frontend uses incorrect paths/methods (GET category-delete) for expenses and categories. | Enforced logical `DELETE /api/transactions/:id` and `/api/categories/:id` paths via rewrites. |
| **[BUG-006]** Design Drift | Savings Goal page missed in redesign scope, causing visual inconsistency. | Explicitly added Savings Goal page and its components to the redesign task list. |
| **[BUG-008]** Browser Alerts | Standard browser `confirm()` breaks design immersion. | Replace all browser dialogs with custom `@base-ui-components/react` primitives. |

**Bugfix**: 2026-06-02 — BUG-009 Corrected @base-ui/react dependency name to fix import resolution.
**Bugfix**: 2026-06-01 — BUG-008 Updated from bugfix patch to address browser alert implementation drift.
**Bugfix**: 2026-05-31 — BUG-007 Updated from bugfix patch to fix category deletion misrouting.
**Bugfix**: 2026-05-30 — BUG-006 Updated from bugfix patch to include Savings Goal page redesign.
**Bugfix**: 2026-05-27 — BUG-001 Updated from bugfix patch
**Bugfix**: 2026-05-28 — BUG-002 Updated from bugfix patch to clarify API routing requirements.
**Bugfix**: 2026-05-29 — BUG-003 Updated from bugfix patch to address duplicate backend calls.
**Bugfix**: 2026-05-28 — BUG-004 Updated from bugfix patch to correct Savings Goal navigation.
**Bugfix**: 2026-05-30 — BUG-005 Updated from bugfix patch to enforce logical transaction deletion path.
