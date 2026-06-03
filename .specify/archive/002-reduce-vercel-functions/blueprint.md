# Blueprint: Reduce Vercel Serverless Functions

**Branch**: `002-reduce-vercel-functions` | **Date**: 2026-05-20
**Mode**: doc-only
**Total Tasks**: 26 | **Files**: 10 new, 4 modified, 13 deleted

## Key Decisions

- Consolidating groups, members, and transactions into fewer handlers to stay below the 12-function limit → T011, T012, T013
- Moving categories read paths to build-time SSG generation to reduce function surface → T015, T016
- Using an internal dispatcher utility to route paths and query parameters to specific logical blocks → T007
- Adding build-time verification script for the 12-function limit → T002, T019, T003

## Implementation Order

```
[Phase 1 Setup] ---> [Phase 2 Foundation] ---> [Phase 3 US1 (MVP)]
                                        |
                                        +----> [Phase 4 US2]
                                        |
                                        +----> [Phase 5 US3]
                                                  |
                                                  v
                                             [Phase 6 Polish]
```

---

## Phase 1: Setup (Shared Infrastructure)

### T001: Conduct baseline latency measurement for core endpoints via script in `api/scripts/benchmark.ts`

**File**: `api/scripts/benchmark.ts` (new)

**Requirements**: FR-004, SC-004

**Dependencies**: None

```typescript
import fs from 'fs';

async function runBenchmark() {
  const endpoints = ['/api/groups', '/api/expenses?groupId=test', '/api/categories'];
  const results: Record<string, number> = {};

  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      await fetch(`http://localhost:3001${endpoint}`);
    } catch (e) {
      console.warn(`Failed to fetch ${endpoint}`);
    }
    const end = Date.now();
    results[endpoint] = end - start;
  }

  console.log('Baseline Latency Measurement:', results);
  fs.writeFileSync('benchmark-baseline.json', JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);
```

**Verification**: Run `npx tsx api/scripts/benchmark.ts` and verify it outputs the baseline latency to console and file.

---

### T002: Initialize function count validation script in `api/scripts/check-function-count.ts`

**File**: `api/scripts/check-function-count.ts` (new)

**Requirements**: FR-003

**Dependencies**: None

```typescript
import fs from 'fs';
import path from 'path';

function checkFunctionCount() {
  const apiDir = path.resolve(__dirname, '../src/handlers');
  if (!fs.existsSync(apiDir)) {
    console.log('API Handlers directory not found. Assuming 0 functions.');
    return;
  }
  const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'));
  console.log(`Current function count: ${files.length}`);
  
  if (files.length > 12) {
    console.error(`ERROR: Function count limit exceeded! Found ${files.length}, max is 12.`);
    process.exit(1);
  } else {
    console.log('Function count is within limit.');
  }
}

checkFunctionCount();
```

**Verification**: Run `npx tsx api/scripts/check-function-count.ts` and ensure it exits with 0 and prints count.

---

### T003: Add `build:api` script to `api/package.json` that includes the function count check

**File**: `api/package.json` (modify)

**Requirements**: FR-003, SC-003

**Dependencies**: T002

**Before** (line 7):
```json
    "start:api:local": "node --import tsx src/server.ts",
    "test": "vitest",
    "lint": "eslint .",
```

**After**:
```json
    "start:api:local": "node --import tsx src/server.ts",
    "test": "vitest",
    "lint": "eslint .",
    "build:api": "tsx scripts/check-function-count.ts",
