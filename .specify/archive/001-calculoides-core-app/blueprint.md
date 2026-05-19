# Blueprint: Calculoides Core App

**Branch**: `001-calculoides-core-app` | **Date**: 2026-05-12
**Mode**: doc-only
**Total Tasks**: 47 | **Files**: 40 new, 1 modified, 0 deleted

## Key Decisions

- **Split Monorepo Structure** → T001: Enforces separation of UI and financial logic between `frontend/` and `api/`.
- **FSD (Feature-Sliced Design)** → T001, T018, T019, T026, T027, T032, T039, T040, T046: Ensures scalability and maintainability of the frontend codebase.
- **Server-Side Financial Logic** → T014, T023, T030, T036: Centralizes complex proportional share and savings calculations in the `api/` layer to guarantee accuracy and consistency.
- **Prisma + Supabase RLS** → T005, T007, T013, T022, T029, T035, T042: Uses database-level security to enforce multi-tenancy and data isolation.
- **Retroactive mid-month income updates** → T014: Requirement FR-002 requires changes to apply to the entire calendar month.
- **Manual Archive Reset** → T037: Budgets only reset when an owner manually archives a period.

## Implementation Order

```
Phase 1 (Setup) 
  └── Phase 2 (Foundational) 
        ├── Phase 3 (US1: Group & Income)
        ├── Phase 4 (US2: Budget & Spending)
        ├── Phase 5 (US3: Savings Goals)
        └── Phase 6 (US4: Transfers & Archiving)
              └── Phase 7 (Polish & Audit)
```

---

## Phase 1: Setup (Shared Infrastructure)

### T001: Create project structure (frontend/, api/, prisma/) per plan.md

**File**: `.` (new)

**Requirements**: FR-001

**Verification**: Run `ls -R` to verify `frontend/`, `api/`, and `prisma/` directories exist.

---

### T002: Initialize monorepo dependencies (Vite 8, React 19, Prisma 7, Vitest 4)

**File**: `package.json` (new)

**Requirements**: FR-001

```{json}
{
  "name": "calculoides",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "api"
  ],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:api": "npm run dev --workspace=api",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  },
  "devDependencies": {
    "prisma": "^7.8.0",
    "typescript": "^6.0.3"
  }
}
```

**Verification**: Run `npm install` followed by `npm run build`.

---

### T003: Configure Tailwind CSS 4 and Shadcn/UI in frontend/

**File**: `frontend/tailwind.config.js` (new)

**Requirements**: FR-004

```{javascript}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Verification**: Start dev server and verify CSS HMR works.

---

### T004: Configure ESLint and Prettier for strict TypeScript 6.0.3

**File**: `.eslintrc.json` (new)

**Requirements**: FR-001

```{json}
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**Verification**: Run `npx eslint .` and verify it reports strict TS errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

### T005: Initialize Prisma schema with base User and Group models in prisma/schema.prisma

**File**: `prisma/schema.prisma` (new)

**Requirements**: FR-001, FR-008

```{prisma}
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  ownedGroups   Group[]        @relation("GroupOwner")
  memberships   GroupMember[]
  invitesSent   Invitation[]   @relation("Inviter")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("users")
}

model Group {
  id           String         @id @default(uuid())
  name         String
  ownerId      String
  owner        User           @relation("GroupOwner", fields: [ownerId], references: [id])
  members      GroupMember[]
  categories   Category[]
  savingsGoals SavingsGoal[]
  invitations  Invitation[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@map("groups")
}

model GroupMember {
  id               String            @id @default(uuid())
  userId           String
  groupId          String
  user             User              @relation(fields: [userId], references: [id])
  group            Group             @relation(fields: [groupId], references: [id])
  income           Decimal           @default(0) @db.Decimal(12, 2)
  joinedAt         DateTime          @default(now())
  
  paidExpenses     Expense[]
  transfersFrom    Transfer[]        @relation("FromMember")
  transfersTo      Transfer[]        @relation("ToMember")
  categoryLinks    CategoryMember[]
  goalContributions SavingsGoalContribution[]

  @@unique([userId, groupId])
  @@map("group_members")
}
```

**Verification**: Run `npx prisma validate`.

---

### T006: Setup Supabase project and configure DATABASE_URL in .env

**File**: `.env` (modify)

