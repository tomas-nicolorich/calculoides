/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryService } from "./summary";
import { prisma } from "../../prisma";

// Mirrors `api/_tests/integration/summary.test.ts`'s mocking pattern — the
// approval-test baseline for the identical computation this module ports out
// of `api/_src/handlers/transactions.ts`'s inline `summary` action (2.1).
// The three extra describe blocks below (identity fields, dedup-refactor
// parity, derived-values-are-live) were rehomed here verbatim from that
// integration file in 6b.5, once `api/transactions.ts` — its only caller —
// was deleted: `SummaryService.getGroupSummary` performs the exact same
// computation `routes.summary` did (see this module's own doc comment), so
// calling the service directly preserves the identical coverage.
vi.mock("../../prisma", () => ({
  prisma: {
    group: { findUnique: vi.fn() },
    category: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    transfer: { findMany: vi.fn() },
  },
}));

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const GROUP_ID = "33333333-3333-4333-8333-333333333333";
const MEMBER_A = "44444444-4444-4444-8444-444444444444";
const MEMBER_B = "55555555-5555-4555-8555-555555555555";
const CATEGORY_ID = "66666666-6666-4666-8666-666666666666";
const EXPENSE_ID = "77777777-7777-4777-8777-777777777777";
const TRANSFER_ID = "88888888-8888-4888-8888-888888888888";

describe("SummaryService.getGroupSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes totals and per-member breakdown from real fixture data", async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Roomies",
      ownerId: USER_A,
      members: [
        {
          id: MEMBER_A,
          userId: USER_A,
          income: 3000,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: USER_B,
          income: 1000,
          user: { name: "Bob", email: "bob@example.com" },
        },
      ],
    } as any);

    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: CATEGORY_ID,
        name: "Groceries",
        monthlyBudget: 400,
        memberLinks: [],
      },
    ] as any);

    // `SummaryService.getGroupSummary` calls `expense.findMany` twice, in a
    // fixed order: (1) current-month totals (date-filtered), then (2)
    // `recentExpensesRaw` (orderBy + take: 5). `mockResolvedValueOnce`
    // chaining matches Prisma's `PrismaPromise` return type exactly, unlike
    // `mockImplementation`, which requires a hand-typed signature and
    // previously broke `tsc --noEmit -p tsconfig.next.json` (fixed here, see
    // apply-progress Phase 2 "Issues Found").
    vi.mocked(prisma.expense.findMany)
      .mockResolvedValueOnce([
        {
          id: EXPENSE_ID,
          categoryId: CATEGORY_ID,
          payerId: MEMBER_A,
          amount: 120,
        } as any,
      ])
      .mockResolvedValueOnce([
        {
          id: EXPENSE_ID,
          description: "Weekly shop",
          amount: 120,
          date: new Date("2026-08-01T00:00:00.000Z"),
          categoryId: CATEGORY_ID,
          payerId: MEMBER_A,
        } as any,
      ]);

    vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);

    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary).not.toBeNull();
    expect(summary?.groupName).toBe("Roomies");
    expect(summary?.ownerId).toBe(USER_A);
    expect(summary?.totalIncome).toBe(4000);
    expect(summary?.totalBudget).toBe(400);
    expect(summary?.totalSpent).toBe(120);
    expect(summary?.members).toHaveLength(2);

    const alice = summary?.members.find((m) => m.id === MEMBER_A);
    // 3000/4000 income share = 75% -> spent all of the shared $120 herself.
    expect(alice?.share).toBeCloseTo(75, 0);
    expect(alice?.spent).toBe(120);

    expect(summary?.recentExpenses).toHaveLength(1);
    expect(summary?.recentExpenses[0]?.categoryName).toBe("Groceries");
    expect(summary?.recentExpenses[0]?.payerName).toBe("Alice");
  });

  it("returns null when the group does not exist", async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary).toBeNull();
  });
});

describe("SummaryService.getGroupSummary — identity fields (Seam B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Test Group",
      ownerId: USER_A,
      members: [
        {
          id: MEMBER_A,
          userId: USER_A,
          income: 1000,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: USER_B,
          income: 1000,
          user: { name: "Bob", email: "bob@example.com" },
        },
      ],
    } as any);

    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: CATEGORY_ID,
        name: "Groceries",
        monthlyBudget: 500,
        memberLinks: [],
      },
    ] as any);

    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      {
        id: EXPENSE_ID,
        categoryId: CATEGORY_ID,
        payerId: MEMBER_A,
        description: "Milk",
        amount: 12.5,
        date: new Date("2026-06-10T10:00:00.000Z"),
      },
    ] as any);

    vi.mocked(prisma.transfer.findMany).mockResolvedValue([
      {
        id: TRANSFER_ID,
        categoryId: CATEGORY_ID,
        amount: 30,
        date: new Date("2026-06-12T10:00:00.000Z"),
        fromMember: { memberId: MEMBER_A },
        toMember: { memberId: MEMBER_B },
      },
    ] as any);
  });

  it("recent expenses carry payerId + categoryId with correct values", async () => {
    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary?.recentExpenses).toHaveLength(1);
    const expense = summary?.recentExpenses[0];
    expect(expense?.id).toBe(EXPENSE_ID);
    expect(expense?.categoryId).toBe(CATEGORY_ID);
    expect(expense?.payerId).toBe(MEMBER_A);
    // Guard against an accidental field swap.
    expect(expense?.payerId).not.toBe(expense?.categoryId);
  });

  it("transfers carry fromMemberId + toMemberId with correct values", async () => {
    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary?.recentTransfers).toHaveLength(1);
    const transfer = summary?.recentTransfers[0];
    expect(transfer?.id).toBe(TRANSFER_ID);
    expect(transfer?.fromMemberId).toBe(MEMBER_A);
    expect(transfer?.toMemberId).toBe(MEMBER_B);
    // Guard against an accidental field swap.
    expect(transfer?.fromMemberId).not.toBe(transfer?.toMemberId);
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
    ] as any);

    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary?.recentExpenses).toHaveLength(1);
    expect(summary?.recentExpenses[0]?.id).toBe(EXPENSE_ID);
  });
});

