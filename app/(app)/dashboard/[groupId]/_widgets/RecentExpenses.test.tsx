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
import { RecentExpenses } from "./RecentExpenses";

const GROUP_ID = "22222222-2222-4222-8222-222222222222";

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: "user-1",
  totalIncome: 5000,
  totalBudget: 2500,
  totalSpent: 1200,
  members: [
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
  ],
  recentExpenses: [
    {
      id: "e1",
      description: "Weekly shop",
      amount: 42.5,
      date: "2026-06-20T00:00:00.000Z",
      categoryName: "Groceries",
      categoryId: "c1",
      payerName: "Alice Smith",
      payerId: "m1",
    },
  ],
  recentTransfers: [],
};

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

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
        <RecentExpenses groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
}

describe("RecentExpenses", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // dashboard-view: "Widget-Level Loading Indicators Use Skeleton, Not Plain
  // Text" — a shaped `RecentExpensesSkeleton`, not a "Loading…" text node.
  it("shows a shaped skeleton, not plain text, before the summary query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <RecentExpenses groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    const loading = screen.getByTestId("recent-expenses-loading");
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
        <RecentExpenses groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load recent expenses/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no recent expenses", async () => {
    await renderHydrated({ ...SUMMARY_FIXTURE, recentExpenses: [] });

    expect(await screen.findByText("No recent expenses")).toBeInTheDocument();
  });

  it("renders each expense from the hydrated cache without a client fetch", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    expect(await screen.findByText("Weekly shop")).toBeInTheDocument();
    expect(screen.getByTestId("expense-marker")).toBeInTheDocument();
    expect(screen.getByText("-€42.50")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the payer avatar initial resolved from payerId", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    expect(await screen.findByText("AS")).toBeInTheDocument();
  });

  it("renders only the payer first name, not the full name, on the sub-line", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    await screen.findByText("Weekly shop");
    const subLine = screen.getByText("Alice").closest("p");
    expect(subLine?.textContent).toContain("Alice");
    expect(subLine?.textContent).not.toContain("Alice Smith");
    expect(subLine?.textContent).toContain("Groceries");
  });

  it("renders a 'View All' link to the group's expenses page", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    await screen.findByText("Weekly shop");
    const link = screen.getByRole("link", { name: "View All" });
    expect(link).toHaveAttribute("href", `/expenses/${GROUP_ID}`);
  });

  it("falls back to the expense's payerName when payerId is unknown", async () => {
    await renderHydrated({
      ...SUMMARY_FIXTURE,
      members: [],
    });

    expect(await screen.findByText("AS")).toBeInTheDocument();
  });
});
