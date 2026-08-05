import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryService } from "./summary";
import { prisma } from "../../../api/_src/utils/prisma";

// Mirrors `api/_tests/integration/summary.test.ts`'s mocking pattern — the
// approval-test baseline for the identical computation this module ports out
// of `api/_src/handlers/transactions.ts`'s inline `summary` action (2.1).
vi.mock("../../../api/_src/utils/prisma", () => ({
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

describe("SummaryService.getGroupSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes totals and per-member breakdown from real fixture data", async () => {
    // `prisma` is `vi.mock`ed above into plain `vi.fn()`s per model — same
    // `unbound-method`/`no-unsafe-argument` false-positive class as
    // `lib/server/authz.test.ts`, silenced the same way throughout this
    // file's fixtures.
    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: CATEGORY_ID,
        name: "Groceries",
        monthlyBudget: 400,
        memberLinks: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    // `SummaryService.getGroupSummary` calls `expense.findMany` twice, in a
    // fixed order: (1) current-month totals (date-filtered), then (2)
    // `recentExpensesRaw` (orderBy + take: 5). `mockResolvedValueOnce`
    // chaining (the pattern `api/_tests/integration/summary.test.ts` — the
    // approval-test baseline this ports from — uses) matches Prisma's
    // `PrismaPromise` return type exactly, unlike `mockImplementation`,
    // which requires a hand-typed signature and previously broke
    // `tsc --noEmit -p tsconfig.next.json` (fixed here, see apply-progress
    // Phase 2 "Issues Found").
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(prisma.expense.findMany)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .mockResolvedValueOnce([
        {
          id: EXPENSE_ID,
          categoryId: CATEGORY_ID,
          payerId: MEMBER_A,
          amount: 120,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .mockResolvedValueOnce([
        {
          id: EXPENSE_ID,
          description: "Weekly shop",
          amount: 120,
          date: new Date("2026-08-01T00:00:00.000Z"),
          categoryId: CATEGORY_ID,
          payerId: MEMBER_A,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ]);

    // eslint-disable-next-line @typescript-eslint/unbound-method
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const summary = await SummaryService.getGroupSummary(GROUP_ID);

    expect(summary).toBeNull();
  });
});
