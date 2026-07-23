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

| Package | Stack |
|---|---|
| [`api/`](./api) | Express 5, Prisma 7 (Supabase Postgres via PgBouncer), Zod validation, Resend for email, Vitest |
| [`frontend/`](./frontend) | React 19, Vite, React Router 7, Tailwind 4, Base UI, Supabase JS, Vitest + Testing Library |
| [`shared/`](./shared) | Domain types, Zod schemas, and financial calculation logic shared by both packages |

npm workspaces + Turborepo monorepo, deployed on Vercel.

## Getting started

Requires Node and npm (see `packageManager` in `package.json` for the pinned npm version).

```bash
npm install
```

You'll need a Supabase project (Postgres database + auth) and a Resend API key. Set the following environment variables (e.g. in `.env` at the repo root, or your shell):

```bash
# api
DATABASE_URL=            # Supabase Postgres connection string (via PgBouncer)
SUPABASE_URL=
SUPABASE_ANON_KEY=
RESEND_API_KEY=
FRONTEND_URL=            # used for CORS / email links
PORT=                    # optional, local dev only

# frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Run the app in development:

```bash
npm run dev
```

Other common commands:

```bash
npm test          # run all tests (Turborepo, all workspaces)
npm run typecheck # TypeScript check across workspaces
npm run lint       # lint all workspaces
npm run build      # build all workspaces
```

Any of these can be scoped to a single workspace with `-w`, e.g. `npm test -w api`.

## Project structure

```
api/       Express backend (Vercel serverless functions)
frontend/  React SPA
shared/    Domain types, Zod schemas, financial logic
prisma/    Prisma schema (repo root)
docs/      ADRs, design docs, glossary
```

Each package has its own `CONTEXT.md` with domain and code conventions — see [`CONTEXT-MAP.md`](./CONTEXT-MAP.md).

## Deployment

Deployed on Vercel; API routes are rewritten per `vercel.json` (see file for the current routing table).