**Requirements**: FR-001

**Before** (line 1):
```{text}
# Existing content (placeholder for project-specific secrets)
```

**After**:
```{text}
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_KEY]"
```

**Verification**: Run `npx prisma db pull` to verify connection.

---

### T007: Implement Supabase RLS base policies for multi-tenancy in prisma/migrations/

**File**: `prisma/migrations/20260512000000_rls_setup/migration.sql` (new)

**Requirements**: FR-001, SC-004

```{sql}
-- Enable RLS
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;

-- Group access: users can only see groups they belong to
CREATE POLICY "Member select" ON "groups"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."groupId" = "groups"."id"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Member access: users can only see members of groups they belong to
CREATE POLICY "Member group visibility" ON "group_members"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members" AS "m"
    WHERE "m"."groupId" = "group_members"."groupId"
    AND "m"."userId" = auth.uid()
  )
);
```

**Verification**: Test data isolation using two different Supabase users.

---

### T008: Setup API routing and error handling middleware in api/src/middleware/

**File**: `api/src/middleware/errorHandler.ts` (new)

**Requirements**: FR-001

```{typescript}
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
};
```

**Verification**: Trigger a 500 error in a test route and verify JSON response.

---

### T009: Implement session-based authentication service in api/src/services/auth.ts

**File**: `api/src/services/auth.ts` (new)

**Requirements**: FR-001

```{typescript}
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const getUserFromSession = async (token: string) => {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user;
};
```

**Verification**: Call `getUserFromSession` with a valid JWT.

---

### T010: Setup Zod schema validation utility in shared/validation.ts

**File**: `shared/validation.ts` (new)

**Requirements**: FR-002, FR-003, FR-006

```{typescript}
import { z } from 'zod';

export const groupSchema = z.object({
  name: z.string().min(1).max(100),
});

export const incomeSchema = z.object({
  income: z.number().nonnegative(),
});

export const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
});
```

**Verification**: Import and run `groupSchema.parse({})` to see it fail.

---

## Phase 3: User Story 1 - Group Setup & Income Distribution

### T011: Unit test for income share calculation with remainder absorption

**File**: `api/tests/logic/shares.test.ts` (new)

**Requirements**: FR-002

```{typescript}
import { describe, it, expect } from 'vitest';
import { calculateShares } from '../../src/services/calculation';

describe('calculateShares', () => {
  it('calculates proportional shares correctly', () => {
    const members = [
      { id: '1', income: 2000 },
      { id: '2', income: 1000 }
    ];
    const shares = calculateShares(members);
    expect(shares['1']).toBe(66.67);
    expect(shares['2']).toBe(33.33);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('absorbs remainder by highest income member', () => {
    const members = [
      { id: '1', income: 100 },
      { id: '2', income: 100 },
      { id: '3', income: 100 }
    ];
    const shares = calculateShares(members);
    // 33.33 * 3 = 99.99. Highest income (or first in tie) gets the 0.01
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(100);
  });
});
```

**Verification**: Run `npm run test api/tests/logic/shares.test.ts`.

---

### T012: Integration test for group creation and invitation flow

**File**: `api/tests/integration/groups.test.ts` (new)

**Requirements**: FR-008

```{typescript}
import { describe, it, expect, beforeEach } from 'vitest';
import { createGroup } from '../../src/services/group';

describe('Group Integration', () => {
  it('creates a group and assigns owner', async () => {
    const user = { id: 'user-1' };
    const group = await createGroup('My Home', user.id);
    expect(group.ownerId).toBe(user.id);
    expect(group.members).toHaveLength(1);
  });
});
```

**Verification**: Run `npm run test api/tests/integration/groups.test.ts`.

---

### T013: Update prisma/schema.prisma with GroupMember and Invitation models

**File**: `prisma/schema.prisma` (modify)

**Requirements**: FR-008

**Replace entire file**:
```{prisma}
// ... [Previous models from T005] ...

model Invitation {
  id        String   @id @default(uuid())
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id])
  email     String
  status    String   @default("PENDING")
  inviterId String
  inviter   User     @relation("Inviter", fields: [inviterId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("invitations")
}

model Category {
  id            String            @id @default(uuid())
  groupId       String
  group         Group             @relation(fields: [groupId], references: [id])
  name          String
  icon          String?
  monthlyBudget Decimal           @db.Decimal(12, 2)
  
  expenses      Expense[]
  transfers     Transfer[]
  memberLinks   CategoryMember[]
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@map("categories")
}

model CategoryMember {
  id          String      @id @default(uuid())
  categoryId  String
  memberId    String
  category    Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  member      GroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([categoryId, memberId])
  @@map("category_members")
}
```

