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
import { RemainingBalance } from "./RemainingBalance";

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
      name: "Alice",
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
  recentExpenses: [],
  recentTransfers: [],
};

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

/** Mirrors `DashboardClient.test.tsx`'s `prefetchServerClient` pattern: a
 * server-side client dehydrated into a browser client's `HydrationBoundary`,
 * so "no client fetch on mount" is proven against the real hydration seam,
 * not a same-client cache shortcut. */
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
        <RemainingBalance groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
}

describe("RemainingBalance", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // No prefetch → useDashboardSummary starts its own (stubbed, never-
  // resolving) fetch and stays in the initial loading state synchronously.
  it("shows a loading state before the summary query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <RemainingBalance groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("remaining-balance-loading")).toBeInTheDocument();
  });

  it("shows an error state when the summary query fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(
      <QueryClientProvider
        client={createQueryClient({ queries: { retry: false } })}
      >
        <RemainingBalance groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load remaining balance/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the group has no members", async () => {
    await renderHydrated({ ...SUMMARY_FIXTURE, members: [] });

    expect(await screen.findByText("No members yet")).toBeInTheDocument();
  });

  // client-data-cache: "no client-side waterfall for summary-backed
  // widgets" — reads the hydrated cache, issues no fetch of its own.
  it("renders total remaining and per-member figures from the hydrated cache without a client fetch", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    expect(await screen.findByText("Remaining Balance")).toBeInTheDocument();
    expect(screen.getByText("Total Group Remaining")).toBeInTheDocument();
    // totalIncome(5000) - totalBudget(2500) = 2500
    expect(screen.getByText("€2,500.00")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("BO")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders member income and budgeted figures per member row", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    await screen.findByText("Remaining Balance");
    const incomeLabels = screen.getAllByText(/Income:/);
    expect(incomeLabels).toHaveLength(2);
    const budgetedLabels = screen.getAllByText(/Budgeted:/);
    expect(budgetedLabels).toHaveLength(2);
  });
});
