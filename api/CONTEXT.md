# Calculoides — API

Express 5 backend deployed on Vercel. Uses Prisma 7 with a Supabase PostgreSQL database (via PgBouncer). Emails sent via Resend. Tests with Vitest.

See `shared/CONTEXT.md` for the core domain vocabulary used throughout this package.

## Computation Patterns

**Calculation on Read**:
The strategy of calculating financial balances and shares dynamically at the time of retrieval to ensure retroactive correctness after income changes. Within an open (non-archived) period, any change to a member's income immediately re-calculates all **Budget Quotas** for that entire period.

**Remainder Absorption**:
A strategy for handling rounding discrepancies in proportional shares via a **largest-remainder (Hamilton) allocation** (`largestRemainderAllocate` in `shared/logic/rounding.ts`). Each member is floored to the quantum (0.1 for percentages, 0.01 for money); the leftover quanta are handed to the members with the largest fractional remainders. Ties on the remainder are broken by the highest raw weight (income), then by stable member order for full determinism. See `docs/design/allocation-rounding.md` for the worked examples. (This supersedes the earlier "highest income, then longest Tenure" rule.)

## Conventions

- Route files are co-located by resource: `groups.ts`, `members.ts`, `transactions.ts`
- Validation at route boundaries uses Zod schemas from `shared/`
- Prisma schema lives at `../prisma/schema.prisma` (repo root)
- Auth is handled via Supabase JWT verification
