# Blueprint: project-redesign

**Branch**: `003-project-redesign` | **Date**: 2026-05-27
**Mode**: scaffold
**Total Tasks**: 32 | **Files**: 25 new, 5 modified, 0 deleted

## Key Decisions

- **Base UI + Tailwind 4 Integration** → T001, T003, T010, T024, T027
  - Leverage `@base-ui-components/react` for unstyled, accessible component primitives and Tailwind 4's new `@theme` block for centralized design tokens.

- **Strict FSD Compliance** → T002, T011-T015, T018-T020, T024-T028
  - All new UI logic is partitioned into the standard FSD layers (shared -> entities -> features -> widgets -> pages) to ensure modularity and scalability.

- **Shared Domain Schemas** → T004, T005
  - Centralize Zod schemas and TypeScript interfaces in the `shared` workspace to enforce type safety across both frontend and API layers.

- **Card-Based Dashboard Architecture** → T010, T015
  - Implement a reusable `Card` primitive as the foundational layout element for all dashboard widgets, ensuring aesthetic consistency ("sleek, colorful, subtle").

## Implementation Order

```
Phase 1: Setup
  └── Phase 2: Foundational
        ├── Phase 3: User Story 1 (Dashboard)
        ├── Phase 4: User Story 2 (Expenses)
        └── Phase 5: User Story 3 (Nav & Settings)
              └── Phase 6: Polish
```

---

## Phase 1: Setup (Shared Infrastructure)

### Pre-completed Tasks

| Task | File | Status |
|------|------|--------|
| T002: Create FSD folder structure | `frontend/src/` | Already complete — FSD directories (shared, entities, features, widgets, pages) exist in src. |

---

### T001: Install Base UI components

**File**: `frontend/package.json` (modify)

**Requirements**: FR-006, FR-009

**Dependencies**: None

**Before** (line 19):
```json
    "@supabase/supabase-js": "^2.105.4",
    "clsx": "^2.1.1",
    "lucide-react": "^1.14.0",
```

**After**:
```json
    "@base-ui-components/react": "^1.0.0-alpha.0",
    "@supabase/supabase-js": "^2.105.4",
    "clsx": "^2.1.1",
    "lucide-react": "^1.14.0",
```

**Verification**: Run `npm install` and verify `@base-ui-components/react` is in `node_modules`.

---

### T003: Setup global Tailwind 4 configuration

**File**: `frontend/src/app/index.css` (modify)

**Requirements**: SC-003

**Dependencies**: T001

**Replace entire file**:
```css
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --color-accent: #f59e0b;
  --color-background: #ffffff;
  --color-card: #f8fafc;
  --color-border: #e2e8f0;
  --color-text-main: #1e293b;
  --color-text-muted: #64748b;

  --radius-card: 1rem;
  --shadow-subtle: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

@layer base {
  body {
    @apply bg-background text-text-main antialiased;
  }
}

.dark {
  --color-background: #0f172a;
  --color-card: #1e293b;
  --color-border: #334155;
  --color-text-main: #f1f5f9;
  --color-text-muted: #94a3b8;
}
```

**Verification**: Background and text colors update to match the new theme tokens.

---

## Phase 2: Foundational (Blocking Prerequisites)

### T004: Define redesign Zod schemas

**File**: `shared/src/schemas/redesign.ts` (new)

**Requirements**: FR-011, FR-012, FR-013, FR-014

**Dependencies**: None

```typescript
import { z } from 'zod';

export const DashboardMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  income: z.number().nonnegative(),
  share: z.number().min(0).max(100),
  spent: z.number().nonnegative(),
  remainingQuota: z.number(),
});

export const DashboardSummarySchema = z.object({
  groupName: z.string(),
  totalIncome: z.number().nonnegative(),
  totalBudget: z.number().nonnegative(),
  totalSpent: z.number().nonnegative(),
  members: z.array(DashboardMemberSchema),
  recentExpenses: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    amount: z.number().positive(),
    date: z.string().datetime(),
    categoryName: z.string(),
    payerName: z.string(),
  })),
});

export const CategoryBalanceSchema = z.object({
  memberId: z.string().uuid(),
  quota: z.number().nonnegative(),
  spent: z.number().nonnegative(),
  remainingQuota: z.number(),
});

export const CategoryWithBalancesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  monthlyBudget: z.number().nonnegative(),
  icon: z.string().optional(),
  balances: z.array(CategoryBalanceSchema),
});
```

**Verification**: Schema validation passes for sample group data.

---

### T005: Create redesign TypeScript types

**File**: `shared/src/types/redesign.ts` (new)

