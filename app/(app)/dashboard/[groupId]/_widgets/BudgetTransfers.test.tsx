// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { queryKeys } from "../../../../../lib/query-keys";
import { createTransfer } from "../../../../../lib/actions/transfer";
import { BudgetTransfers } from "./BudgetTransfers";

vi.mock("../../../../../lib/actions/transfer", () => ({
  createTransfer: vi.fn(),
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

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

/** Mirrors `RecentExpenses.test.tsx`'s hydration helper — hydrates
 * `queryKeys.summary` so mounting never issues its own client fetch.
 * Returns the browser `QueryClient` so tests can inspect it. */
async function renderHydrated(summary: typeof SUMMARY_FIXTURE | null) {
  const serverClient = new QueryClient();
  if (summary !== null) {
    await serverClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(summary),
    });
  }
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

describe("BudgetTransfers", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.mocked(createTransfer).mockReset();
  });

  // dashboard-view: "Widget-Level Loading Indicators Use Skeleton, Not Plain
  // Text" — a shaped `BudgetTransfersSkeleton`, not a "Loading…" text node.
  it("shows a shaped skeleton, not plain text, before the summary query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <BudgetTransfers groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    const loading = screen.getByTestId("budget-transfers-loading");
    expect(loading).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
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

  it("renders each transfer with its category name from the hydrated cache without a client fetch", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    expect(await screen.findByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("€150.00")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "View All" });
    expect(link).toHaveAttribute("href", `/transfers/${GROUP_ID}`);
  });
});