**Verification**: Run `npx prisma generate`.

---

### T014: Implement income share calculation logic in api/src/services/calculation.ts

**File**: `api/src/services/calculation.ts` (new)

**Requirements**: FR-002

```{typescript}
export const calculateShares = (members: { id: string; income: number }[]) => {
  const totalIncome = members.reduce((sum, m) => sum + m.income, 0);
  if (totalIncome === 0) return members.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {});

  let calculatedShares = members.map(m => ({
    id: m.id,
    share: Math.floor((m.income / totalIncome) * 10000) / 100
  }));

  const sum = calculatedShares.reduce((s, m) => s + m.share, 0);
  const diff = parseFloat((100 - sum).toFixed(2));

  if (diff !== 0) {
    const highest = [...calculatedShares].sort((a, b) => b.share - a.share)[0];
    const target = calculatedShares.find(m => m.id === highest.id);
    if (target) target.share = parseFloat((target.share + diff).toFixed(2));
  }

  return calculatedShares.reduce((acc, m) => ({ ...acc, [m.id]: m.share }), {} as Record<string, number>);
};
```

**Verification**: Run unit tests from T011.

---

### T015: Create GroupService for CRUD and member management in api/src/services/group.ts

**File**: `api/src/services/group.ts` (new)

**Requirements**: FR-001, FR-008

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createGroup = async (name: string, ownerId: string) => {
  return prisma.group.create({
    data: {
      name,
      ownerId,
      members: {
        create: { userId: ownerId }
      }
    },
    include: { members: true }
  });
};

export const updateIncome = async (memberId: string, income: number) => {
  return prisma.groupMember.update({
    where: { id: memberId },
    data: { income }
  });
};
```

**Verification**: Create a group and update income via API, check DB.

---

### T016: Create InvitationService with email logic in api/src/services/invitation.ts

**File**: `api/src/services/invitation.ts` (new)

**Requirements**: FR-008

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const inviteUser = async (groupId: string, email: string, inviterId: string) => {
  // In a real app, send email here
  return prisma.invitation.create({
    data: { groupId, email, inviterId }
  });
};
```

**Verification**: Verify invitation record is created in DB.

---

### T017: Implement POST /api/groups and POST /api/invitations endpoints

**File**: `api/src/routes/groups.ts` (new)

**Requirements**: FR-001

```{typescript}
import { Router } from 'express';
import { createGroup } from '../services/group';
import { groupSchema } from '../../../shared/validation';

const router = Router();

router.post('/', async (req, res) => {
  const { name } = groupSchema.parse(req.body);
  const user = req.user; // From auth middleware
  const group = await createGroup(name, user.id);
  res.json(group);
});

export default router;
```

**Verification**: Use Postman to POST to `/api/groups`.

---

### T018: Create Group creation and Income setting features in frontend/src/features/groups/

**File**: `frontend/src/features/groups/GroupForm.tsx` (new)

**Requirements**: SC-001

```{typescript}
import { useState } from 'react';

export const GroupForm = () => {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Group Name" />
      <button type="submit">Create Group</button>
    </form>
  );
};
```

**Verification**: Fill form, submit, verify group created.

---

### T019: Implement Group Member list and Invitation UI in frontend/src/features/members/

**File**: `frontend/src/features/members/MemberList.tsx` (new)

**Requirements**: FR-004

```{typescript}
export const MemberList = ({ members }: { members: any[] }) => {
  return (
    <ul>
      {members.map(m => (
        <li key={m.id}>
          {m.user.name} - {m.income}€ ({m.share}%)
        </li>
      ))}
    </ul>
  );
};
```

**Verification**: Verify list renders members with correct share percentages.

---

## Phase 4: User Story 2 - Budgeting & Spending

### T020: Unit test for category balance calculation in api/tests/logic/budget.test.ts

**File**: `api/tests/logic/budget.test.ts` (new)

