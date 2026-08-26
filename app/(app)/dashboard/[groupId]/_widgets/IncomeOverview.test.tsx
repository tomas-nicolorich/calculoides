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
import { updateIncome } from "../../../../../lib/actions/member";
import { IncomeOverview } from "./IncomeOverview";

vi.mock("../../../../../lib/actions/member", () => ({
  updateIncome: vi.fn(),
  removeMember: vi.fn(),
}));

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

/** Mirrors `RemainingBalance.test.tsx`'s hydration helper; returns the
 * browser `QueryClient` so mutation-invalidation tests can inspect it. */
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
        <IncomeOverview groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return browserClient;
}

describe("IncomeOverview", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.mocked(updateIncome).mockReset();
  });

  // dashboard-view: "Widget-Level Loading Indicators Use Skeleton, Not Plain
  // Text" — a shaped `IncomeOverviewSkeleton`, not a "Loading…" text node.
  it("shows a shaped skeleton, not plain text, before the summary query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <IncomeOverview groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    const loading = screen.getByTestId("income-overview-loading");
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
        <IncomeOverview groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load income overview/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the group has no members", async () => {
    await renderHydrated({ ...SUMMARY_FIXTURE, members: [] });

    expect(await screen.findByText("No members yet")).toBeInTheDocument();
  });

  // ui-design-system: "Member income split renders as a stacked bar" — the
  // first real consumer of `MemberBar`.
  it("renders each member's income share via MemberBar from the hydrated cache without a client fetch", async () => {
    await renderHydrated(SUMMARY_FIXTURE);

    expect(await screen.findByText("Income Overview")).toBeInTheDocument();
    expect(screen.getByText("Total Group Income")).toBeInTheDocument();
    expect(screen.getByText("€5,000.00")).toBeInTheDocument();
    expect(screen.getAllByTestId("memberbar-segment")).toHaveLength(2);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("€3,000.00")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("€2,000.00")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ui-design-system "An income-related action uses the income variant"
  // (Confirm is `Button variant="income"`, verified by source inspection —
  // strict-tdd bans CSS-class assertions) + dashboard-view's general
  // invalidation contract: submitting a new income value calls
  // `lib/actions/member.ts` `updateIncome`, and on success invalidates
  // `queryKeys.group(groupId)`.
  it("opens the edit form pre-filled, then calls updateIncome for the edited member and invalidates the group cache on save", async () => {
    vi.mocked(updateIncome).mockResolvedValue({
      ok: true,
      data: { id: "m1", income: 3500 },
    } as unknown as Awaited<ReturnType<typeof updateIncome>>);

    const queryClient = await renderHydrated(SUMMARY_FIXTURE);

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit incomes" }),
    );
    expect(screen.getByLabelText("Income for Alice")).toHaveValue(3000);
    expect(screen.getByLabelText("Income for Bob")).toHaveValue(2000);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Income for Alice"), {
      target: { value: "3500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(updateIncome).toHaveBeenCalledWith(
        { memberId: "m1", income: 3500 },
        expect.anything(),
      );
    });
    await waitFor(() => {
      expect(
        queryClient.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
      ).toBe(true);
    });
  });
});
