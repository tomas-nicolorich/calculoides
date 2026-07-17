/* eslint-disable @typescript-eslint/unbound-method */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routes } from "../../_src/handlers/transactions";
import { prisma } from "../../_src/utils/prisma";
import type {
  ApiResponse,
  AuthenticatedRequest,
} from "../../_src/middleware/handler";

// Mock Prisma — the summary builder reads group/categories/expenses/transfers.
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    group: { findUnique: vi.fn() },
    category: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    transfer: { findMany: vi.fn() },
  },
}));

// Distinct UUIDs so a field swap/duplication bug fails the assertions.
const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const MEMBER_A = "33333333-3333-4333-8333-333333333333"; // payer / fromMember
const MEMBER_B = "44444444-4444-4444-8444-444444444444"; // toMember
const CATEGORY_ID = "55555555-5555-4555-8555-555555555555";
const EXPENSE_ID = "66666666-6666-4666-8666-666666666666";
const TRANSFER_ID = "77777777-7777-4777-8777-777777777777";

function makeRes() {
  const captured: { status: number; body: unknown } = {
    status: 0,
    body: undefined,
  };
  const res = {
    headersSent: false,
    setHeader: vi.fn(),
    status(code: number) {
      captured.status = code;
      return this as unknown as ApiResponse;
    },
    json(data: unknown) {
      captured.body = data;
    },
  };
  return { res: res as unknown as ApiResponse, captured };
}

interface SummaryPayload {
  recentExpenses: {
    id: string;
    categoryId: string;
    payerId: string;
  }[];
  recentTransfers: {
    id: string;
    fromMemberId: string;
    toMemberId: string;
  }[];
}

describe("Dashboard summary — identity fields (Seam B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Test Group",
      ownerId: USER_ID,
      members: [
        {
          id: MEMBER_A,
          userId: USER_ID,
          income: 1000,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: "99999999-9999-4999-8999-999999999999",
          income: 1000,
          user: { name: "Bob", email: "bob@example.com" },
        },
      ],
    } as never);

    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: CATEGORY_ID,
        name: "Groceries",
        monthlyBudget: 500,
        memberLinks: [],
      },
    ] as never);

    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      {
        id: EXPENSE_ID,
        categoryId: CATEGORY_ID,
        payerId: MEMBER_A,
        description: "Milk",
        amount: 12.5,
        date: new Date("2026-06-10T10:00:00.000Z"),
      },
    ] as never);

    vi.mocked(prisma.transfer.findMany).mockResolvedValue([
      {
        id: TRANSFER_ID,
        categoryId: CATEGORY_ID,
        amount: 30,
        date: new Date("2026-06-12T10:00:00.000Z"),
        fromMember: { memberId: MEMBER_A },
        toMember: { memberId: MEMBER_B },
      },
    ] as never);
  });

  it("recent expenses carry payerId + categoryId with correct values", async () => {
    const req = {
      query: { groupId: GROUP_ID },
      user: { id: USER_ID },
    } as unknown as AuthenticatedRequest;
    const { res, captured } = makeRes();

    const summary = routes.summary;
    if (!summary) throw new Error("routes.summary is not registered");
    await summary(req, res);

    expect(captured.status).toBe(200);
    const body = captured.body as SummaryPayload;

    expect(body.recentExpenses).toHaveLength(1);
    const expense = body.recentExpenses[0];
    expect(expense.id).toBe(EXPENSE_ID);
    expect(expense.categoryId).toBe(CATEGORY_ID);
    expect(expense.payerId).toBe(MEMBER_A);
    // Guard against an accidental field swap.
    expect(expense.payerId).not.toBe(expense.categoryId);
  });

  it("transfers carry fromMemberId + toMemberId with correct values", async () => {
    const req = {
      query: { groupId: GROUP_ID },
      user: { id: USER_ID },
    } as unknown as AuthenticatedRequest;
    const { res, captured } = makeRes();

    const summary = routes.summary;
    if (!summary) throw new Error("routes.summary is not registered");
    await summary(req, res);

    expect(captured.status).toBe(200);
    const body = captured.body as SummaryPayload;

    expect(body.recentTransfers).toHaveLength(1);
    const transfer = body.recentTransfers[0];
    expect(transfer.id).toBe(TRANSFER_ID);
    expect(transfer.fromMemberId).toBe(MEMBER_A);
    expect(transfer.toMemberId).toBe(MEMBER_B);
    // Guard against an accidental field swap.
    expect(transfer.fromMemberId).not.toBe(transfer.toMemberId);
  });

  it("recent expenses from a prior month still appear (not filtered to current month)", async () => {
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      {
        id: EXPENSE_ID,
        categoryId: CATEGORY_ID,
        payerId: MEMBER_A,
        description: "Rent",
        amount: 900,
        date: new Date("2026-04-05T10:00:00.000Z"),
      },
    ] as never);

    const req = {
      query: { groupId: GROUP_ID },
      user: { id: USER_ID },
    } as unknown as AuthenticatedRequest;
    const { res, captured } = makeRes();

    const summary = routes.summary;
    if (!summary) throw new Error("routes.summary is not registered");
    await summary(req, res);

    const body = captured.body as SummaryPayload;
    expect(body.recentExpenses).toHaveLength(1);
    expect(body.recentExpenses[0].id).toBe(EXPENSE_ID);
  });
});

