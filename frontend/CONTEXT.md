# Calculoides — Frontend

React 19 SPA built with Vite. Routing via React Router 7. Styling with Tailwind 4. Headless UI primitives from Base UI. Auth and data via Supabase JS client. Tests with Vitest + Testing Library.

See `shared/CONTEXT.md` for the core domain vocabulary used throughout this package.

## Conventions

- Components are in `src/`
- Use Base UI primitives for interactive elements (dialogs, dropdowns, etc.) rather than building from scratch
- Tailwind utility classes preferred over custom CSS; use `clsx` + `tailwind-merge` for conditional classes
- Zod schemas from `shared/` are used for form validation

## Domain rendering notes

Add frontend-specific display conventions here as they emerge (e.g. how **Settlement** values are formatted, how **Budget Quota** progress is visualised). Use `/grill-with-docs` to formalise terms when they stabilise.
