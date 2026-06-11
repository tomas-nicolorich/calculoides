# Calculoides — API

Express 5 backend deployed on Vercel. Uses Prisma 7 with a Supabase PostgreSQL database (via PgBouncer). Emails sent via Resend. Tests with Vitest.

See `shared/CONTEXT.md` for the core domain vocabulary used throughout this package.

## Computation Patterns

**Calculation on Read**:
The strategy of calculating financial balances and shares dynamically at the time of retrieval to ensure retroactive correctness after income changes. Within an open (non-archived) period, any change to a member's income immediately re-calculates all **Budget Quotas** for that entire period.

**Remainder Absorption**:
A strategy for handling rounding discrepancies in proportional shares by assigning the 0.01 difference to the **Member** with the highest **Income Percentage**. In the event of a tie in income, the difference is assigned to the member with the longest **Tenure**.

## Conventions

- Route files are co-located by resource: `groups.ts`, `members.ts`, `transactions.ts`
- Validation at route boundaries uses Zod schemas from `shared/`
- Prisma schema lives at `../prisma/schema.prisma` (repo root)
- Auth is handled via Supabase JWT verification