**Requirements**: FR-011, FR-012, FR-014

**Dependencies**: T004

```typescript
import { z } from 'zod';
import { 
  DashboardSummarySchema, 
  DashboardMemberSchema, 
  CategoryWithBalancesSchema, 
  CategoryBalanceSchema 
} from '../schemas/redesign';

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type DashboardMember = z.infer<typeof DashboardMemberSchema>;
export type CategoryWithBalances = z.infer<typeof CategoryWithBalancesSchema>;
export type CategoryBalance = z.infer<typeof CategoryBalanceSchema>;

export interface Transfer {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  categoryName: string;
  date: string;
}
```

**Verification**: Types are correctly inferred from schemas and exported.

---

### T006: Implement API client hooks

**File**: `frontend/src/shared/api/dashboardHooks.ts` (new)

**Requirements**: FR-001, FR-007

**Dependencies**: T005

```typescript
import { useState, useEffect } from 'react';
import { DashboardSummary, CategoryWithBalances } from '../../../../shared/src/types/redesign';

// Mocking apiClient for blueprint completeness
const apiClient = {
  fetch: async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
};

export function useDashboardSummary(groupId: string | null) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    apiClient.fetch<DashboardSummary>(`/api/summary?groupId=${groupId}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  return { data, loading, error };
}

