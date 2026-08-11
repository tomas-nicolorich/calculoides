# Calculoides

Shared expense and budget management for household groups. Costs are distributed proportionally based on each member's income, so everyone contributes their fair share rather than an even split.

## How it works

- Members belong to a **Group** and each has a monthly income.
- Spending is organized into **Budget Categories** (e.g. Rent, Groceries), each with a monthly target.
- Every member's **Budget Quota** for a category is their proportional share, based on income — recalculated live whenever incomes change (**Calculation on Read**).
- Members can **Transfer** quota responsibility between each other within a period.
- **Savings Goals** are multi-month targets with income-proportional **Contributions** and a live-projected completion date.
- At the end of a period, the group **Owner** triggers an **Archive**, which locks in the final **Settlement** (who owes/is owed) and resets balances for the next period.

See [`shared/CONTEXT.md`](./shared/CONTEXT.md) for the full domain glossary.

## Tech stack

A single Next.js App Router application at the repo root (`app/`, `lib/`, `proxy.ts`) — Server Components query Prisma directly, mutations are Server Actions, and every session/authorization check runs server-side via `@supabase/ssr`. `frontend/` and `api/` are retired (`openspec/changes/nextjs-migration`); `shared/` remains a workspace.

| Package               | Stack                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root app              | Next.js 16 (App Router), React 19, Prisma 7 (Supabase Postgres via PgBouncer), `@supabase/ssr`, TanStack Query, Tailwind 4, Zod validation, Resend for email, Vitest |
| [`shared/`](./shared) | Domain types, Zod schemas, and financial calculation logic shared by server and client code                                                                          |

npm workspaces (root app + `shared`) + Turborepo for `shared`'s own pipeline, deployed on Vercel (Next.js framework preset).

## Getting started

Requires Node and npm (see `packageManager` in `package.json` for the pinned npm version).

```bash
npm install
```

You'll need a Supabase project (Postgres database + auth) and a Resend API key. Set the following environment variables (e.g. in `.env` at the repo root, or your shell):

```bash
DATABASE_URL=                    # Supabase Postgres connection string (via PgBouncer)
SUPABASE_URL=                    # server-side Supabase client (proxy.ts, lib/supabase/server.ts)
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=        # browser Supabase client (lib/supabase/client.ts)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
FRONTEND_URL=                    # used for invitation email links
```

Run the app in development — one process, no separate API server:

```bash
npm run dev
```

Other common commands:

```bash
npm test          # vitest (root) + turbo run test (shared)
npm run typecheck # tsc -p tsconfig.next.json + turbo run typecheck (shared)
npm run lint       # eslint (root) + turbo run lint (shared)
npm run build      # next build
```

## Project structure

```
app/       Next.js App Router: route segments, Server Actions, Route Handlers, proxy.ts
lib/       Server-only services (lib/server/services), Server Actions (lib/actions), Supabase clients
shared/    Domain types, Zod schemas, financial logic — imported by both server and client code
frontend/  Retired Vite SPA — kept only where its source is not yet fully superseded; not deployed
api/       Retired Express/Vercel-functions backend — docs kept for historical context; not deployed
prisma/    Prisma schema (repo root)
docs/      ADRs, design docs, glossary
```

Each package has its own `CONTEXT.md` with domain and code conventions — see [`CONTEXT-MAP.md`](./CONTEXT-MAP.md).

## Deployment

Deployed on Vercel under the Next.js framework preset. No `vercel.json` rewrites or separate Express dev shim — `app/**` routes serve everything.
