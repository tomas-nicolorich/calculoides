# Calculoides API — Backend Computation Patterns (retired)

**This package is retired.** See [`README.md`](./README.md) for what replaced it. The computation patterns below still describe live behavior — they were ported verbatim to `lib/server/services/**` and `shared/logic/**`, only their location changed.

See `shared/CONTEXT.md` for the core domain vocabulary used throughout.

## Computation Patterns

**Calculation on Read**:
The strategy of calculating financial balances and shares dynamically at the time of retrieval to ensure retroactive correctness after income changes. Within an open (non-archived) period, any change to a member's income immediately re-calculates all **Budget Quotas** for that entire period.

**Remainder Absorption**:
A strategy for handling rounding discrepancies in proportional shares via a **largest-remainder (Hamilton) allocation** (`largestRemainderAllocate` in `shared/logic/rounding.ts`). Each member is floored to the quantum (0.1 for percentages, 0.01 for money); the leftover quanta are handed to the members with the largest fractional remainders. Ties on the remainder are broken by the highest raw weight (income), then by stable member order for full determinism. See `docs/design/allocation-rounding.md` for the worked examples. (This supersedes the earlier "highest income, then longest Tenure" rule.)

## Where this logic lives now

- Route/action files, formerly co-located by resource (`groups.ts`, `members.ts`, `transactions.ts`) → `lib/actions/{group,member,user,expense,transfer,category,savings}.ts` (Server Actions) and `app/api/{expenses,transfers,summary,categories,savings}/route.ts` (GET Route Handlers).
- Domain services (`api/_src/services/**`) → `lib/server/services/**`, unchanged.
- Validation at action/route boundaries still uses Zod schemas from `shared/`.
- Prisma schema still lives at `../prisma/schema.prisma` (repo root); the Prisma client singleton is `lib/prisma.ts` (verbatim port of the former `api/_src/utils/prisma.ts`).
- Auth is handled server-side via `@supabase/ssr`'s `getUser()`, not the former bearer-token/JWT-header verification.