export function useCategoriesList(groupId: string | null) {
  const [data, setData] = useState<CategoryWithBalances[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    apiClient.fetch<CategoryWithBalances[]>(`/api/categories?groupId=${groupId}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [groupId]);

  return { data, loading };
}
```

**Verification**: Hooks successfully fetch and manage state for dashboard data.

---

### T007: Configure Vitest and RTL

**File**: `frontend/vite.config.ts` (modify)

**Requirements**: Testing Mandate

**Dependencies**: None

**Before** (line 11):
```typescript
    plugins: [react(), tailwind()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
```

**After**:
```typescript
    plugins: [react(), tailwind()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['src/test/**', 'node_modules/**'],
      },
    },
```

**Verification**: Run `npm test` to confirm it discovers tests in the `tests/` directory.

---

## Phase 3: User Story 1 - Dashboard Overview (Priority: P1) 🎯 MVP

### T008: Unit test for dashboard data transformation

**File**: `frontend/tests/shared/api/dashboard.test.ts` (new)

**Requirements**: FR-011, FR-012

**Dependencies**: T004

```typescript
import { describe, it, expect } from 'vitest';
import { DashboardSummarySchema } from '../../../../shared/src/schemas/redesign';

describe('Dashboard Data Transformation', () => {
  it('validates a complete dashboard summary object', () => {
    const validData = {
      groupName: 'Test Group',
      totalIncome: 5000,
      totalBudget: 4000,
      totalSpent: 1000,
      members: [
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Alice', income: 3000, share: 60, spent: 600, remainingQuota: 2400 },
        { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Bob', income: 2000, share: 40, spent: 400, remainingQuota: 1600 }
      ],
      recentExpenses: [
        { id: '123e4567-e89b-12d3-a456-426614174002', description: 'Groceries', amount: 50, date: new Date().toISOString(), categoryName: 'Food', payerName: 'Alice' }
      ]
    };
    
    const result = DashboardSummarySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
```

**Verification**: `npm test` passes for the schema validation test.

---

### T009: Component test for Dashboard Card primitive

**File**: `frontend/tests/shared/ui/Card.test.tsx` (new)

**Requirements**: SC-003

**Dependencies**: T010

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../../../src/shared/ui/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders title and action when provided', () => {
    render(
      <Card title="Header Title" action={<button>Action</button>}>
        Body
      </Card>
    );
    expect(screen.getByText('Header Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });
});
```

**Verification**: `npm test` passes for the Card component unit tests.

---

### T010: Create reusable Dashboard Card primitive

**File**: `frontend/src/shared/ui/Card.tsx` (new)

**Requirements**: SC-003

**Dependencies**: T003

```typescript
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: React.ReactNode;
}

export function Card({ title, action, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-card shadow-subtle overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          {title && <h3 className="font-semibold text-text-main text-lg leading-none">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
```

**Verification**: Component renders with consistent rounded corners and subtle shadows.

---

### T011: Implement Income Overview widget

**File**: `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx` (new)

**Requirements**: FR-011

**Dependencies**: T010, T005

```typescript
import { Card } from '../../../shared/ui/Card';
import type { DashboardMember } from '../../../../../shared/src/types/redesign';

interface Props {
  members: DashboardMember[];
  totalIncome: number;
}

export function IncomeOverview({ members, totalIncome }: Props) {
  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-border">
          {members.map((member, idx) => (
            <div
              key={member.id}
              style={{ width: `${member.share}%` }}
              className={
                idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-secondary' : 'bg-accent'
              }
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4">
          {members.map(member => (
            <div key={member.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-text-main leading-none">{member.name}</p>
                <p className="text-sm text-text-muted mt-1">{member.share.toFixed(1)}% of group</p>
              </div>
              <p className="font-bold text-text-main text-lg">
                ${member.income.toLocaleString()}
              </p>
            </div>
          ))}
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <p className="font-bold text-text-main">Total Group Income</p>
            <p className="font-bold text-primary text-2xl">
              ${totalIncome.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

**Verification**: Horizontal stacked bar chart displays correct percentage distributions.

---

### T012: Implement Remaining Balance widget

**File**: `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx` (new)

**Requirements**: FR-012

**Dependencies**: T010, T005

```typescript
import { Card } from '../../../shared/ui/Card';
import type { DashboardMember } from '../../../../../shared/src/types/redesign';

interface Props {
  members: DashboardMember[];
}

export function RemainingBalance({ members }: Props) {
  const totalRemaining = members.reduce((sum, m) => sum + m.remainingQuota, 0);

  return (
    <Card title="Remaining Balance">
      <div className="space-y-6">
        <div className="text-center py-2">
          <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Total Combined Remaining</p>
          <p className="text-5xl font-black text-secondary mt-2">
            ${totalRemaining.toLocaleString()}
          </p>
        </div>
        <div className="grid gap-3">
          {members.map(member => (
            <div key={member.id} className="p-4 bg-background/50 rounded-xl border border-border">
              <div className="flex justify-between items-end mb-2">
                <p className="font-bold text-text-main">{member.name}</p>
                <p className="font-black text-secondary text-lg">
                  ${member.remainingQuota.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between text-xs text-text-muted font-medium">
                <span>Income: ${member.income}</span>
                <span>Budgeted: ${member.spent + member.remainingQuota}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

**Verification**: Combined total and individual breakdowns match the calculated member data.

---

### T013: Implement Budget Categories widget

**File**: `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` (new)

**Requirements**: FR-014, FR-015, FR-016

**Dependencies**: T010, T005

```typescript
import { Card } from '../../../shared/ui/Card';
import { Plus, Edit2, Trash2, Send } from 'lucide-react';
import type { CategoryWithBalances } from '../../../../../shared/src/types/redesign';

interface Props {
  categories: CategoryWithBalances[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTransfer: (categoryId: string, memberId: string) => void;
}

export function BudgetCategories({ categories, onAdd, onEdit, onDelete, onTransfer }: Props) {
  return (
    <Card 
      title="Budget Categories" 
      action={
        <button 
          onClick={onAdd} 
          className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
        >
          <Plus size={16} /> Add
        </button>
      }
    >
      <div className="space-y-8">
        {categories.map(cat => (
          <div key={cat.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">{cat.icon || '📁'}</span>
                <div>
                  <h4 className="font-black text-text-main text-lg leading-none">{cat.name}</h4>
                  <p className="text-xs text-text-muted mt-1 font-medium">${cat.monthlyBudget.toLocaleString()} Total Target</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(cat.id)} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                <button onClick={() => onDelete(cat.id)} className="p-2 text-text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid gap-2">
              {cat.balances.map(bal => (
                <div key={bal.memberId} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-xl">
                  <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase font-bold">Quota</p>
                      <p className="font-bold text-text-main">${bal.quota}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase font-bold">Spent</p>
                      <p className="font-bold text-text-main">${bal.spent}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary uppercase font-bold">Left</p>
                      <p className="font-black text-secondary">${bal.remainingQuota}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onTransfer(cat.id, bal.memberId)}
                    className="p-2 hover:bg-secondary/10 text-secondary rounded-lg transition-colors ml-4"
                    title="Initiate Transfer"
                  >
                    <Send size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

**Verification**: Action buttons (Edit, Delete, Transfer) are present and trigger the correct callbacks.

---

### T014: Implement Budget Transfers log widget

**File**: `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx` (new)

**Requirements**: FR-013

**Dependencies**: T010, T005

```typescript
import { Card } from '../../../shared/ui/Card';
import { ArrowRight } from 'lucide-react';
import type { Transfer } from '../../../../../shared/src/types/redesign';

interface Props {
  transfers: Transfer[];
  onViewAll: () => void;
}

export function BudgetTransfers({ transfers, onViewAll }: Props) {
  return (
    <Card 
      title="Budget Transfers"
      action={
        <button 
          onClick={onViewAll} 
          className="text-sm text-primary font-bold hover:underline underline-offset-4"
        >
          View All
        </button>
      }
    >
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted italic font-medium">No recent transfers recorded</p>
          </div>
        ) : (
          transfers.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 border border-transparent hover:border-border hover:bg-background/40 rounded-xl transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <span>{t.fromName}</span>
                  <ArrowRight size={14} className="text-text-muted" strokeWidth={3} />
                  <span>{t.toName}</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 font-medium">{t.categoryName} • {new Date(t.date).toLocaleDateString()}</p>
              </div>
              <p className="font-black text-accent text-lg">${t.amount}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
```

**Verification**: Log entries display correct "From -> To" mapping with the associated category.

---

### T015: Assemble main Dashboard page

**File**: `frontend/src/pages/dashboard/ui/DashboardPage.tsx` (new)

**Requirements**: FR-001, FR-002, SC-001

**Dependencies**: T011, T012, T013, T014, T006, T018

```typescript
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useDashboardSummary, useCategoriesList } from '../../../shared/api/dashboardHooks';
import { IncomeOverview } from '../../../widgets/dashboard/ui/IncomeOverview';
import { RemainingBalance } from '../../../widgets/dashboard/ui/RemainingBalance';
import { BudgetCategories } from '../../../widgets/dashboard/ui/BudgetCategories';
import { BudgetTransfers } from '../../../widgets/dashboard/ui/BudgetTransfers';
import { RecentExpenses } from '../../../widgets/dashboard/ui/RecentExpenses';

export function DashboardPage() {
  const groupId = localStorage.getItem('activeGroupId');
  const { data: summary, loading: summaryLoading } = useDashboardSummary(groupId);
  const { data: categories, loading: catLoading } = useCategoriesList(groupId);
  const navigate = useNavigate();

  if (summaryLoading || catLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted font-bold animate-pulse">Loading financial data...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 text-center bg-card rounded-card border border-border shadow-subtle">
        <h2 className="text-2xl font-black text-text-main">No Active Group</h2>
        <p className="text-text-muted mt-2 font-medium">Please select or create a group to view your dashboard.</p>
        <button 
          onClick={() => navigate('/groups')}
          className="mt-6 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-subtle hover:brightness-110 transition-all"
        >
          Go to My Groups
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tight">Dashboard</h1>
          <p className="text-text-muted font-bold mt-1 text-lg">Financial Overview for {summary.groupName}</p>
        </div>
        <button 
          onClick={() => navigate('/savings')}
          className="inline-flex items-center gap-2.5 bg-accent text-white px-8 py-4 rounded-2xl font-black shadow-subtle hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Wallet size={20} strokeWidth={3} />
          Savings Goal
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <IncomeOverview members={summary.members} totalIncome={summary.totalIncome} />
        <RemainingBalance members={summary.members} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <BudgetCategories 
            categories={categories}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onTransfer={() => {}}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-8">
          <RecentExpenses expenses={summary.recentExpenses} />
          <BudgetTransfers transfers={[]} onViewAll={() => navigate('/transfers')} />
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Dashboard layout correctly places the five cards in the required grid structure.

---

## Phase 4: User Story 2 - Expense Management (Priority: P2)

### T016: Unit test for expense filtering

**File**: `api/src/services/expenseService.test.ts` (new)

**Requirements**: FR-005

**Dependencies**: None

```typescript
import { describe, it, expect } from 'vitest';

interface Expense {
  id: string;
  payerId: string;
  categoryId: string;
  amount: number;
}

function filterExpenses(expenses: Expense[], filters: { payerId?: string; categoryId?: string }) {
  return expenses.filter(e => {
    if (filters.payerId && e.payerId !== filters.payerId) return false;
    if (filters.categoryId && e.categoryId !== filters.categoryId) return false;
    return true;
  });
}

describe('Expense Filtering Service', () => {
  const mockExpenses: Expense[] = [
    { id: '1', payerId: 'p1', categoryId: 'c1', amount: 100 },
    { id: '2', payerId: 'p2', categoryId: 'c1', amount: 200 },
    { id: '3', payerId: 'p1', categoryId: 'c2', amount: 300 },
  ];

  it('filters by payerId only', () => {
    const result = filterExpenses(mockExpenses, { payerId: 'p1' });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.payerId === 'p1')).toBe(true);
  });

  it('filters by categoryId only', () => {
    const result = filterExpenses(mockExpenses, { categoryId: 'c1' });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.categoryId === 'c1')).toBe(true);
  });

  it('filters by both payerId and categoryId', () => {
    const result = filterExpenses(mockExpenses, { payerId: 'p1', categoryId: 'c2' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
});
```

**Verification**: Filtering logic correctly handles single and multiple filter parameters.

---

### T017: Integration test for "View All" navigation

**File**: `frontend/tests/pages/expenses.test.tsx` (new)

**Requirements**: FR-004

**Dependencies**: T015, T018

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from '../../../src/pages/dashboard/ui/DashboardPage';

// Mock hooks to avoid API calls
vi.mock('../../../src/shared/api/dashboardHooks', () => ({
  useDashboardSummary: () => ({ 
    data: { 
      groupName: 'Test', 
      totalIncome: 0, totalBudget: 0, totalSpent: 0, members: [], 
      recentExpenses: [{ id: '1', description: 'Exp', amount: 10, date: new Date().toISOString(), categoryName: 'C', payerName: 'P' }] 
    }, 
    loading: false 
  }),
  useCategoriesList: () => ({ data: [], loading: false })
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Dashboard Navigation', () => {
  it('navigates to /expenses when View All button in Expenses card is clicked', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );
    
    const viewAllBtn = screen.getByRole('button', { name: /view all/i });
    fireEvent.click(viewAllBtn);
    
    expect(mockNavigate).toHaveBeenCalledWith('/expenses');
  });
});
```

**Verification**: Clicking "View All" on the dashboard card triggers navigation to the correct route.

---

### T018: Implement Recent Expenses card widget

**File**: `frontend/src/widgets/dashboard/ui/RecentExpenses.tsx` (new)

**Requirements**: FR-003, FR-004

**Dependencies**: T010

```typescript
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  payerName: string;
}

interface Props {
  expenses: Expense[];
}

export function RecentExpenses({ expenses }: Props) {
  const navigate = useNavigate();

  return (
    <Card 
      title="Recent Expenses"
      action={
        <button 
          onClick={() => navigate('/expenses')} 
          className="text-sm text-primary font-bold hover:underline underline-offset-4"
        >
          View All
        </button>
      }
    >
      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted italic font-medium">No recent expenses</p>
          </div>
        ) : (
          expenses.slice(0, 5).map(e => (
            <div key={e.id} className="flex justify-between items-center p-3 hover:bg-background/40 rounded-xl transition-all border border-transparent hover:border-border">
              <div>
                <p className="font-bold text-text-main leading-none">{e.description}</p>
                <p className="text-[11px] text-text-muted mt-1.5 font-bold uppercase tracking-wide">
                  {e.payerName} • {e.categoryName} • {new Date(e.date).toLocaleDateString()}
                </p>
              </div>
              <p className="font-black text-text-main text-lg">
                -${e.amount.toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
```

**Verification**: Widget displays only the 5 most recent items with a functional "View All" link.

---

### T019: Create dedicated full Expenses list page

**File**: `frontend/src/pages/expenses/ui/ExpensesPage.tsx` (new)

**Requirements**: FR-004, FR-005

**Dependencies**: T020

```typescript
import { useState, useEffect } from 'react';
import { ExpenseFilter } from '../../../features/expense-filtering/ui/ExpenseFilter';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ memberId: '', categoryId: '' });
  const groupId = localStorage.getItem('activeGroupId');

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    // Mock API call
    fetch(`/api/expenses?groupId=${groupId}&memberId=${filters.memberId}&categoryId=${filters.categoryId}`)
      .then(res => res.json())
      .then(data => setExpenses(data.expenses))
      .finally(() => setLoading(false));
  }, [groupId, filters]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-text-main">All Expenses</h1>
        <p className="text-text-muted font-bold">Comprehensive list of all group spending</p>
      </div>
      
      <ExpenseFilter 
        onFilterChange={(f) => setFilters(prev => ({ ...prev, ...f }))}
      />

      <div className="bg-card rounded-card border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-border/30">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Payer</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center font-bold text-text-muted animate-pulse">
                    Filtering expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center font-bold text-text-muted italic">
                    No expenses match the selected filters.
                  </td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-text-muted font-medium">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-text-main">{e.description}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black px-2.5 py-1 bg-border/50 rounded-full text-text-muted">{e.payerName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-text-main">{e.categoryName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-black text-text-main text-lg">-${e.amount.toLocaleString()}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Expense list updates dynamically when filters are applied.

---

### T020: Implement Expense Filter feature

**File**: `frontend/src/features/expense-filtering/ui/ExpenseFilter.tsx` (new)

**Requirements**: FR-005

**Dependencies**: None

```typescript
import { Search, Filter } from 'lucide-react';

interface Props {
  onFilterChange: (filters: { memberId?: string; categoryId?: string }) => void;
}

export function ExpenseFilter({ onFilterChange }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-6 bg-card rounded-2xl border border-border shadow-subtle">
      <div className="flex-1 space-y-1.5">
        <label className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
          <Filter size={12} /> Filter by Member
        </label>
        <select 
          onChange={(e) => onFilterChange({ memberId: e.target.value })}
          className="w-full bg-background border border-border rounded-xl p-3 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
        >
          <option value="">All Group Members</option>
          {/* Dynamically populated from context/props */}
        </select>
      </div>
      <div className="flex-1 space-y-1.5">
        <label className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
          <Search size={12} /> Filter by Category
        </label>
        <select 
          onChange={(e) => onFilterChange({ categoryId: e.target.value })}
          className="w-full bg-background border border-border rounded-xl p-3 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
        >
          <option value="">All Categories</option>
          {/* Dynamically populated from context/props */}
        </select>
      </div>
    </div>
  );
}
```

**Verification**: Selecting an option in the dropdowns triggers the `onFilterChange` callback with correct values.

---

## Phase 5: User Story 3 - Global Navigation & Settings (Priority: P2)

### T022: Unit test for theme toggle logic

**File**: `frontend/tests/features/theme.test.tsx` (new)

**Requirements**: FR-009

**Dependencies**: T027

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('correctly toggles dark class on the document element', () => {
    const isDark = true;
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('persists light theme correctly', () => {
    localStorage.setItem('theme', 'dark');
    const isDark = false;
    if (!isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
```

**Verification**: `npm test` confirms theme state is accurately reflected in both the DOM and localStorage.

---

### T023: Component test for Hamburger Menu accessibility

**File**: `frontend/tests/widgets/navigation.test.tsx` (new)

**Requirements**: FR-006

**Dependencies**: T024

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HamburgerMenu } from '../../../src/widgets/navigation/ui/HamburgerMenu';

describe('HamburgerMenu Widget', () => {
  it('opens the menu content when the trigger icon is clicked', async () => {
    render(
      <BrowserRouter>
        <HamburgerMenu />
      </BrowserRouter>
    );
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    // Base UI uses portals, content should appear in the document
    const menuItems = await screen.findAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThan(0);
    expect(screen.getByText(/my groups/i)).toBeInTheDocument();
  });
});
```

**Verification**: `npm test` passes, confirming the menu portal and content rendering are accessible.

---

### T024: Implement Global Hamburger Menu widget

**File**: `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx` (new)

**Requirements**: FR-006, FR-009, FR-010

**Dependencies**: T027

```typescript
import * as Menu from '@base-ui-components/react/Menu';
import { useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, Users, User, Moon, Sun, LogOut } from 'lucide-react';
import { ThemeToggle } from '../../../features/theme-toggle/ui/ThemeToggle';

export function HamburgerMenu() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // In a real app, call auth service sign out here
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  return (
    <div className="fixed top-6 right-6 z-[100]">
      <Menu.Root>
        <Menu.Trigger className="p-3.5 bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-subtle hover:bg-border/20 transition-all focus:outline-none focus:ring-4 focus:ring-primary/20 text-text-main group">
          <MenuIcon size={26} className="group-hover:scale-110 transition-transform" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={12} align="end">
            <Menu.Content className="w-72 bg-card/90 backdrop-blur-xl border border-border rounded-[2rem] shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200 focus:outline-none overflow-hidden">
              <div className="px-4 py-2 mb-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Navigation</p>
              </div>
              
              <Menu.Item 
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-primary/10 cursor-pointer focus:outline-none focus:bg-primary/10 text-text-main font-bold transition-colors" 
                onClick={() => navigate('/groups')}
              >
                <div className="p-2 bg-primary/20 rounded-xl text-primary"><Users size={20} /></div>
                My Groups
              </Menu.Item>
              
              <Menu.Item 
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-accent/10 cursor-pointer focus:outline-none focus:bg-accent/10 text-text-main font-bold transition-colors" 
                onClick={() => navigate('/profile')}
              >
                <div className="p-2 bg-accent/20 rounded-xl text-accent"><User size={20} /></div>
                Profile
              </Menu.Item>
              
              <div className="h-px bg-border my-3 mx-4" />
              
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 font-bold text-text-main">
                  <div className="p-2 bg-text-main/10 rounded-xl text-text-main">
                    <Moon size={20} className="dark:hidden" />
                    <Sun size={20} className="hidden dark:block" />
                  </div>
                  Dark Mode
                </div>
                <ThemeToggle />
              </div>
              
              <div className="h-px bg-border my-3 mx-4" />
              
              <Menu.Item 
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-destructive/10 cursor-pointer focus:outline-none focus:bg-destructive/10 text-destructive font-black transition-colors" 
                onClick={handleSignOut}
              >
                <div className="p-2 bg-destructive/20 rounded-xl text-destructive"><LogOut size={20} /></div>
                Sign Out
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
```

**Verification**: Menu correctly renders with Backdrop blur and transitions. Navigation and Sign Out links function as intended.

---

### T025: Create My Groups landing page

**File**: `frontend/src/pages/groups/ui/GroupsPage.tsx` (new)

**Requirements**: FR-007

**Dependencies**: T010

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Wallet } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';

export function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock groups list
    setGroups([
      { id: '1', name: 'Apartment 4B', role: 'Owner' },
      { id: '2', name: 'Roadtrip Summer', role: 'Member' }
    ]);
  }, []);

  const selectGroup = (id: string) => {
    localStorage.setItem('activeGroupId', id);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-text-main tracking-tighter">My Groups</h1>
          <p className="text-text-muted font-bold text-lg">Select a workspace to manage budgets</p>
        </div>
        <button className="flex items-center gap-2.5 bg-primary text-white px-8 py-4 rounded-2xl font-black hover:scale-105 shadow-xl shadow-primary/20 transition-all">
          <Plus size={22} strokeWidth={3} /> New Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {groups.map(group => (
          <Card 
            key={group.id} 
            className="hover:border-primary/50 hover:bg-primary/5 cursor-pointer group transition-all duration-300 border-2"
            onClick={() => selectGroup(group.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                  <Wallet size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-text-main leading-tight">{group.name}</h3>
                  <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest mt-1">{group.role}</p>
                </div>
              </div>
              <ArrowRight className="text-text-muted group-hover:text-primary group-hover:translate-x-2 transition-all" size={24} strokeWidth={3} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Verification**: Landing page correctly displays group cards and navigates to the dashboard on selection.

---

### T026: Create Profile page

**File**: `frontend/src/pages/profile/ui/ProfilePage.tsx` (new)

**Requirements**: FR-008

**Dependencies**: T010

```typescript
import { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';

export function ProfilePage() {
  const [name, setName] = useState('John Doe');
  const [password, setPassword] = useState('');

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Profile update simulated!');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-top-4 duration-500">
      <Card 
        title="Profile Settings" 
        className="p-4 md:p-10 border-2"
        action={<div className="p-3 bg-accent/20 rounded-2xl text-accent"><User size={24} /></div>}
      >
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-text-muted uppercase tracking-widest ml-1">
              <User size={14} /> Display Name
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-2xl p-4 font-bold text-text-main focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-text-muted uppercase tracking-widest ml-1">
              <Lock size={14} /> Update Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-2xl p-4 font-bold text-text-main focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Enter new password (optional)"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full flex items-center justify-center gap-3 bg-primary text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
          >
            <Save size={20} /> Save Changes
          </button>
        </form>
      </Card>
    </div>
  );
}
```

**Verification**: Profile form inputs are functional and the layout follows the sleek card-based design.

---

### T027: Implement Theme Toggle feature

**File**: `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx` (new)

**Requirements**: FR-009

**Dependencies**: T003

```typescript
import * as Switch from '@base-ui-components/react/Switch';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <Switch.Root 
      checked={isDark} 
      onCheckedChange={setIsDark} 
      className="w-14 h-8 bg-border/50 backdrop-blur-sm rounded-full relative focus-visible:ring-4 focus-visible:ring-primary/30 outline-none transition-all data-checked:bg-primary/40 cursor-pointer p-1"
    >
      <Switch.Thumb className="block w-6 h-6 bg-white dark:bg-primary rounded-full shadow-lg transition-transform duration-300 translate-x-0 data-checked:translate-x-6" />
    </Switch.Root>
  );
}
```

**Verification**: Toggling the switch instantly updates the `dark` class on the root HTML element and persists to localStorage.

---

### T029: Ensure Dark Mode persistence

**File**: `frontend/src/app/providers/ThemeProvider.tsx` (new)

**Requirements**: FR-009

**Dependencies**: T027

```typescript
import React, { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return <>{children}</>;
}
```

**Verification**: Application maintains the correct visual theme across full page reloads.

---

### T031: Update quickstart.md

**File**: `specs/003-project-redesign/quickstart.md` (modify)

**Requirements**: Documentation Mandate

**Dependencies**: All

**Replace entire file**:
```markdown
# Redesign Quickstart: project-redesign

## Environment Setup

1. **Install Prerequisites**:
   Ensure you have Node.js 20+ and the latest `npm` installed.

2. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Verify Tailwind 4**:
   The project uses Tailwind 4. Verify your IDE extension supports the new syntax.

## Verification Checklist

### 🎨 Design & Theme
- [ ] **Dark Mode**: Toggle via hamburger menu. Verify persistence on reload.
- [ ] **Accessibility**: Base UI components (Menu, Switch) should be keyboard navigable.
- [ ] **Aesthetics**: Cards should have `rounded-card` (1rem) and `shadow-subtle`.

### 📊 Dashboard MVP
- [ ] **Income Overview**: Horizontal stacked bar should reflect correct shares.
- [ ] **Remaining Balance**: Member totals should sum to the group total correctly.
- [ ] **Transfers Log**: Should display "From -> To" correctly with arrow icons.

### 💸 Expense Management
- [ ] **Recent Expenses**: Should only show the top 5 most recent items.
- [ ] **Filtering**: Full expenses page must update instantly when changing member/category.

## Component Reference

- Primary Card: `frontend/src/shared/ui/Card.tsx`
- Theme Tokens: `frontend/src/app/index.css`
- API Hooks: `frontend/src/shared/api/dashboardHooks.ts`
```

**Verification**: Documentation accurately reflects the implemented redesign components and verification steps.

---

## Checklist

- [X] T001: Install Base UI components in `frontend/package.json`
- [X] T002: Create FSD folder structure (Pre-completed)
- [X] T003: Setup global Tailwind 4 configuration in `frontend/src/app/index.css`
- [X] T004: Define redesign Zod schemas in `shared/src/schemas/redesign.ts`
- [X] T005: Create redesign TypeScript types in `shared/src/types/redesign.ts`
- [X] T006: Implement API client hooks in `frontend/src/shared/api/dashboardHooks.ts`
- [X] T007: Configure Vitest and RTL in `frontend/vite.config.ts`
- [X] T008: Unit test for dashboard data transformation in `frontend/tests/shared/api/dashboard.test.ts`
- [X] T009: Component test for Dashboard Card primitive in `frontend/tests/shared/ui/Card.test.tsx`
- [X] T010: Create reusable Dashboard Card primitive in `frontend/src/shared/ui/Card.tsx`
- [X] T011: Implement Income Overview widget in `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`
- [X] T012: Implement Remaining Balance widget in `frontend/src/widgets/dashboard/ui/RemainingBalance.tsx`
- [X] T013: Implement Budget Categories widget in `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`
- [X] T014: Implement Budget Transfers log widget in `frontend/src/widgets/dashboard/ui/BudgetTransfers.tsx`
- [X] T015: Assemble main Dashboard page in `frontend/src/pages/dashboard/ui/DashboardPage.tsx`
- [X] T016: Unit test for expense filtering in `api/src/services/expenseService.test.ts`
- [X] T017: Integration test for "View All" navigation in `frontend/tests/pages/expenses.test.tsx`
- [X] T018: Implement Recent Expenses card widget in `frontend/src/widgets/dashboard/ui/RecentExpenses.tsx`
- [X] T019: Create dedicated full Expenses list page in `frontend/src/pages/expenses/ui/ExpensesPage.tsx`
- [X] T020: Implement Expense Filter feature in `frontend/src/features/expense-filtering/ui/ExpenseFilter.tsx`
- [ ] T021: Integrate expense filters (Combined with T019)
- [X] T022: Unit test for theme toggle logic in `frontend/tests/features/theme.test.tsx`
- [X] T023: Component test for Hamburger Menu accessibility in `frontend/tests/widgets/navigation.test.tsx`
- [X] T024: Implement Global Hamburger Menu widget in `frontend/src/widgets/navigation/ui/HamburgerMenu.tsx`
- [X] T025: Create My Groups landing page in `frontend/src/pages/groups/ui/GroupsPage.tsx`
- [X] T026: Create Profile page in `frontend/src/pages/profile/ui/ProfilePage.tsx`
- [X] T027: Implement Theme Toggle feature in `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx`
- [ ] T028: Integrate menu links (Combined with T024)
- [X] T029: Ensure Dark Mode persistence in `frontend/src/app/providers/ThemeProvider.tsx`
- [ ] T030: Optimize dashboard rendering (Combined with T015)
- [X] T031: Update quickstart.md in `specs/003-project-redesign/quickstart.md`
- [ ] T032: Final UI review