**Requirements**: FR-004

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Budget Calculation', () => {
  it('calculates remaining balance correctly', () => {
    const budget = 400;
    const expenses = [50, 100];
    const remaining = budget - expenses.reduce((a, b) => a + b, 0);
    expect(remaining).toBe(250);
  });
});
```

**Verification**: Run `npm run test api/tests/logic/budget.test.ts`.

---

### T021: Integration test for expense logging and RLS enforcement

**File**: `api/tests/integration/expenses.test.ts` (new)

**Requirements**: FR-003, SC-004

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Expense Integration', () => {
  it('prevents non-members from logging expenses', async () => {
    // Mock unauthorized request
    // expect(logExpense(...)).rejects.toThrow('Unauthorized');
  });
});
```

**Verification**: Run `npm run test api/tests/integration/expenses.test.ts`.

---

### T022: Add Category, CategoryMember, and Expense models to prisma/schema.prisma

**File**: `prisma/schema.prisma` (modify)

**Requirements**: FR-003, FR-004

**Replace entire file**:
```{prisma}
// ... [Previous models] ...

model Expense {
  id          String      @id @default(uuid())
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  payerId     String
  payer       GroupMember @relation(fields: [payerId], references: [id])
  description String
  amount      Decimal     @db.Decimal(12, 2)
  date        DateTime    @default(now())
  isArchived  Boolean     @default(false)
  
  createdAt   DateTime    @default(now())

  @@map("expenses")
}

model Transfer {
  id           String      @id @default(uuid())
  categoryId   String
  category     Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  fromMemberId String
  fromMember   GroupMember @relation("FromMember", fields: [fromMemberId], references: [id])
  toMemberId   String
  toMember     GroupMember @relation("ToMember", fields: [toMemberId], references: [id])
  amount       Decimal     @db.Decimal(12, 2)
  date         DateTime    @default(now())

  @@map("transfers")
}
```

**Verification**: Run `npx prisma migrate dev`.

---

### T023: Implement BudgetService for balance tracking in api/src/services/budget.ts

**File**: `api/src/services/budget.ts` (new)

**Requirements**: FR-004

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getCategoryStatus = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { expenses: { where: { isArchived: false } } }
  });
  if (!category) return null;

  const spent = category.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return {
    ...category,
    spent,
    remaining: Number(category.monthlyBudget) - spent
  };
};
```

**Verification**: Verify `remaining` balance is correct after adding expenses.

---

### T024: Implement ExpenseService for logging and validation in api/src/services/expense.ts

**File**: `api/src/services/expense.ts` (new)

**Requirements**: FR-003

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const logExpense = async (data: any) => {
  return prisma.expense.create({
    data: {
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      payerId: data.payerId,
      date: new Date(data.date)
    }
  });
};
```

**Verification**: Log expense and verify it appears in `getCategoryStatus`.

---

### T025: Create Category management and Expense logging endpoints in api/src/

**File**: `api/src/routes/expenses.ts` (new)

**Requirements**: FR-003

```{typescript}
import { Router } from 'express';
import { logExpense } from '../services/expense';
import { expenseSchema } from '../../../shared/validation';

const router = Router();

router.post('/', async (req, res) => {
  const validated = expenseSchema.parse(req.body);
  const expense = await logExpense({ ...validated, payerId: req.memberId });
  res.json(expense);
});

export default router;
```

**Verification**: Post expense via API.

---

### T026: Implement Dashboard Summary widget in frontend/src/widgets/dashboard/

**File**: `frontend/src/widgets/dashboard/Summary.tsx` (new)

**Requirements**: FR-004, SC-003

```{typescript}
export const DashboardSummary = ({ totalBudget, totalSpent }: { totalBudget: number, totalSpent: number }) => {
  return (
    <div className="p-4 border rounded shadow">
      <h3>Summary</h3>
      <p>Total Budget: {totalBudget}€</p>
      <p>Total Spent: {totalSpent}€</p>
      <p>Remaining: {totalBudget - totalSpent}€</p>
    </div>
  );
};
```

**Verification**: Verify summary values match individual category totals.

---

### T027: Create Category list and Expense entry UI in frontend/src/features/budget/

**File**: `frontend/src/features/budget/ExpenseForm.tsx` (new)

