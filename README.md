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

A single Next.js App Router application at the repo root (`app/`, `lib/`, `proxy.ts`) — Server Components query Prisma directly, mutations are Server Actions, and every session/authorization check runs server-side via `@supabase/ssr`. The old `frontend/` and `api/` packages are deleted (`openspec/changes/archive/2026-08-18-nextjs-migration`); `shared/` remains a workspace.

| Package               | Stack                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root app              | Next.js 16 (App Router), React 19, Prisma 7 (Supabase Postgres via PgBouncer), `@supabase/ssr`, TanStack Query, Tailwind 4, Zod validation, Resend for email, Vitest |
| [`shared/`](./shared) | Domain types, Zod schemas, and financial calculation logic shared by server and client code                                                                          |

Bun workspaces (root app + `shared`) + Turborepo for `shared`'s typecheck, deployed on Vercel (Next.js framework preset).

## Getting started

Requires Bun (see `packageManager` in `package.json` for the pinned version).

```bash
bun install
```

You'll need a Supabase project (Postgres database + auth) and a Resend API key. Set the following environment variables (e.g. in `.env` at the repo root, or your shell):

```bash
DATABASE_URL=                    # Supabase Postgres connection string (via PgBouncer), read by the app (lib/prisma.ts)
POSTGRES_PRISMA_URL=             # connection string read by the Prisma CLI (prisma.config.ts), e.g. for migrations
SUPABASE_URL=                    # server-side Supabase client (proxy.ts, lib/supabase/server.ts)
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=        # browser Supabase client (lib/supabase/client.ts)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
FRONTEND_URL=                    # used for invitation email links
```

`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for the
Supabase client to initialize in the *browser* — without them, `lib/supabase/client.ts`
fails silently and login/signup/reset-password hang with no error feedback.
They're distinct from the server-only `SUPABASE_URL`/`SUPABASE_ANON_KEY` above,
and from the legacy Vite-era `VITE_SUPABASE_*` vars, which this app doesn't read
at all — a stale `.env.local` carried over from the old `frontend/` app (only
`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`VITE_SUPABASE_*` set) is a common way to hit
this.

Run the app in development — one process, no separate API server:

```bash
bun run dev
```

Other common commands:

```bash
bun run test      # vitest (app, lib, shared)
bun run typecheck # tsc -p tsconfig.next.json + turbo run typecheck (shared)
bun run lint      # eslint (app, lib, shared)
bun run build     # next build
```

## Project structure

```
app/       Next.js App Router: route segments, Route Handlers (app/api), UI primitives (app/_ui), data hooks (app/_data)
lib/       Server-only services (lib/server/services), Server Actions (lib/actions), Supabase clients
shared/    Domain types, Zod schemas, financial logic — imported by both server and client code
prisma/    Prisma schema and migrations
openspec/  Specs per feature (specs/) and archived change proposals (changes/archive/)
proxy.ts   Session refresh and the signed-out redirect for protected routes
```

[`shared/CONTEXT.md`](./shared/CONTEXT.md) holds the domain glossary.

## Deployment

Deployed on Vercel under the Next.js framework preset. No `vercel.json` rewrites or separate Express dev shim — `app/**` routes serve everything.
