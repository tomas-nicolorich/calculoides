## Project

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
- Husky + lint-staged run eslint --fix and prettier on staged files pre-commit.

## Agent dispatch rule

**Dispatch to a background agent when**: reading 3+ files, OR a single file >200 lines, OR the work is self-contained (clear inputs → output file, no back-and-forth needed).
**Inline when**: 1-2 small files, tight back-and-forth needed, or the result directly drives the next tool call.

<!-- dgc-policy-v11 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server for efficient context retrieval.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** — before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project has fewer than 5 files.
   Do NOT do broad or recursive exploration. Read only specific files if their names
   are mentioned, or ask the user what to work on.

4. **Read `recommended_files`** using `graph_read` — **one call per file**.
   - `graph_read` accepts a single `file` parameter (string). Call it separately for each
     recommended file. Do NOT pass an array or batch multiple files into one call.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` — it reads only
     that symbol's lines, not the full file.
   - Example: if `recommended_files` is `["src/auth.ts::handleLogin", "src/db.ts"]`,
     call `graph_read(file: "src/auth.ts::handleLogin")` and `graph_read(file: "src/db.ts")`
     as two separate calls (they can be parallel).

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Token Usage

A `token-counter` MCP is available for tracking live token usage.

- To check how many tokens a large file or text will cost **before** reading it:
  `count_tokens({text: "<content>"})`
- To log actual usage after a task completes (if the user asks):
  `log_usage({input_tokens: <est>, output_tokens: <est>, description: "<task>"})`
- To show the user their running session cost:
  `get_session_stats()`

Live dashboard URL is printed at startup next to "Token usage".

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- `max_supplementary_greps` and `max_supplementary_files` are hard caps - never exceed them.
- Do NOT dump full chat history.
- Do NOT call `graph_retrieve` more than once per turn.
- After edits, call `graph_register_edit` with the changed files. Use `file::symbol` notation (e.g. `src/auth.ts::handleLogin`) when the edit targets a specific function, class, or hook.

## Context Store

Whenever you make a decision, identify a task, note a next step, fact, or blocker during a conversation, call `graph_add_memory`.

**To add an entry:**
```
graph_add_memory(type="decision|task|next|fact|blocker", content="one sentence max 15 words", tags=["topic"], files=["relevant/file.ts"])
```

**Do NOT write context-store.json directly** — always use `graph_add_memory`. It applies pruning and keeps the store healthy.

**Rules:**
- Only log things worth remembering across sessions (not every minor detail)
- `content` must be under 15 words
- `files` lists the files this decision/task relates to (can be empty)
- Log immediately when the item arises — not at session end

## Session End

When the user signals they are done (e.g. "bye", "done", "wrap up", "end session"), proactively update `CONTEXT.md` in the project root with:
- **Current Task**: one sentence on what was being worked on
- **Key Decisions**: bullet list, max 3 items
- **Next Steps**: bullet list, max 3 items

Keep `CONTEXT.md` under 20 lines total. Do NOT summarize the full conversation — only what's needed to resume next session.
