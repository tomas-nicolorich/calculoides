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

<!-- gitbutler-agent-setup:start -->
## Version control

- Use GitButler (`but`) for version-control inspection and write operations, including status, diffs, branching, committing, pushing, and history edits.
- Assume multiple agents may be working in this repository. Do not move, amend, squash, discard, commit, push, or otherwise modify another agent's work unless the user asks.
- For commit just/only/specific changes on a new branch (selected-change requests), use the two-command fast path from the GitButler skill: `but diff`, then `but commit -b <branch> -m "message" <id> <id>`.
- For that fast path, after the commit succeeds, stop and summarize; do not run separate branch, staging, status, or diff commands unless the commit output is missing information you need.
- Use the installed GitButler skill for command recipes and syntax before guessing flags, using `--help`, or translating Git habits directly.
- Mutation commands report their result without appending workspace status. Add `--status-after` only when the next step needs resulting workspace IDs or details; otherwise do not rerun status or diff to verify success.
- Use a dedicated GitButler branch for each agent session, unless the user asks for a different branch structure. Commit only changes that belong to that session.
- Do not push or open pull requests unless the user asks.
- Keep commit messages and pull request descriptions succinct: explain what changed, why it changed, and any important decision.

### Amend local fixes into the right commits

- For small cleanup or follow-up fixes, amend an unpublished local commit when the change clearly belongs with that commit's intent.
- Do not create tiny fixup commits unless the user asks.
- Use GitButler to move the relevant changes into the commit where they belong.
- Ask before rewriting pushed, reviewed, shared, or ambiguous history.

### Split unrelated changes into separate commits

- If one file contains unrelated changes, split them by hunk instead of committing the whole file.
- Keep tests with the behavior they verify.
- Split generated output, docs-only edits, or mechanical cleanup into separate commits when each commit remains coherent on its own.
- If the split is ambiguous, summarize the options before committing.
<!-- gitbutler-agent-setup:end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
