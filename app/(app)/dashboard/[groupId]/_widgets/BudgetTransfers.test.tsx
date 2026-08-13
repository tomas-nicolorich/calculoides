// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { queryKeys } from "../../../../../lib/query-keys";
import { create } from "../../../../../lib/actions/transfer";
import { BudgetTransfers } from "./BudgetTransfers";

vi.mock("../../../../../lib/actions/transfer", () => ({
  create: vi.fn(),
  deleteTransfer: vi.fn(),
  deleteAll: vi.fn(),
}));

const GROUP_ID = "22222222-2222-4222-8222-222222222222";

const MEMBERS_FIXTURE = [
  {
    id: "m1",
    userId: "u1",
    name: "Alice Smith",
    income: 3000,
    share: 60,
    spent: 700,
    remainingQuota: 800,
    budgeted: 1500,
  },
  {
    id: "m2",
    userId: "u2",
    name: "Bob",
    income: 2000,
    share: 40,
    spent: 500,
    remainingQuota: 500,
    budgeted: 1000,
  },
];

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: "user-1",
  totalIncome: 5000,
  totalBudget: 2500,
  totalSpent: 1200,
  members: MEMBERS_FIXTURE,
  recentExpenses: [],
  recentTransfers: [
    {
      id: "t1",
      categoryId: "c1",
      categoryName: "Rent",
      categoryIcon: "home",
      fromMemberName: "Alice Smith",
      fromMemberId: "m1",
      toMemberName: "Bob",
      toMemberId: "m2",
      amount: 150,
      date: "2026-06-20T00:00:00.000Z",
    },
  ],
};

const CATEGORIES_FIXTURE = [
  { id: "c1", name: "Rent", monthlyBudget: 1000, balances: [] },
  { id: "c2", name: "Groceries", monthlyBudget: 400, balances: [] },
];

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

/** Mirrors `RecentExpenses.test.tsx`'s hydration helper, extended to also
 * hydrate `queryKeys.categories` (the inline create-transfer form's category
 * options) so mounting never issues its own client fetch either. Returns the
 * browser `QueryClient` so mutation-invalidation tests can inspect it. */
async function renderHydrated(
  summary: typeof SUMMARY_FIXTURE | null,
  categories: typeof CATEGORIES_FIXTURE = CATEGORIES_FIXTURE,
) {
  const serverClient = new QueryClient();
  if (summary !== null) {
    await serverClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(summary),
    });
  }
  await serverClient.prefetchQuery({
    queryKey: queryKeys.categories(GROUP_ID),
    queryFn: () => Promise.resolve(categories),
  });
  const dehydratedState = dehydrate(serverClient);
  const browserClient = createQueryClient();
  render(
    <QueryClientProvider client={browserClient}>
      <HydrationBoundary state={dehydratedState}>
        <BudgetTransfers groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return browserClient;
}

/** Base UI's `Select.Item` only commits once pointer-highlighted first —
 * mirrors `Select.test.tsx`'s `selectOption` helper. */
function selectOption(name: string) {
  const option = screen.getByRole("option", { name });
  fireEvent.pointerMove(option);
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

describe("BudgetTransfers", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.mocked(create).mockReset();
  });

  it("shows a loading state before the summary query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <BudgetTransfers groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("budget-transfers-loading")).toBeInTheDocument();
  });

  it("shows an error state when the summary query fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(
      <QueryClientProvider
        client={createQueryClient({ queries: { retry: false } })}
      >
        <BudgetTransfers groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load budget transfers/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no recent transfers", async () => {
    await renderHydrated({ ...SUMMARY_FIXTURE, recentTransfers: [] });

    expect(await screen.findByText("No recent transfers")).toBeInTheDocument();
  });

  // ui-design-system: "A transfer-related badge uses the transfer variant" —
  // the first real consumer of `Badge tone="transfer"`.
  it("renders each transfer with a transfer-tone category badge from the hydrated cache without a client fetch", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    const badge = await screen.findByTestId("transfer-badge");
    expect(badge).toHaveTextContent("Rent");
    expect(screen.getByText("€150.00")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "View All" });
    expect(link).toHaveAttribute("href", `/transfers/${GROUP_ID}`);
  });

  // dashboard-view: "Creating a transfer invalidates the group cache" — a
  // valid inline transfer form submission calls `lib/actions/transfer.create`
  // and, on success, `queryKeys.group(groupId)` invalidates so
  // `BudgetTransfers`/`RemainingBalance` both reflect the new transfer.
  // Two assertions: the widget's own list re-renders with the new transfer,
  // and a companion assertion confirms the *same* `queryKeys.summary` key
  // `RemainingBalance` reads was refetched (proof of invalidation).
  it("submits a new transfer via transfer.create, and the invalidated summary cache is refetched so the widget's own list reflects it", async () => {
    vi.mocked(create).mockResolvedValue({
      ok: true,
      data: { id: "t2" },
    } as Awaited<ReturnType<typeof create>>);
    const updatedSummary = {
      ...SUMMARY_FIXTURE,
      recentTransfers: [
        ...SUMMARY_FIXTURE.recentTransfers,
        {
          id: "t2",
          categoryId: "c2",
          categoryName: "Groceries",
          categoryIcon: "shopping-cart",
          fromMemberName: "Bob",
          fromMemberId: "m2",
          toMemberName: "Alice Smith",
          toMemberId: "m1",
          amount: 40,
          date: "2026-06-21T00:00:00.000Z",
        },
      ],
    };
    fetchMock.mockImplementation((url: string) =>
      url.includes("/api/summary")
        ? jsonResponse(updatedSummary)
        : jsonResponse(CATEGORIES_FIXTURE),
    );

    await renderHydrated(SUMMARY_FIXTURE);
    await screen.findByTestId("transfer-badge");

    fireEvent.click(screen.getByLabelText("Category"));
    selectOption("Groceries");
    fireEvent.click(screen.getByLabelText("From"));
    selectOption("Bob");
    fireEvent.click(screen.getByLabelText("To"));
    selectOption("Alice Smith");
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "40" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Transfer" }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        {
          categoryId: "c2",
          fromMemberId: "m2",
          toMemberId: "m1",
          amount: 40,
        },
        expect.anything(),
      );
    });

    // Companion assertion: invalidation refetched the exact key
    // `RemainingBalance` shares — proof both widgets reflect the change.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/summary?groupId="),
      );
    });
    // The widget's own list re-renders with the new transfer.
    await waitFor(() => {
      const badges = screen.getAllByTestId("transfer-badge");
      expect(badges.map((b) => b.textContent)).toContain("Groceries");
    });
  });
});