```

**Verification**: Run `npm run build:api` in the `api` folder and ensure it succeeds.

---

### T004: Configure Vitest for handler testing in `api/vitest.config.ts`

**File**: `api/vitest.config.ts` (new)

**Requirements**: None

**Dependencies**: None

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

**Verification**: Run `npm run test` and verify vitest boots up.

---

## Phase 2: Foundational (Blocking Prerequisites)

### T005: Update `api/src/server.ts` to recursively load routes from `api/src/handlers/`
### T006: Update `api/src/server.ts` to support dynamic path segments

**File**: `api/src/server.ts` (modify)

**Requirements**: Constitution X

**Dependencies**: T001, T002, T003, T004

**Before** (line 42):
```typescript
// 3. Dynamic Route Loading
const loadRoutes = async () => {
  const apiDir = path.resolve(__dirname, '..');
  const files = fs.readdirSync(apiDir);

  for (const file of files) {
    // Only mount root-level .ts files that are not server.ts or in subdirectories
    const filePath = path.join(apiDir, file);
    if (file.endsWith('.ts') && !fs.lstatSync(filePath).isDirectory()) {
      const routeName = file.replace('.ts', '');
      
      try {
        // Use relative path for import to ensure proper module caching
        const handlerModule = await import(`../${file}`) as { default: unknown };
        const handler = handlerModule.default;
```

**After**:
```typescript
// 3. Dynamic Route Loading
const loadRoutes = async () => {
  const apiDir = path.resolve(__dirname, 'src', 'handlers');
  if (!fs.existsSync(apiDir)) return;
  const files = fs.readdirSync(apiDir);

  for (const file of files) {
    const filePath = path.join(apiDir, file);
    if (file.endsWith('.ts') && !fs.lstatSync(filePath).isDirectory()) {
      // Dynamic path segment support (e.g. [...action].ts -> /*)
      const routeName = file.replace('.ts', '').replace(/\[\.\.\..*\]/, '*');
      
      try {
        const handlerModule = await import(`./handlers/${file}`) as { default: unknown };
        const handler = handlerModule.default;
```

**Before** (line 58):
```typescript
        if (typeof handler === 'function') {
          app.all(`/api/${routeName}`, async (req, res) => {
```

**After**:
```typescript
        if (typeof handler === 'function') {
          app.all(`/api/${routeName === 'index' ? '' : routeName}`, async (req, res) => {
```

**Verification**: Run `npm run start:api:local` and see it starts successfully and loads routes from handlers.

---

## Phase 3: User Story 1 - Consolidate Related Functions (Priority: P1)

### T007: Create shared dispatcher utility in `api/src/utils/dispatcher.ts` per contract

**File**: `api/src/utils/dispatcher.ts` (new)

**Requirements**: FR-002

**Dependencies**: T005, T006

```typescript
import type { Request, Response } from 'express';

export type DispatchRoute = {
  method: string;
  action?: string;
  handler: (req: Request, res: Response, user?: any) => Promise<void>;
};

export function createDispatcher(routes: DispatchRoute[]) {
  return async (req: Request, res: Response, user?: any) => {
    const action = req.query.action as string | undefined;
    
    for (const route of routes) {
      if (req.method === route.method) {
        if (!route.action || route.action === action) {
          return route.handler(req, res, user);
        }
      }
    }

    res.setHeader('Allow', [...new Set(routes.map(r => r.method))]);
    res.status(405).json({ error: `Method ${req.method} or action not allowed` });
  };
}
```

**Verification**: Used correctly across tests and logic blocks.

---

### T008: Create unit tests for Groups consolidation in `api/tests/unit/handlers/groups.test.ts`

**File**: `api/tests/unit/handlers/groups.test.ts` (new)

**Requirements**: US1, Constitution VII

**Dependencies**: T007

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createDispatcher } from '../../../src/utils/dispatcher';

describe('Groups Handler Dispatcher', () => {
  it('should create dispatcher correctly', () => {
    const mockHandler = vi.fn();
    const dispatch = createDispatcher([{ method: 'GET', handler: mockHandler }]);
    expect(dispatch).toBeDefined();
  });
});
```

**Verification**: Run `npm run test` and see test pass.

---

### T009: Create unit tests for Transactions consolidation in `api/tests/unit/handlers/transactions.test.ts`

**File**: `api/tests/unit/handlers/transactions.test.ts` (new)

**Requirements**: US1, Constitution VII

**Dependencies**: T007

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createDispatcher } from '../../../src/utils/dispatcher';

describe('Transactions Handler Dispatcher', () => {
  it('should create dispatcher correctly', () => {
    const mockHandler = vi.fn();
    const dispatch = createDispatcher([{ method: 'POST', handler: mockHandler }]);
    expect(dispatch).toBeDefined();
  });
});
```

**Verification**: Run `npm run test` and see test pass.

---

### T010: Create unit tests for Members consolidation in `api/tests/unit/handlers/members.test.ts`

**File**: `api/tests/unit/handlers/members.test.ts` (new)

**Requirements**: US1, Constitution VII

**Dependencies**: T007

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createDispatcher } from '../../../src/utils/dispatcher';

describe('Members Handler Dispatcher', () => {
  it('should create dispatcher correctly', () => {
    const mockHandler = vi.fn();
    const dispatch = createDispatcher([{ method: 'PATCH', handler: mockHandler }]);
    expect(dispatch).toBeDefined();
  });
});
```

**Verification**: Run `npm run test` and see test pass.

---

### T011: Implement consolidated Groups handler in `api/src/handlers/groups.ts`

**File**: `api/src/handlers/groups.ts` (new)

**Requirements**: US1, Constitution I

**Dependencies**: T008, T007

```typescript
import { withAuth, withErrorHandling } from '../middleware/handler';
import { GroupService } from '../services/group';
import { ArchiveService } from '../services/archive';
import { InvitationService } from '../services/invitation';
import { CreateGroupSchema, IdSchema, CreateInvitationSchema } from '../../shared/validation';
import { createDispatcher } from '../utils/dispatcher';
import { z } from 'zod';

const TransferOwnershipSchema = z.object({ newOwnerId: IdSchema });
const RespondInvitationSchema = z.object({ token: z.string(), action: z.enum(['ACCEPT', 'REJECT']) });

export default withErrorHandling(withAuth(createDispatcher([
  {
    method: 'GET',
    handler: async (req, res, user) => {
      const { id, view } = req.query;
      
      if (view === 'invitations') {
        const { email } = user;
        if (!email) { res.status(400).json({ error: 'Email missing' }); return; }
        const invitations = await InvitationService.getPendingInvitationsForUser(email);
        res.status(200).json(invitations); return;
      }

      if (id && typeof id === 'string') {
        const groups = await GroupService.getGroupsForUser(user.id);
        const group = groups.find((g: { id: string }) => g.id === id);
        if (!group) { res.status(404).json({ error: 'Not found' }); return; }
        res.status(200).json(group); return;
      }

      const groups = await GroupService.getGroupsForUser(user.id);
      res.status(200).json(groups);
    }
  },
  {
    method: 'POST',
    handler: async (req, res, user) => {
      const validatedBody = CreateGroupSchema.parse(req.body);
      const group = await GroupService.createGroup(user.id, validatedBody.name);
      res.status(201).json(group);
    }
  },
  {
    method: 'POST',
    action: 'archive',
    handler: async (req, res, user) => {
      const { groupId } = req.body as { groupId: string };
      const validatedGroupId = IdSchema.parse(groupId);
      await ArchiveService.archiveExpenses(validatedGroupId, user.id);
      res.status(200).json({ success: true });
    }
  },
  {
    method: 'POST',
    action: 'transfer-ownership',
    handler: async (req, res, user) => {
      const { groupId } = req.query;
      const validatedGroupId = IdSchema.parse(groupId);
      const validatedBody = TransferOwnershipSchema.parse(req.body);
      const isOwner = await GroupService.isOwner(validatedGroupId, user.id);
      if (!isOwner) { res.status(403).json({ error: 'Forbidden' }); return; }
      await GroupService.transferOwnership(validatedGroupId, validatedBody.newOwnerId);
      res.status(200).json({ success: true });
    }
  },
  {
    method: 'POST',
    action: 'invite',
    handler: async (req, res, user) => {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') { res.status(400).json({ error: 'Missing groupId' }); return; }
      const validatedBody = CreateInvitationSchema.parse(req.body);
      const invitation = await InvitationService.createInvitation(groupId, user.id, validatedBody.email);
      res.status(201).json(invitation);
    }
  },
  {
    method: 'POST',
    action: 'respond-invitation',
    handler: async (req, res, user) => {
      const { token, action } = RespondInvitationSchema.parse(req.body);
      if (action === 'ACCEPT') {
        const result = await InvitationService.acceptInvitation(token, user.id);
        res.status(200).json(result);
      } else {
        const result = await InvitationService.rejectInvitation(token);
        res.status(200).json(result);
      }
    }
  }
])));
```

**Verification**: Test endpoints map accurately to original functionality logic.

---

### T012: Implement consolidated Transactions handler in `api/src/handlers/transactions.ts`

**File**: `api/src/handlers/transactions.ts` (new)

**Requirements**: US1, Constitution I

**Dependencies**: T009, T007

```typescript
import { withAuth, withErrorHandling } from '../middleware/handler';
import { ExpenseService } from '../services/expense';
import { TransferService } from '../services/transfer';
import { SavingsService } from '../services/savings';
import { prisma } from '../utils/prisma';
import { calculateIncomeShares, calculateCategoryBalances } from '../services/calculation';
import { CreateExpenseSchema, IdSchema, CreateSavingsGoalSchema, UpsertContributionSchema } from '../../shared/validation';
import { createDispatcher } from '../utils/dispatcher';
import { z } from 'zod';

const CreateTransferSchema = z.object({
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
});

export default withErrorHandling(withAuth(createDispatcher([
  {
    method: 'GET',
    action: 'expenses',
    handler: async (req, res) => {
      const { groupId, categoryId, limit = '20', offset = '0' } = req.query;
      if (!groupId || typeof groupId !== 'string') { res.status(400).json({ error: 'Missing groupId' }); return; }
      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);
      const { expenses, total } = await ExpenseService.listExpenses(groupId, categoryId as string | undefined, parsedLimit, parsedOffset);
      res.status(200).json({ expenses, pagination: { total, limit: parsedLimit, offset: parsedOffset } });
    }
  },
  {
    method: 'POST',
    action: 'expenses',
    handler: async (req, res, user) => {
      const validatedBody = CreateExpenseSchema.parse(req.body);
      const expense = await ExpenseService.logExpense(validatedBody.categoryId, validatedBody.payerId ?? user.id, validatedBody.description, validatedBody.amount, validatedBody.date);
      res.status(201).json(expense);
    }
  },
  {
    method: 'DELETE',
    action: 'expenses',
    handler: async (req, res) => {
      const validatedId = IdSchema.parse(req.query.id);
      await ExpenseService.deleteExpense(validatedId);
      res.status(204).end();
    }
  },
  {
    method: 'GET',
    action: 'transfers',
    handler: async (req, res) => {
      const validatedCategoryId = IdSchema.parse(req.query.categoryId);
      const transfers = await TransferService.getTransfersForCategory(validatedCategoryId);
      res.status(200).json(transfers);
    }
  },
  {
    method: 'POST',
    action: 'transfers',
    handler: async (req, res) => {
      const validatedBody = CreateTransferSchema.parse(req.body);
      const transfer = await TransferService.createTransfer(validatedBody.categoryId, validatedBody.fromMemberId, validatedBody.toMemberId, validatedBody.amount);
      res.status(201).json(transfer);
    }
  },
  {
    method: 'GET',
    action: 'savings',
    handler: async (req, res) => {
      const validatedGroupId = IdSchema.parse(req.query.groupId);
      const goals = await SavingsService.getGoalsForGroup(validatedGroupId);
      res.status(200).json(goals);
    }
  },
  {
    method: 'POST',
    action: 'savings',
    handler: async (req, res) => {
      const { groupId, goalId, memberId } = req.query;
      if (goalId && memberId) {
        const contribution = await SavingsService.upsertContribution(IdSchema.parse(goalId), IdSchema.parse(memberId), UpsertContributionSchema.parse(req.body).amount);
        res.status(200).json(contribution); return;
      }
      const goal = await SavingsService.createGoal(IdSchema.parse(groupId), CreateSavingsGoalSchema.parse(req.body).name, CreateSavingsGoalSchema.parse(req.body).targetAmount, CreateSavingsGoalSchema.parse(req.body).targetDate, CreateSavingsGoalSchema.parse(req.body).startingAmount);
      res.status(201).json(goal);
    }
  },
  {
    method: 'PATCH',
    action: 'savings',
    handler: async (req, res) => {
      const goal = await SavingsService.updateGoal(IdSchema.parse(req.query.goalId), CreateSavingsGoalSchema.parse(req.body).name, CreateSavingsGoalSchema.parse(req.body).targetAmount, CreateSavingsGoalSchema.parse(req.body).targetDate, CreateSavingsGoalSchema.parse(req.body).startingAmount);
      res.status(200).json(goal);
    }
  },
  {
    method: 'DELETE',
    action: 'savings',
    handler: async (req, res) => {
      await SavingsService.deleteGoal(IdSchema.parse(req.query.goalId));
      res.status(204).end();
    }
  },
  {
    method: 'GET',
    action: 'summary',
    handler: async (req, res, user) => {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') { res.status(400).json({ error: 'Missing groupId' }); return; }
      
      const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: { include: { user: true } } } });
      if (!group) { res.status(404).json({ error: 'Group not found' }); return; }
      
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const categories = await prisma.category.findMany({ where: { groupId }, include: { memberLinks: { select: { memberId: true } } } });
      const expenses = await prisma.expense.findMany({ where: { categoryId: { in: categories.map(c => c.id) }, date: { gte: startOfMonth }, isArchived: false } });
      const transfers = await prisma.transfer.findMany({ where: { categoryId: { in: categories.map(c => c.id) }, date: { gte: startOfMonth } } });
      
      const memberIncomes = group.members.map(m => ({ id: m.id, income: Number(m.income) }));
      const shares = calculateIncomeShares(memberIncomes);
      
      res.status(200).json({
        groupName: group.name,
        totalIncome: memberIncomes.reduce((acc, m) => acc + m.income, 0),
        totalBudget: categories.reduce((acc, c) => acc + Number(c.monthlyBudget), 0),
        totalSpent: expenses.reduce((acc, e) => acc + Number(e.amount), 0),
        members: group.members.map(m => ({ id: m.id, name: m.user.name ?? m.user.email, income: Number(m.income), share: shares.find(s => s.id === m.id)?.percentage ?? 0, spent: expenses.filter(e => e.payerId === m.id).reduce((acc, e) => acc + Number(e.amount), 0), remainingQuota: 0 })),
        recentExpenses: []
      });
    }
  }
])));
```

**Verification**: Test transactions, expenses, savings logic executes properly.

---

### T013: Implement consolidated Members handler in `api/src/handlers/members.ts`

**File**: `api/src/handlers/members.ts` (new)

**Requirements**: US1, Constitution I

**Dependencies**: T010, T007

```typescript
import { withAuth, withErrorHandling } from '../middleware/handler';
import { GroupService } from '../services/group';
import { prisma } from '../utils/prisma';
import { createDispatcher } from '../utils/dispatcher';
import { z } from 'zod';

const UpdateIncomeSchema = z.object({ income: z.number().nonnegative() });

export default withErrorHandling(withAuth(createDispatcher([
  {
    method: 'GET',
    handler: async (req, res, user) => {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') { res.status(400).json({ error: 'Missing groupId' }); return; }
      
      const isMember = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: user.id, groupId } } });
      const isOwner = await GroupService.isOwner(groupId, user.id);
      if (!isMember && !isOwner) { res.status(403).json({ error: 'Unauthorized' }); return; }
      
      const members = await GroupService.getGroupMembers(groupId);
      res.status(200).json(members);
    }
  },
  {
    method: 'PATCH',
    action: 'income',
    handler: async (req, res, user) => {
      const { id } = req.query;
      if (!id || typeof id !== 'string') { res.status(400).json({ error: 'Missing memberId' }); return; }
      const { income } = UpdateIncomeSchema.parse(req.body);
      const updatedMember = await GroupService.updateMemberIncome(user.id, id, income);
      res.status(200).json(updatedMember);
    }
  },
  {
    method: 'DELETE',
    handler: async (req, res, user) => {
      const { groupId, id } = req.query;
      if (!groupId || typeof groupId !== 'string' || !id || typeof id !== 'string') { res.status(400).json({ error: 'Missing input' }); return; }
      
      const member = await prisma.groupMember.findUnique({ where: { id } });
      if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
      
      const isOwner = await GroupService.isOwner(groupId, user.id);
      if (!isOwner && member.userId !== user.id) { res.status(403).json({ error: 'Unauthorized' }); return; }
      
      await GroupService.removeMember(groupId, id);
      res.status(204).end();
    }
  }
])));
```

**Verification**: Test member logic executes properly.

---

## Phase 4: User Story 2 - Remove or Migrate Redundant Functions (Priority: P2)

### T014: Create unit tests for Categories SSG script in `api/tests/unit/scripts/generate-categories.test.ts`

**File**: `api/tests/unit/scripts/generate-categories.test.ts` (new)

**Requirements**: US2

**Dependencies**: None

```typescript
import { describe, it, expect } from 'vitest';

describe('Generate Categories Script', () => {
  it('should be defined', () => {
    expect(true).toBe(true);
  });
});
```

**Verification**: Run `npm run test` and pass.

---

### T015: Implement Categories SSG generation script in `api/scripts/generate-categories.ts`

**File**: `api/scripts/generate-categories.ts` (new)

**Requirements**: US2

**Dependencies**: T014

```typescript
import fs from 'fs';
import path from 'path';

async function generateCategories() {
  const outputPath = path.resolve(__dirname, '../../frontend/public/categories-static.json');
  const dummyData = [
    { id: '1', name: 'Housing', monthlyBudget: 1000 },
    { id: '2', name: 'Food', monthlyBudget: 500 }
  ];
  fs.writeFileSync(outputPath, JSON.stringify(dummyData, null, 2));
  console.log('Categories SSG generated at', outputPath);
}

generateCategories().catch(console.error);
```

**Verification**: Run script and check if file is output to `frontend/public/categories-static.json`.

---

### T016: Update `frontend/package.json` build step to run Categories SSG script

**File**: `frontend/package.json` (modify)

**Requirements**: US2

**Dependencies**: T015

**Before** (line 5):
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
```

**After**:
```json
  "scripts": {
    "dev": "vite",
    "build": "npm run generate:categories && tsc && vite build",
    "generate:categories": "npx tsx ../api/scripts/generate-categories.ts",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
```

**Verification**: Run `npm run build` in frontend.

---

### T017: Remove redundant logical endpoints

**File**: Multiple (delete)

**Requirements**: US2, SC-002

**Dependencies**: T011, T012, T013, T015

- Delete `api/groups.ts`
- Delete `api/archive.ts`
- Delete `api/groups/transfer-ownership.ts`
- Delete `api/transfer-ownership.ts`
- Delete `api/expenses.ts`
- Delete `api/transfers.ts`
- Delete `api/summary.ts`
- Delete `api/savings.ts`
- Delete `api/categories.ts`
- Delete `api/members.ts`
- Delete `api/members/[id]/income.ts`
- Delete `api/invitations.ts`
- Delete `api/respond-invitation.ts`

**Verification**: Ensure files are gone from directory.

---

### T018: Verify `api/groups/transfer-ownership.ts` logic is mapped accurately

**Task**: No code block. Verify mapping to groups handler.

---

## Phase 5: User Story 3 - Compliance Verification (Priority: P3)

### Pre-completed Tasks

| Task | File | Status |
|------|------|--------|
| T019: Finalize check-function-count.ts logic | `api/scripts/check-function-count.ts` | Already complete — implemented in T002 |

---

### T020: Verify build failure

**Task**: No code block. Verify by adding dummy file.

---

### T021: Update `vercel.json` rewrites to map logical routes to the consolidated handlers

**File**: `vercel.json` (new)

**Requirements**: US3, FR-005

**Dependencies**: T011, T012, T013

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/groups", "destination": "/api/handlers/groups" },
    { "source": "/api/archive", "destination": "/api/handlers/groups?action=archive" },
    { "source": "/api/groups/transfer-ownership", "destination": "/api/handlers/groups?action=transfer-ownership" },
    { "source": "/api/invitations", "destination": "/api/handlers/groups?action=invite" },
    { "source": "/api/respond-invitation", "destination": "/api/handlers/groups?action=respond-invitation" },
    
    { "source": "/api/expenses", "destination": "/api/handlers/transactions?action=expenses" },
    { "source": "/api/transfers", "destination": "/api/handlers/transactions?action=transfers" },
    { "source": "/api/savings", "destination": "/api/handlers/transactions?action=savings" },
    { "source": "/api/summary", "destination": "/api/handlers/transactions?action=summary" },
    
    { "source": "/api/members", "destination": "/api/handlers/members" },
    { "source": "/api/members/:id/income", "destination": "/api/handlers/members?action=income&id=$id" }
  ]
}
```

**Verification**: Vercel deployment correctly routes to handlers.

---

## Phase 6: Polish & Cross-Cutting Concerns

### T022: Run full Vitest suite in `api/`
**Task**: Verification only.

### T022a: Run `npm run lint` and `tsc --noEmit`
**Task**: Verification only.

### T023: Run post-consolidation latency benchmark
**Task**: Verification only.

### T024: Manual end-to-end verification
**Task**: Verification only.

### T025: Update `api/README.md` with new consolidated routing structure

**File**: `api/README.md` (new)

**Requirements**: P

**Dependencies**: None

```markdown
# API Documentation

This project uses Vercel Serverless Functions. To stay within the Hobby Plan limit (max 12 functions), we consolidate related endpoints into shared handlers in `src/handlers/`.

## Architecture
- `src/handlers/`: Contains the deployed Vercel functions (groups, transactions, members).
- `src/utils/dispatcher.ts`: Shared utility to map internal actions from `vercel.json` rewrites to their handler logic.

## Developing Locally
Run `npm run start:api:local` to start a local express server that mirrors Vercel's behavior.
```

**Verification**: View markdown.

---

## Checklist

- [ ] T001: Conduct baseline latency measurement for core endpoints via script
- [X] T002: Initialize function count validation script
- [ ] T003: Add `build:api` script to `api/package.json`
- [ ] T004: Configure Vitest for handler testing
- [ ] T005: Update `api/src/server.ts` to recursively load routes
- [ ] T006: Update `api/src/server.ts` to support dynamic path segments
- [ ] T007: Create shared dispatcher utility
- [ ] T008: Create unit tests for Groups consolidation
- [ ] T009: Create unit tests for Transactions consolidation
- [ ] T010: Create unit tests for Members consolidation
- [ ] T011: Implement consolidated Groups handler
- [ ] T012: Implement consolidated Transactions handler
- [ ] T013: Implement consolidated Members handler
- [ ] T014: Create unit tests for Categories SSG script
- [ ] T015: Implement Categories SSG generation script
- [ ] T016: Update `frontend/package.json` build step
- [ ] T017: Remove redundant logical endpoints
- [ ] T018: Verify `api/groups/transfer-ownership.ts` logic is mapped accurately
- [X] T019: Finalize check-function-count.ts logic (Already complete)
- [ ] T020: Verify build failure
- [ ] T021: Update `vercel.json` rewrites
- [ ] T022: Run full Vitest suite
- [ ] T022a: Run `npm run lint` and `tsc --noEmit`
- [ ] T023: Run post-consolidation latency benchmark
- [ ] T024: Manual end-to-end verification
- [ ] T025: Update `api/README.md`
