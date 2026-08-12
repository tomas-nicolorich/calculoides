// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../../lib/query-client";
import { queryKeys } from "../../../../lib/query-keys";
import { DashboardClient } from "./DashboardClient";

const GROUP_ID = "22222222-2222-4222-8222-222222222222";

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: "user-1",
  totalIncome: 4000,
  totalBudget: 400,
  totalSpent: 120,
  members: [],
  recentExpenses: [],
  recentTransfers: [],
};

/** Simulates the server's `prefetchQuery` + `dehydrate` step (2.1-2.2). */
async function prefetchServerClient(): Promise<QueryClient> {
  const serverClient = createQueryClient();
  await serverClient.prefetchQuery({
    queryKey: queryKeys.summary(GROUP_ID),
    queryFn: () => Promise.resolve(SUMMARY_FIXTURE),
  });
  return serverClient;
}

function renderHydrated(serverClient: QueryClient, browserClient: QueryClient) {
  const dehydratedState = dehydrate(serverClient);
  render(
    <QueryClientProvider client={browserClient}>
      <HydrationBoundary state={dehydratedState}>
        <DashboardClient groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return browserClient;
}

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

describe("DashboardClient", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // dashboard-view: "Loading state precedes hydration" — the grid shell and
  // its stub slots render immediately; only the still-loading widget shows
  // its own loading state, there is no page-level spinner gating everything.
  it("renders the two-column grid shell immediately, with only the unresolved widget showing a loading state", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <DashboardClient groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId("dashboard-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-grid")).toBeInTheDocument();
    expect(screen.getByTestId("remaining-balance-loading")).toBeInTheDocument();
    expect(screen.getByTestId("recent-expenses-loading")).toBeInTheDocument();
    // Stub slots for the widgets PR 13-16 fill in render their static title
    // right away — nothing blocks on the summary query resolving.
    expect(screen.getByText("Income Overview")).toBeInTheDocument();
    expect(screen.getByText("Budget Transfers")).toBeInTheDocument();
    expect(screen.getByText("Budget Categories")).toBeInTheDocument();
    expect(screen.getByText("Savings Goals")).toBeInTheDocument();
  });

  // client-data-cache: "Server-Component-served read has no query key" —
  // a server-prefetched key must be a cache-hit on client mount within its
  // staleTime, never a fresh network round trip (2.4).
  it("renders the group name and both wired widgets from the hydrated cache without issuing a network request", async () => {
    const serverClient = await prefetchServerClient();

    renderHydrated(serverClient, createQueryClient());

    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(await screen.findByText("Remaining Balance")).toBeInTheDocument();
    expect(await screen.findByText("Recent Expenses")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // client-data-cache: refetch-on-focus for a server-prefetched key hits
  // the new GET Route Handler once the cached data has gone stale (2.5).
  // Uses a short `staleTime` override (real elapsed time, no fake timers —
  // `refetchOnWindowFocus` interacts with React's/jsdom's own scheduling,
  // which fake timers destabilize) instead of waiting out the production
  // 30s default; the 30s constant itself is `createQueryClient`'s own
  // concern, not re-asserted here. Margin widened from the original 20ms/
  // 50ms pair (DashboardClient now mounts 3 `queryKeys.summary` observers —
  // header, `RemainingBalance`, `RecentExpenses` — instead of 1, which cost
  // enough extra real render time under full-suite concurrent load to flake
  // the pre-sleep "not yet called" assertion).
  it("refetches via the GET Route Handler on window focus once stale", async () => {
    const serverClient = await prefetchServerClient();
    const browserClient = createQueryClient({ queries: { staleTime: 100 } });

    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(SUMMARY_FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderHydrated(serverClient, browserClient);
    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // Real sleep past the 100ms staleTime override above.
    await new Promise((resolve) => setTimeout(resolve, 250));

    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/summary?groupId="),
      );
    });
  });
});
