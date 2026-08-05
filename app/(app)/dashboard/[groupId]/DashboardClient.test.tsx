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
import { createQueryClient } from "../../../../frontend/src/shared/api/queryClient";
import { queryKeys } from "../../../../frontend/src/shared/api/queryKeys";
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

const CATEGORIES_FIXTURE = [
  { id: "cat-1", name: "Groceries", monthlyBudget: 400, balances: [] },
];

/** Simulates the server's `prefetchQuery` + `dehydrate` step (2.1-2.2). */
async function prefetchServerClient(): Promise<QueryClient> {
  const serverClient = createQueryClient();
  await serverClient.prefetchQuery({
    queryKey: queryKeys.summary(GROUP_ID),
    queryFn: () => Promise.resolve(SUMMARY_FIXTURE),
  });
  await serverClient.prefetchQuery({
    queryKey: queryKeys.categories(GROUP_ID),
    queryFn: () => Promise.resolve(CATEGORIES_FIXTURE),
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

describe("DashboardClient hydration", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // client-data-cache: "Server-Component-served read has no query key" —
  // a server-prefetched key must be a cache-hit on client mount within its
  // staleTime, never a fresh network round trip (2.4).
  it("renders from the hydrated cache without issuing a network request", async () => {
    const serverClient = await prefetchServerClient();

    renderHydrated(serverClient, createQueryClient());

    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // client-data-cache: refetch-on-focus for a server-prefetched key hits
  // the new GET Route Handler once the cached data has gone stale (2.5).
  // Uses a short `staleTime` override (real elapsed time, no fake timers —
  // `refetchOnWindowFocus` interacts with React's/jsdom's own scheduling,
  // which fake timers destabilize) instead of waiting out the production
  // 30s default; the 30s constant itself is already covered by
  // `frontend/src/shared/api/queryClient.test.ts` via the same
  // `createQueryClient` this test reuses.
  it("refetches via the GET Route Handler on window focus once stale", async () => {
    const serverClient = await prefetchServerClient();
    const browserClient = createQueryClient({ queries: { staleTime: 20 } });

    fetchMock.mockImplementation((input: string) => {
      const body = input.includes("/api/categories")
        ? CATEGORIES_FIXTURE
        : SUMMARY_FIXTURE;
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    renderHydrated(serverClient, browserClient);
    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    // Real sleep past the 20ms staleTime override above.
    await new Promise((resolve) => setTimeout(resolve, 50));

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
