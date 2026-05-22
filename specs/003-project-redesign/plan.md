# Implementation Plan: Project Redesign (Mobile-First)

**Branch**: `003-project-redesign` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-project-redesign/spec.md`

## Summary

This feature involves a comprehensive mobile-first redesign of the Calculoides application. The primary technical shift is migrating all input forms from persistent cards to triggered modals (desktop) and drawers (mobile) to reduce UI clutter and improve task focus. We will leverage the existing Tailwind CSS and Shadcn/UI stack, implementing a "Financial Editorial" aesthetic—crisp, high-contrast, and data-dense. Key interactions include integrated budget transfer triggers within the category views and optimized mobile input patterns.

## Technical Context

**Language/Version**: TypeScript / Node.js (v20+)
**Primary Dependencies**: React 18, Tailwind CSS, Shadcn/UI (Radix UI), Lucide React (icons), Zod (validation)
**Storage**: Supabase (PostgreSQL) via Prisma ORM
**Testing**: Vitest (unit), Testing Library (integration)
**Target Platform**: Web (Vercel) - Responsive (Mobile-First)
**Project Type**: Web Application
**Performance Goals**: Lighthouse Accessibility & Best Practices > 90; Zero horizontal scroll at 320px
**Constraints**: Support hardware back button for modal closing; Confirm "dirty" form closure
**Scale/Scope**: Migration of 6+ primary forms and core navigation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **FSD Compliance**: Redesign must strictly follow Feature-Sliced Design. Shared UI (Modals/Drawers) in `shared/ui`, domain-specific forms in `features/*`.
2. **TypeScript Integrity**: Service logic for form submissions must be exported constant objects.
3. **Financial Logic**: Budget transfer logic (the "how" of the transfer) stays on the server; the UI only triggers it.
4. **Code Quality**: No lint errors; use `??` for defaults in new UI components.
5. **Testing**: New UI components and hooks for modal management must have Vitest coverage.

## Project Structure

### Documentation (this feature)

```text
specs/003-project-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (to be generated)
```

### Source Code (repository root)

```text
src/
├── app/                 # Providers and global styles
├── pages/               # Page components (Dashboard, Expenses, etc.)
├── widgets/             # Composed UI (e.g., CategoryList with TransferTrigger)
├── features/            # Business logic (e.g., CreateExpense, TransferBudget)
│   ├── expense-form/
│   ├── budget-transfer/
│   └── category-management/
├── entities/            # Domain models (Group, Member, Category)
└── shared/              # Reusable UI, hooks, and utils
    ├── ui/              # Base components (Modal, Drawer, Button)
    └── lib/             # Global hooks (useConfirmClose, useMediaQuery)
```

**Structure Decision**: FSD (Feature-Sliced Design) as per Constitution Principle II. Existing structure is already aligned; redesign will focus on refactoring components into the correct layers.


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
