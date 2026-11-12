## Project

This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.

Calculoides is a shared expense/budget management app for household groups: costs
are split proportionally by income across Groups, Budget Categories, Budget Quotas
(computed live on read), Transfers, Savings Goals (with Contributions), and
period Archive/Settlement.

Stack: Next.js 16 (App Router, root `app/` + `lib/`), React 19, Prisma 7 +
Supabase Postgres (via PgBouncer), `@supabase/ssr`, TanStack Query, Tailwind 4,
Zod, Resend. Package manager is bun, with a `shared` bun workspace built via
Turborepo. Deployed on Vercel.

`frontend/` (old Vite SPA) and `api/` (old Express API) are retired from the
pre-Next.js monorepo — not deployed, kept only for historical reference. Don't
add new code there.

## Commands

- `bun install` — install deps (also runs `prisma generate` via postinstall)
- `bun run dev` — start Next.js dev server
- `bun run build` / `bun run start:next` — production build / start
- `bun run test` — vitest (unit) + `turbo run test` (shared workspace)
- `bun run test:e2e:next` — Playwright e2e
- `bun run typecheck` — tsc + `turbo run typecheck`
- `bun run lint` — eslint + `turbo run lint`
- `bun run prisma:generate` / `bun run prisma:migrate` — schema at `prisma/schema.prisma`

Requires Supabase + Resend env vars — see README for the
`NEXT_PUBLIC_SUPABASE_*` vs server-only var gotcha.

## Domain docs

`shared/CONTEXT.md` is the domain glossary (Groups, Quotas, Settlement, etc.). Read it before
touching domain logic.

## Conventions

- No `@/*` path alias inside `app/` or `lib/` — use relative imports. `fallow`'s
  dead-code resolver (`.github/workflows/fallow.yml`) doesn't follow TS path
  mapping, so alias imports get misreported as unresolved and their targets as unused.
- `openspec/` is in active use for spec-driven changes (`specs/` per feature,
  `changes/` for in-flight work) — check it before assuming a feature is undocumented.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