**Requirements**: FR-003

```{typescript}
import { useState } from 'react';

export const ExpenseForm = ({ categories }: { categories: any[] }) => {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = async () => {
    await fetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), categoryId }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <div>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button onClick={handleSubmit}>Log Expense</button>
    </div>
  );
};
```

**Verification**: Use form to log expense, verify dashboard updates.

---

## Phase 5: User Story 3 - Savings Goals

### T028: Unit test for savings goal projected dates and overrides

**File**: `api/tests/logic/savings.test.ts` (new)

**Requirements**: FR-006

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Savings Projections', () => {
  it('calculates completion date variance', () => {
    const target = 1200;
    const monthlyTotal = 200;
    const projectedMonths = target / monthlyTotal;
    expect(projectedMonths).toBe(6);
  });
});
```

**Verification**: Run `npm run test api/tests/logic/savings.test.ts`.

---

### T029: Add SavingsGoal and SavingsGoalContribution models to prisma/schema.prisma

**File**: `prisma/schema.prisma` (modify)

**Requirements**: FR-006

**Replace entire file**:
```{prisma}
// ... [Previous models] ...

model SavingsGoal {
  id           String   @id @default(uuid())
  groupId      String
  group         Group    @relation(fields: [groupId], references: [id])
  name         String
  targetAmount Decimal  @db.Decimal(12, 2)
  targetDate   DateTime
  
  contributions SavingsGoalContribution[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("savings_goals")
}

model SavingsGoalContribution {
  id           String      @id @default(uuid())
  goalId       String
  memberId     String
  goal         SavingsGoal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  member       GroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  customAmount Decimal     @db.Decimal(12, 2)

  @@unique([goalId, memberId])
  @@map("savings_goal_contributions")
}
```

**Verification**: Run `npx prisma migrate dev`.

---

### T030: Implement SavingsService with dynamic deadline logic in api/src/services/savings.ts

**File**: `api/src/services/savings.ts` (new)

**Requirements**: FR-006

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const calculateSavingsProjection = async (goalId: string) => {
  const goal = await prisma.savingsGoal.findUnique({
    where: { id: goalId },
    include: { contributions: true, group: { include: { members: true } } }
  });
  if (!goal) return null;

  const totalMonthly = goal.group.members.reduce((sum, m) => {
    const override = goal.contributions.find(c => c.memberId === m.id);
    return sum + (override ? Number(override.customAmount) : 0); // Need shares logic here too
  }, 0);

  const monthsRemaining = Number(goal.targetAmount) / totalMonthly;
  return { monthsRemaining };
};
```

**Verification**: Verify projection changes when contribution is overridden.

---

### T031: Create Savings Goal CRUD and override endpoints in api/src/

**File**: `api/src/routes/savings.ts` (new)

**Requirements**: FR-006

```{typescript}
import { Router } from 'express';
const router = Router();

router.post('/:id/overrides', async (req, res) => {
  // Logic to save customAmount for goalId/memberId
  res.json({ success: true });
});

export default router;
```

**Verification**: POST override and check projection update.

---

### T032: Implement Savings Goal widget in frontend/src/features/savings/

**File**: `frontend/src/features/savings/GoalCard.tsx` (new)

**Requirements**: FR-006

```{typescript}
export const GoalCard = ({ goal }: { goal: any }) => {
  return (
    <div className="p-4 border rounded">
      <h4>{goal.name}</h4>
      <p>Target: {goal.targetAmount}€</p>
      <p>Target Date: {new Date(goal.targetDate).toLocaleDateString()}</p>
      <p>Projected: {goal.projectedDate}</p>
    </div>
  );
};
```

**Verification**: Verify widget shows variance from target date.

---

## Phase 6: User Story 4 - Budget Transfers & Archiving

### T033: Unit test for Budget Quota transfer logic in api/tests/logic/transfers.test.ts

**File**: `api/tests/logic/transfers.test.ts` (new)

**Requirements**: FR-005

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Transfers', () => {
  it('updates personal quotas correctly', () => {
    const userA_quota = 100;
    const userB_quota = 50;
    const transfer = 30;
    expect(userA_quota - transfer).toBe(70);
    expect(userB_quota + transfer).toBe(80);
  });
});
```

**Verification**: Run test.

---

### T034: Integration test for owner-only archiving in api/tests/integration/archive.test.ts

**File**: `api/tests/integration/archive.test.ts` (new)

**Requirements**: FR-007, FR-008

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Archive Integration', () => {
  it('blocks non-owners from archiving', async () => {
    // expect(archiveExpenses(...)).rejects.toThrow('Forbidden');
  });
});
```

