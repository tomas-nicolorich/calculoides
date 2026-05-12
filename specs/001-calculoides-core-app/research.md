# Research: Calculoides Core App

This document tracks technical decisions, best practices, and integration patterns for the Calculoides project.

## Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| Vercel Serverless for Financial Logic | Ensures accuracy and security for monetary calculations; follows project constitution. | Client-side JS (rejected for security/consistency), Supabase Edge Functions (rejected for consistency with Vercel deployment). |
| Supabase RLS for Multi-tenancy | Industry standard for secure data isolation in Supabase; reduces app-level complexity. | App-level filtering (rejected as prone to leaks), Separate DBs (rejected as overkill). |
| Feature-Sliced Design (FSD) | Provides a clear, scalable structure for complex frontend logic. | Atomic Design (rejected as less comprehensive), Standard Folder-by-Type (rejected as unscalable). |
| Retroactive Income Updates | Ensures fairness for mid-month changes as per requirement FR-002. | Pro-rated daily calculation (rejected as overly complex for initial phase), Forward-only updates (rejected by spec). |

## Integration Patterns

### Supabase RLS + Prisma
- Use Prisma to manage schema and migrations.
- **Pattern**: Implement PostgreSQL functions with `SECURITY DEFINER` to cache user group memberships within transaction context. This avoids recursive policy lookups and ensures performant RLS.
- Manually apply RLS policies via migrations.

### Serverless Financial Calculations
- **Pattern**: "Calculation on Read" for income updates. Use Prisma's `groupBy` and `aggregate` in Vercel functions to sum monthly expenses and apply the latest percentages dynamically.
- **Rounding**: Implement "Remainder Absorption" in TypeScript—round all shares down to 2 decimal places and assign the rounding difference to the member with the highest income.

### Group Invitations
- **Pattern**: Custom `invitations` table combined with a feature slice in FSD. Use Vercel serverless functions to trigger invitation emails (e.g., via Resend) for better branding and flow control compared to native Supabase invites.

## Best Practices Resolved
- [x] Optimized retroactive calculation strategies (Calculation on Read).
- [x] Scalable group invitation flows (Custom table + Vercel emails).
- [x] Rounding discrepancy management (Remainder Absorption).
