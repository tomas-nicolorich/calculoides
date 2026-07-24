# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Any group of people sharing household costs and managing a joint budget together — roommates, couples, or families are all valid, unrelated compositions. What defines them is not the relationship type but the situation: multiple earners with different incomes who need spending responsibility split fairly rather than equally.

## Product Purpose

Calculoides is a shared expense and budget management app for household groups. It exists so that groups with unequal incomes can track shared spending, savings, and settlements without manually renegotiating who owes what each month.

## Positioning

Two mechanisms together, neither of which a generic expense-splitting app provides:

1. **Income-proportional fairness by default** — every Budget Quota, Category, and Savings Contribution is split by each member's Income Percentage, not equally. Fairness is structural, not a manual step the group has to remember to apply.
2. **A full recurring monthly budget lifecycle, not one-off splits** — Budget Categories, Quotas, Transfers, and Savings Goals accumulate through the month, and a group-triggered Archive computes final Settlements and resets the cycle. It models an ongoing shared budget, not isolated expense entries.

## Operating Context

- A **Group** is the multi-tenant container; a **User** can belong to multiple groups as a **Member**.
- The **Owner** manages membership, incomes, and triggers the monthly **Archive**.
- Core workflows: Dashboard (per-group budget overview), Groups (switch/create), Expenses (log spending against Budget Categories), Transfers (move Budget Quota between members within a category), Savings (multi-month Savings Goals with live-computed Projected Date), Profile.
- Auth flow: login, signup, complete-profile, forgot/reset password — via Supabase.
- Monthly rhythm: spending accrues against category quotas all month; the Owner archives at period end, which computes Settlements and resets spent balances.

## Capabilities and Constraints

- Budget Categories can be scoped to a Member Subset rather than the whole group, re-normalizing that subset's Income Percentage shares.
- Transfers are one-time, per-period adjustments to Budget Quota responsibility — they do not persist across an Archive.
- Savings Goals persist across periods (unlike Budget Categories) and track a running balance toward a Target Date, with a separately computed Projected Date.
- Contributions to Savings Goals default to Income Split; manual overrides recompute the Projected Date without changing other members' amounts.
- Archived records are immutable.
- Stack: React 19 SPA, Vite, React Router 7, Tailwind 4, Base UI primitives, Supabase JS client for auth/data, Zod schemas shared with the API.

## Evidence on Hand

None on hand yet — no testimonials, case studies, or external press. Do not fabricate any.

## Product Principles

1. Fairness is structural: proportional-by-income splitting is the default everywhere money is divided (quotas, categories, savings), never a manual workaround.
2. Model the full monthly cycle, not isolated transactions: categories, quotas, transfers, and savings accumulate together and resolve through a single Archive/Settlement event.
3. High-trust ownership: the Owner role assumes good faith among members and exists to facilitate organization and correct errors, not to police spending.
4. Numbers must be scannable and trustworthy at a glance — this is a household's real shared money.

## Accessibility & Inclusion

No product-specific requirement established yet beyond standard web accessibility expectations.
