// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { queryKeys } from "../../../../../lib/query-keys";
import { QuickAddExpense } from "./QuickAddExpense";

/**
 * Composes `ExpenseForm` as a dashboard quick-action (16.8's REFACTOR
 * requirement): a trigger button + `ResponsiveDialog`, matching `main`'s
 * `DashboardPage` "Add Expense" placement, not a full-page form. Genuine
 * RED before this file existed — module not found.
 */
vi.mock("../../../../../lib/actions/expense", () => ({
  create: vi.fn(),
  update: vi.fn(),
}));

const GROUP_ID = "group-1";

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: "user-1",
  totalIncome: 4000,
  totalBudget: 400,
  totalSpent: 120,
  members: [{ id: "mem-1", name: "Alice" }],
  recentExpenses: [],
  recentTransfers: [],
};

const CATEGORIES_FIXTURE = [
  { id: "cat-1", name: "Groceries", monthlyBudget: 500, balances: [] },
];

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

async function renderHydrated() {
  const serverClient = new QueryClient();
  await Promise.all([
    serverClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(SUMMARY_FIXTURE),
    }),
    serverClient.prefetchQuery({
      queryKey: queryKeys.categories(GROUP_ID),
      queryFn: () => Promise.resolve(CATEGORIES_FIXTURE),
    }),
  ]);
  const dehydratedState = dehydrate(serverClient);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <HydrationBoundary state={dehydratedState}>
        <QuickAddExpense groupId={GROUP_ID} currentUserId="user-2" />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
}

describe("QuickAddExpense", () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders only trigger buttons until clicked — no dialog, no full-page form", async () => {
    await renderHydrated();

    // Desktop button + mobile FAB, both labeled "Add Expense" (CSS-gated by
    // breakpoint, both present in the a11y tree in jsdom).
    expect(
      screen.getAllByRole("button", { name: /add expense/i }),
    ).toHaveLength(2);
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
  });

  it("clicking the trigger opens a dialog with ExpenseForm's fields, prefilled from the hydrated cache", async () => {
    await renderHydrated();

    fireEvent.click(
      screen.getAllByRole("button", { name: /add expense/i })[0],
    );

    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: /category/i }));
    expect(screen.getByRole("option", { name: "Groceries" })).toBeInTheDocument();
  });

  // design.md Decision 4: `useCategoriesList(groupId, open)` — a closed
  // dialog must not fire a client fetch for a cold `categories` cache
  // (the exact waterfall that would break the nested-region hydration
  // ordering), and opening it must fetch on demand like any other
  // `enabled`-gated query.
  it("does not fetch categories while the dialog is closed, and fetches once opened", async () => {
    // `categories` intentionally left cold — only `summary` is hydrated,
    // mirroring `QuickAddExpense` living inside `SummaryRegion`'s boundary
    // while `CategoriesRegion`'s boundary hydrates independently.
    const serverClient = new QueryClient();
    await serverClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(SUMMARY_FIXTURE),
    });
    const dehydratedState = dehydrate(serverClient);

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(CATEGORIES_FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <HydrationBoundary state={dehydratedState}>
          <QuickAddExpense groupId={GROUP_ID} currentUserId="user-2" />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/categories"),
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /add expense/i })[0],
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/categories"),
      );
    });
  });
});
