// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { queryKeys } from "../../../../../lib/query-keys";
import { create as createExpenseAction } from "../../../../../lib/actions/expense";
import { ExpenseForm } from "./ExpenseForm";
import { RecentExpenses } from "../_widgets/RecentExpenses";

/**
 * RED tests for `ExpenseForm` (16.6) — ported/adapted from `main`'s
 * `frontend/src/features/expense/ExpenseForm.test.tsx`. The invalidation
 * scenario is a cross-widget assertion per this PR's own instruction: mount
 * both `ExpenseForm` and `RecentExpenses` under one `QueryClientProvider`,
 * submit, and assert the new expense appears in `RecentExpenses` (dashboard-
 * view: "Recent Expenses and Quick-Add Share the Same Invalidation
 * Contract"). Genuine RED before this file existed — module not found.
 */
vi.mock("../../../../../lib/actions/expense", () => ({
  create: vi.fn(),
  update: vi.fn(),
}));

const mockCreate = vi.mocked(createExpenseAction);

const GROUP_ID = "group-1";

const CATEGORIES = [
  { id: "cat-1", name: "Groceries", monthlyBudget: 500, balances: [] },
  { id: "cat-2", name: "Transport", monthlyBudget: 200, balances: [] },
];

const MEMBERS = [{ id: "mem-1", name: "Alice" }];

function summaryFixture(recentExpenses: unknown[]) {
  return {
    groupName: "Roomies",
    ownerId: "user-1",
    totalIncome: 4000,
    totalBudget: 400,
    totalSpent: 120,
    members: [{ id: "mem-1", name: "Alice" }],
    recentExpenses,
    recentTransfers: [],
  };
}

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

describe("ExpenseForm", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    mockCreate.mockReset();
  });

  it("renders category options with name only — no icon prefix", () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <ExpenseForm groupId={GROUP_ID} categories={CATEGORIES} members={MEMBERS} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: /category/i }));
    expect(screen.getByRole("option", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Transport" })).toBeInTheDocument();
  });

  it("a valid quick-add submission creates the expense and invalidates the group cache so RecentExpenses shows it", async () => {
    mockCreate.mockResolvedValue({
      ok: true,
      data: { id: "expense-new" },
    } as unknown as Awaited<ReturnType<typeof createExpenseAction>>);

    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(summaryFixture([])),
    });

    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            summaryFixture([
              {
                id: "expense-new",
                description: "Milk",
                amount: 5,
                date: "2026-08-11T00:00:00.000Z",
                categoryName: "Groceries",
                categoryId: "cat-1",
                payerName: "Alice",
                payerId: "mem-1",
              },
            ]),
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ExpenseForm groupId={GROUP_ID} categories={CATEGORIES} members={MEMBERS} />
        <RecentExpenses groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Milk" },
    });
    fireEvent.change(screen.getByLabelText("Amount (€)"), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByRole("combobox", { name: /category/i }));
    const option = screen.getByRole("option", { name: "Groceries" });
    fireEvent.pointerMove(option);
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);

    fireEvent.click(screen.getByRole("button", { name: "Log Expense" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeInTheDocument();
    });
  });
});