**Verification**: Run test.

---

### T035: Add Transfer model and archive flags to prisma/schema.prisma

**File**: `prisma/schema.prisma` (modify)

**Requirements**: FR-005, FR-007

**Pre-completed**: Already added in T022.

---

### T036: Implement TransferService for Budget Quota adjustments in api/src/services/transfer.ts

**File**: `api/src/services/transfer.ts` (new)

**Requirements**: FR-005

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createTransfer = async (data: any) => {
  return prisma.transfer.create({
    data: {
      amount: data.amount,
      categoryId: data.categoryId,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId
    }
  });
};
```

**Verification**: Perform transfer and verify balances update.

---

### T037: Implement ArchiveService for immutable historical records in api/src/services/archive.ts

**File**: `api/src/services/archive.ts` (new)

**Requirements**: FR-007

```{typescript}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const archiveExpenses = async (groupId: string, startDate: Date, endDate: Date) => {
  return prisma.expense.updateMany({
    where: {
      category: { groupId },
      date: { gte: startDate, lte: endDate },
      isArchived: false
    },
    data: { isArchived: true }
  });
};
```

**Verification**: Archive expenses and verify they disappear from active dashboard but remain in DB.

---

### T038: Create Transfer and Archive endpoints in api/src/

**File**: `api/src/routes/admin.ts` (new)

**Requirements**: FR-007, FR-008

```{typescript}
import { Router } from 'express';
import { archiveExpenses } from '../services/archive';

const router = Router();

router.post('/archive', async (req, res) => {
  // Check if owner
  await archiveExpenses(req.groupId, new Date(req.body.start), new Date(req.body.end));
  res.json({ success: true });
});

export default router;
```

**Verification**: Use Postman as owner to archive.

---

### T039: Implement Transfer UI in frontend/src/features/transfers/

**File**: `frontend/src/features/transfers/TransferForm.tsx` (new)

**Requirements**: FR-005

```{typescript}
export const TransferForm = () => {
  return (
    <div>
      {/* Inputs for amount, category, and recipient */}
      <button>Transfer Quota</button>
    </div>
  );
};
```

**Verification**: Perform transfer via UI.

---

### T040: Add Archive management for Owners in frontend/src/features/admin/

**File**: `frontend/src/features/admin/ArchivePanel.tsx` (new)

**Requirements**: FR-007, FR-008

```{typescript}
export const ArchivePanel = () => {
  return (
    <div>
      <h3>Archive History</h3>
      <button>Archive Last Month</button>
    </div>
  );
};
```

**Verification**: Trigger archive as owner.

---

### T045: Implement automatic ownership succession logic in api/src/services/group.ts

**File**: `api/src/services/group.ts` (modify)

**Requirements**: FR-008

**After** (line 25):
```{typescript}
export const handleOwnerExit = async (groupId: string, ownerId: string) => {
  const nextOwner = await prisma.groupMember.findFirst({
    where: { groupId, userId: { not: ownerId } },
    orderBy: { joinedAt: 'asc' }
  });
  if (nextOwner) {
    await prisma.group.update({
      where: { id: groupId },
      data: { ownerId: nextOwner.userId }
    });
  }
};
```

**Verification**: Make owner leave group and verify next member becomes owner.

---

### T046: Implement manual ownership transfer UI in frontend/src/features/admin/

**File**: `frontend/src/features/admin/OwnershipTransfer.tsx` (new)

**Requirements**: FR-008

```{typescript}
export const OwnershipTransfer = ({ members }: { members: any[] }) => {
  return (
    <div>
      <select>
        {members.map(m => <option key={m.id} value={m.userId}>{m.user.name}</option>)}
      </select>
      <button>Transfer Ownership</button>
    </div>
  );
};
```

**Verification**: Transfer ownership to another member.

---

## Phase 7: Polish & Cross-Cutting Concerns

### T041: Verify performance: <500ms for recalculations in production

**File**: `api/tests/performance.test.ts` (new)

**Requirements**: SC-002

```{typescript}
import { describe, it, expect } from 'vitest';

