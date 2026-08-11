# Context Map

Multi-context monorepo. Each package has its own domain context.

| Package   | Context                                  | Description                                   |
| --------- | ---------------------------------------- | --------------------------------------------- |
| `shared/` | [shared/CONTEXT.md](./shared/CONTEXT.md) | Core domain vocabulary and financial concepts |

`api/README.md` and `api/CONTEXT.md` are kept as historical records of the
retired Express API workspace, fully removed in `openspec/changes/nextjs-migration`
Phase 7; `frontend/` (the retired Vite SPA workspace) was removed outright in
the same phase.

The repo root is also the Next.js App Router application (`app/`, `lib/`,
`proxy.ts`, `next.config.ts`) introduced by `openspec/changes/nextjs-migration`.
`shared/` stays a workspace rather than folding into the root app — its Zod
schemas are imported by both server code (`lib/actions/**`, `lib/server/**`)
and client components, and it has no framework-specific dependencies that
would force a merge (decided in Phase 1a, task 1a.12; see `next.config.ts`'s
comment on why the app also uses its own `tsconfig.next.json` instead of the
shared root `tsconfig.json`). Use relative
imports under `app/`/`lib/`, not a `@/*` path alias: `fallow`'s dead-code
resolver (`.github/workflows/fallow.yml`) doesn't follow TS path mapping,
so alias imports get misreported as unresolved and their target files as
unused (found while fixing Phase 1a's PR checks).

System-wide architectural decisions: `docs/adr/`.