// Regression/characterization baseline for a pre-migration dedup refactor:
// pins the exact per-member `budgeted`/`remainingQuota` output of the shared
// `calculateMemberBudgetedTotals` helper this service reuses. Must keep
// passing byte-for-byte — it is the safety net proving the dedup is
// behavior-preserving.
describe("SummaryService.getGroupSummary — members budgeted/remainingQuota parity (dedup safety net)", () => {
  const MEMBER_C = "99999999-9999-4999-8999-999999999999"; // zero-income, excluded from quota allocation
  const CATEGORY_2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // restricted to MEMBER_A only
  const EXPENSE_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const TRANSFER_2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Test Group",
      ownerId: USER_A,
      members: [
        {
          id: MEMBER_A,
          userId: USER_A,
          income: 600,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: USER_B,
          income: 400,
          user: { name: "Bob", email: "bob@example.com" },
        },
        {
          id: MEMBER_C,
          userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          income: 0,
          user: { name: "Cora", email: "cora@example.com" },
        },
      ],
    } as any);

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
    ] as any);

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
    ] as any);

    // Flat fromMemberId/toMemberId are what the balance-calc loop actually
    // reads; nested fromMember/toMember are what the separate
    // recentTransfers mapping reads. Both must be present or the service
    // throws.
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
    ] as any);
  });

  it("computes exact totals and per-member budgeted/remainingQuota for a fixed fixture", async () => {
    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary?.totalIncome).toBe(1000);
    expect(summary?.totalBudget).toBe(700);
    expect(summary?.totalSpent).toBe(80);

    const byId = new Map((summary?.members ?? []).map((m) => [m.id, m]));

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

// Regression test for spec requirement "Derived Figures Refresh Live, Never
// Persisted" (dashboard-income-edit): the service must recompute
// income/share/quota/ceiling figures live from each member's current
// `income` column on every call — never from a cached/stored derived field.
// Two mechanisms are asserted: (1) a decoy `share`/`percentage` field
// injected into the raw DB row is ignored entirely; (2) a fresh call after a
// simulated income change (what an income-update + refreshSummary()/
// getSummary() round-trip does) reflects the new value immediately.
describe("SummaryService.getGroupSummary — derived values are computed live, never persisted", () => {
  function mockGroupWithIncomes(incomeA: number, incomeB: number) {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: GROUP_ID,
      name: "Test Group",
      ownerId: USER_A,
      members: [
        {
          id: MEMBER_A,
          userId: USER_A,
          income: incomeA,
          // Decoy stored derived fields: if a persisted share/percentage
          // column ever existed on the row, the service must ignore it and
          // recompute purely from `income`.
          share: 999,
          percentage: 999,
          user: { name: "Alice", email: "alice@example.com" },
        },
        {
          id: MEMBER_B,
          userId: USER_B,
          income: incomeB,
          share: 999,
          percentage: 999,
          user: { name: "Bob", email: "bob@example.com" },
        },
      ],
    } as any);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);
  });

  it("ignores decoy stored share/percentage fields and derives share solely from income", async () => {
    mockGroupWithIncomes(1000, 1000);

    const summary = await SummaryService.getGroupSummary(GROUP_ID);
    const byId = new Map((summary?.members ?? []).map((m) => [m.id, m]));

    // Equal incomes -> equal 50/50 share, NOT the decoy 999 value.
    expect(byId.get(MEMBER_A)?.share).toBe(50);
    expect(byId.get(MEMBER_B)?.share).toBe(50);
  });

  it("recomputes totalIncome and per-member share live after an income change, without any persisted derived field", async () => {
    mockGroupWithIncomes(1000, 1000);

    const before = await SummaryService.getGroupSummary(GROUP_ID);
    expect(before?.totalIncome).toBe(2000);
    const byIdBefore = new Map((before?.members ?? []).map((m) => [m.id, m]));
    expect(byIdBefore.get(MEMBER_A)?.share).toBe(50);

    // Simulate what happens server-side after an `update-income` call: only
    // the raw `income` column changes (proven in
    // api/_tests/logic/group.test.ts), nothing derived is written anywhere.
    // A fresh call (= refreshSummary()/getSummary() from the client) must
    // recompute live from the new income.
    mockGroupWithIncomes(3000, 1000);

    const after = await SummaryService.getGroupSummary(GROUP_ID);
    expect(after?.totalIncome).toBe(4000);
    const byIdAfter = new Map((after?.members ?? []).map((m) => [m.id, m]));
    // 3000:1000 income ratio -> 75/25 share, recomputed live — not the stale
    // 50/50 from before, and not the decoy 999 stored on the row.
    expect(byIdAfter.get(MEMBER_A)?.share).toBe(75);
    expect(byIdAfter.get(MEMBER_B)?.share).toBe(25);
  });
});
