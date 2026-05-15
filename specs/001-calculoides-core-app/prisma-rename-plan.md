# Prisma Singular Rename Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all backend code in `api/` to align with the singular Prisma model and relation names refactored in `prisma/schema.prisma`.

**Architecture:** Systematic replacement of plural Prisma model access and relation fields with singular/updated names. Fix type imports and test mocks.

**Tech Stack:** TypeScript, Prisma, Node.js (Vercel Functions), Vitest.

---

### Task 1: Update API Endpoints

**Files:**
- Modify: `api/archive.ts`
- Modify: `api/categories.ts`
- Modify: `api/expenses.ts`
- Modify: `api/groups.ts`
- Modify: `api/invitations.ts`
- Modify: `api/members.ts`
- Modify: `api/respond-invitation.ts`
- Modify: `api/savings.ts`
- Modify: `api/summary.ts`
- Modify: `api/transfer-ownership.ts`
- Modify: `api/transfers.ts`
- Modify: `api/groups/transfer-ownership.ts`
- Modify: `api/members/[id]/income.ts`

- [ ] **Step 1: Replace model access and relation fields in API endpoints**
    - `prisma.groups` -> `prisma.group`
    - `prisma.group_members` -> `prisma.groupMember`
    - `prisma.categories` -> `prisma.category`
    - `prisma.expenses` -> `prisma.expense`
    - `prisma.transfers` -> `prisma.transfer`
    - `prisma.savings_goals` -> `prisma.savingsGoal`
    - `prisma.savings_goal_contributions` -> `prisma.savingsGoalContribution`
    - `prisma.invitations` -> `prisma.invitation`
    - Relation fields: `group_members` -> `members`, etc.

- [ ] **Step 2: Update type imports**
    - `import { groups, group_members, ... } from '@prisma/client'` -> `import { Group, GroupMember, ... } from '@prisma/client'`

- [ ] **Step 3: Commit**
```bash
git add api/*.ts api/groups/*.ts api/members/[id]/*.ts
git commit -m "refactor(api): update prisma model and relation names in endpoints"
```

### Task 2: Update Services

**Files:**
- Modify: `api/src/services/archive.ts`
- Modify: `api/src/services/auth.ts`
- Modify: `api/src/services/budget.ts`
- Modify: `api/src/services/calculation.ts`
- Modify: `api/src/services/expense.ts`
- Modify: `api/src/services/group.ts`
- Modify: `api/src/services/invitation.ts`
- Modify: `api/src/services/savings.ts`
- Modify: `api/src/services/transfer.ts`

- [ ] **Step 1: Replace model access and relation fields in services**
    - Apply same mapping as Task 1.
    - Don't forget `tx` (transaction) objects.

- [ ] **Step 2: Update type imports**
    - Update to singular type names.

- [ ] **Step 3: Commit**
```bash
git add api/src/services/*.ts
git commit -m "refactor(api): update prisma model and relation names in services"
```

### Task 3: Update Middleware

**Files:**
- Modify: `api/src/middleware/handler.ts`

- [ ] **Step 1: Update Prisma usage in handler middleware**
    - Check if it uses any renamed models or relations.

- [ ] **Step 2: Commit**
```bash
git add api/src/middleware/handler.ts
git commit -m "refactor(api): update prisma names in middleware"
```

### Task 4: Update Tests

**Files:**
- Modify: `api/tests/integration/*.test.ts`
- Modify: `api/tests/logic/*.test.ts`

- [ ] **Step 1: Update mocks and types in tests**
    - `vi.mocked(prisma.expenses.create)` -> `vi.mocked(prisma.expense.create)`
    - Update type names used for mock data.

- [ ] **Step 2: Commit**
```bash
git add api/tests/
git commit -m "refactor(api): update prisma names in tests"
```

### Task 5: Verification

- [ ] **Step 1: Run type check**
Run: `cd api; npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run tests**
Run: `cd api; npm test`
Expected: All tests PASS.

- [ ] **Step 3: Final Commit**
```bash
git commit -m "chore: complete prisma singular rename refactoring"
```
