# Calculoides API (retired)

**This package is retired.** Its Express/Vercel-serverless-functions backend was fully ported to the Next.js App Router application at the repo root across `openspec/changes/nextjs-migration` (phases 1b–7) and deleted in Phase 7. Nothing under `api/` is built, deployed, or imported anymore — only this file and `CONTEXT.md` remain, as a historical record of the architecture that preceded the migration.

See the root [`README.md`](../README.md) for the current architecture, and `openspec/changes/nextjs-migration/design.md` for the port itself.

## What used to be here (pre-migration)

Consolidated Vercel Serverless functions for financial logic and household budget management.

To stay within the Vercel Hobby plan's 12-function limit, routes were consolidated behind a `?action=` **dispatcher** (`api/_src/utils/dispatcher.ts`), fronted by `vercel.json` rewrites that mapped friendly paths onto that query string, with an Express dev shim (`api/_src/server.ts`) reproducing the same routing locally. Next.js auto-bundles and is exempt from that function cap, which removed the need for all three pieces.

- **Groups**: group creation, listing, invitations, ownership transfers → `lib/actions/group.ts`.
- **Members**: member listing, income updates, member removal → `lib/actions/member.ts`.
- **Transactions**: expenses, budget transfers, categories, savings goals → `lib/actions/{expense,transfer,category,savings}.ts` + `app/api/{expenses,transfers,summary,categories,savings}/route.ts`.

Domain services (`api/_src/services/**`) moved to `lib/server/services/**` unchanged; business-logic test coverage moved to `lib/server/services/**/*.test.ts` and `shared/logic/**/*.test.ts`.
