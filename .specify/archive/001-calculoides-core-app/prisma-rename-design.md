# Design Doc: Prisma Singular Rename Refactoring

**Date:** 2024-05-15
**Status:** Approved

## Goal
Update all backend code in `api/` to align with the singular Prisma model and relation names refactored in `prisma/schema.prisma`.

## Changes

### 1. Prisma Model Access
Replace all plural model accesses with singular ones:
- `prisma.categories` -> `prisma.category`
- `prisma.groups` -> `prisma.group`
- `prisma.group_members` -> `prisma.groupMember`
- `prisma.category_members` -> `prisma.categoryMember`
- `prisma.expenses` -> `prisma.expense`
- `prisma.transfers` -> `prisma.transfer`
- `prisma.savings_goals` -> `prisma.savingsGoal`
- `prisma.savings_goal_contributions` -> `prisma.savingsGoalContribution`
- `prisma.invitations` -> `prisma.invitation`

Same for transaction objects (`tx`).

### 2. Relation Field Names
Update relation names in `include`, `select`, `where`, and `data`:
- Many-to-one relations become singular (e.g., `category` instead of `categories`).
- One-to-many collections remain plural but must match the schema (e.g., `members` instead of `group_members` in `Group`).

Specific mapping from schema:
- `Group`: `members` (was `group_members`), `categories`, `savingsGoals` (was `savings_goals`), `invitations`
- `GroupMember`: `user`, `group`, `paidExpenses` (was `expenses`), `transfersFrom` (was `transfers_from`), `transfersTo` (was `transfers_to`), `categoryLinks` (was `category_members`), `goalContributions` (was `savings_goal_contributions`)
- `Category`: `group`, `expenses`, `transfers`, `memberLinks` (was `category_members`)
- `Expense`: `category`, `payer`
- `Transfer`: `category`, `fromMember`, `toMember`
- `SavingsGoal`: `group`, `contributions` (was `savings_goal_contributions`)
- `SavingsGoalContribution`: `goal`, `member`
- `Invitation`: `group`, `inviter`

### 3. Types and Imports
- Update `import { ... } from '@prisma/client'` to use singular names (e.g., `Group`, `Category`, `Expense`).
- Update type annotations in code.

### 4. Tests
- Update mocks in `api/tests/` to use singular model names.
- Update types used in tests.

## Validation Strategy
- Run `npm run type-check` (or `tsc --noEmit` in `api/`) to find broken type references.
- Run `npm test` in `api/` to ensure tests pass.
