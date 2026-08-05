# Context Map

Multi-context monorepo. Each package has its own domain context.

| Package | Context | Description |
|---|---|---|
| `shared/` | [shared/CONTEXT.md](./shared/CONTEXT.md) | Core domain vocabulary and financial concepts |
| `api/` | [api/CONTEXT.md](./api/CONTEXT.md) | Backend computation patterns and API conventions (retired across the `nextjs-migration` change) |
| `frontend/` | [frontend/CONTEXT.md](./frontend/CONTEXT.md) | UI patterns and component conventions (retired across the `nextjs-migration` change) |

The repo root is also the Next.js App Router application (`app/`, `lib/`,
`middleware.ts`, `next.config.ts`) introduced by `openspec/changes/nextjs-migration`.
`shared/` stays a workspace rather than folding into the root app — its Zod
schemas are imported by both server code (`lib/actions/**`, `lib/server/**`)
and client components, and it has no framework-specific dependencies that
would force a merge (decided in Phase 1a, task 1a.12; see `next.config.ts`'s
comment on why the app also uses its own `tsconfig.next.json` instead of the
shared root `tsconfig.json` that `frontend`/`api` extend).

System-wide architectural decisions: `docs/adr/`.