interface MembersSummaryEntry {
  id: string;
  income: number;
  spent: number;
  remainingQuota: number;
  budgeted: number;
}

interface FullSummaryPayload {
  totalIncome: number;
  totalBudget: number;
  totalSpent: number;
  members: MembersSummaryEntry[];
}

// Regression/characterization baseline for Phase 3 (transactions.ts summary
// dedup refactor): pins the exact per-member `budgeted`/`remainingQuota`
// output BEFORE the inline loop is refactored to reuse
// `calculateMemberBudgetedTotals`. Must keep passing byte-for-byte after the
// refactor — it is the safety net proving the dedup is behavior-preserving.
describe("Dashboard summary — members budgeted/remainingQuota parity (Phase 3 dedup safety net)", () => {
  const MEMBER_C = "88888888-8888-4888-8888-888888888888"; // zero-income, excluded from quota allocation
  const CATEGORY_2 = "99999999-9999-4999-8999-999999999999"; // restricted to MEMBER_A only
  const EXPENSE_2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const TRANSFER_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Test Group",
      ownerId: USER_ID,
      members: [
        {
          id: MEMBER_A,
          userId: USER_ID,
          income: 600,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: "99999999-9999-4999-8999-999999999998",
          income: 400,
          user: { name: "Bob", email: "bob@example.com" },
        },
        {
          id: MEMBER_C,
          userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          income: 0,
          user: { name: "Cora", email: "cora@example.com" },
        },
      ],
    } as never);

    // Category 1: unrestricted (all members eligible; MEMBER_C excluded by
    // zero income). Category 2: restricted to MEMBER_A only.
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: CATEGORY_ID,
        name: "Groceries",
        monthlyBudget: 500,
        memberLinks: [],
      },
      {
        id: CATEGORY_2,
        name: "Alice-only",
        monthlyBudget: 200,
        memberLinks: [{ memberId: MEMBER_A }],
      },
    ] as never);

    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      {
        id: EXPENSE_ID,
        categoryId: CATEGORY_ID,
        payerId: MEMBER_A,
        description: "Milk",
        amount: 50,
        date: new Date("2026-06-10T10:00:00.000Z"),
      },
      {
        id: EXPENSE_2,
        categoryId: CATEGORY_ID,
        payerId: MEMBER_B,
        description: "Bread",
        amount: 30,
        date: new Date("2026-06-11T10:00:00.000Z"),
      },
    ] as never);

    // Flat fromMemberId/toMemberId are what the balance-calc loop actually
    // reads; nested fromMember/toMember are what the separate recentTransfers
    // mapping reads. Both must be present or the handler throws.
    vi.mocked(prisma.transfer.findMany).mockResolvedValue([
      {
        id: TRANSFER_2,
        categoryId: CATEGORY_ID,
        amount: 20,
        date: new Date("2026-06-12T10:00:00.000Z"),
        fromMemberId: MEMBER_B,
        toMemberId: MEMBER_A,
        fromMember: { memberId: MEMBER_B },
        toMember: { memberId: MEMBER_A },
      },
    ] as never);
  });

  it("computes exact totals and per-member budgeted/remainingQuota for a fixed fixture", async () => {
    const req = {
      query: { groupId: GROUP_ID },
      user: { id: USER_ID },
    } as unknown as AuthenticatedRequest;
    const { res, captured } = makeRes();

    const summary = routes.summary;
    if (!summary) throw new Error("routes.summary is not registered");
    await summary(req, res);

    expect(captured.status).toBe(200);
    const body = captured.body as FullSummaryPayload;

    expect(body.totalIncome).toBe(1000);
    expect(body.totalBudget).toBe(700);
    expect(body.totalSpent).toBe(80);

    const byId = new Map(body.members.map((m) => [m.id, m]));

    // Category 1 (unrestricted, budget 500, income-weighted A:600/B:400):
    // base quota A=300/B=200, +/-20 transfer B->A => A=320/B=180, C excluded=0.
    // Category 2 (restricted to A, budget 200): A=200 (sole eligible member).
    // budgeted = sum of totalQuota across categories the member participates in.
    expect(byId.get(MEMBER_A)).toMatchObject({
      income: 600,
      spent: 50,
      budgeted: 520, // 320 (cat1) + 200 (cat2)
      remainingQuota: 470, // (320 - 50 expense) + (200 - 0 expense)
    });
    expect(byId.get(MEMBER_B)).toMatchObject({
      income: 400,
      spent: 30,
      budgeted: 180, // cat1 only; not linked to cat2
      remainingQuota: 150, // 180 - 30 expense
    });
    expect(byId.get(MEMBER_C)).toMatchObject({
      income: 0,
      spent: 0,
      budgeted: 0, // zero-income excluded from all category allocation
      remainingQuota: 0,
    });
  });
});