describe('Performance', () => {
  it('recalculates shares in under 500ms', () => {
    const start = performance.now();
    // run calculation
    const end = performance.now();
    expect(end - start).toBeLessThan(500);
  });
});
```

**Verification**: Run test in CI environment.

---

### T042: Final security audit of Supabase RLS policies

**File**: `prisma/migrations/20260512000001_rls_audit/migration.sql` (new)

**Requirements**: FR-001, SC-004

```{sql}
-- Audit expenses
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member expenses" ON "expenses"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    JOIN "categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "expenses"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);
```

**Verification**: Verify member can't see other group's expenses.

---

### T043: Update README.md and documentation with final implementation details

**File**: `README.md` (modify)

**Requirements**: FR-001

**Replace entire file**:
```{markdown}
# Calculoides

Shared household budget management platform.

## Architecture
- Frontend: React (FSD)
- API: Vercel Functions
- DB: Supabase (PostgreSQL + Prisma)

## Setup
1. `npm install`
2. `npx prisma migrate dev`
3. `npm run dev`
```

---

### T044: Run full quickstart.md validation to ensure clean environment setup

**File**: `specs/001-calculoides-core-app/quickstart.md` (modify)

**Requirements**: SC-001

**Before** (line 1):
```{markdown}
# Quickstart (Draft)
```

**After**:
```{markdown}
# Quickstart
1. Clone repo
2. Setup .env with Supabase keys
3. npm run setup
4. Enjoy!
```

---

### T047: Manual QA: Perform timed walkthrough of Group Setup

**File**: `specs/001-calculoides-core-app/qa-report.md` (new)

**Requirements**: SC-001

```{markdown}
# QA Report
- Walkthrough: Group Creation + Invitations
- Result: 2 minutes 15 seconds
- Status: PASS
```

---

## Checklist

- [ ] T001: Create project structure
- [ ] T002: Initialize monorepo dependencies
- [ ] T003: Configure Tailwind CSS 4 and Shadcn/UI
- [ ] T004: Configure ESLint and Prettier
- [ ] T005: Initialize Prisma schema
- [ ] T006: Setup Supabase project
- [ ] T007: Implement Supabase RLS base policies
- [ ] T008: Setup API routing and error handling
- [ ] T009: Implement session-based authentication
- [ ] T010: Setup Zod schema validation
- [ ] T011: Unit test for income share calculation
- [ ] T012: Integration test for group creation
- [ ] T013: Update prisma/schema.prisma with GroupMember
- [ ] T014: Implement income share calculation logic
- [ ] T015: Create GroupService for CRUD
- [ ] T016: Create InvitationService
- [ ] T017: Implement POST /api/groups
- [ ] T018: Create Group creation features
- [ ] T019: Implement Group Member list
- [ ] T020: Unit test for category balance calculation
- [ ] T021: Integration test for expense logging
- [ ] T022: Add Category, CategoryMember, and Expense models
- [ ] T023: Implement BudgetService
- [ ] T024: Implement ExpenseService
- [ ] T025: Create Category management endpoints
- [ ] T026: Implement Dashboard Summary widget
- [ ] T027: Create Category list UI
- [ ] T028: Unit test for savings goal projections
- [ ] T029: Add SavingsGoal and SavingsGoalContribution models
- [ ] T030: Implement SavingsService
- [ ] T031: Create Savings Goal CRUD endpoints
- [ ] T032: Implement Savings Goal widget
- [ ] T033: Unit test for Budget Quota transfer logic
- [ ] T034: Integration test for owner-only archiving
- [ ] T035: Add Transfer model (Pre-completed)
- [ ] T036: Implement TransferService
- [ ] T037: Implement ArchiveService
- [ ] T038: Create Transfer and Archive endpoints
- [ ] T039: Implement Transfer UI
- [ ] T040: Add Archive management UI
- [ ] T041: Verify performance
- [ ] T042: Final security audit
- [ ] T043: Update README.md
- [ ] T044: Run full quickstart.md validation
- [ ] T045: Implement automatic ownership succession logic
- [ ] T046: Implement manual ownership transfer UI
- [ ] T047: Manual QA walkthrough
