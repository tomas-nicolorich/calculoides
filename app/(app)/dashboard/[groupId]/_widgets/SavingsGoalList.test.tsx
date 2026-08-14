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
import {
  deleteGoal as deleteGoalAction,
  update as updateGoalAction,
} from "../../../../../lib/actions/savings";
import { SavingsGoalList } from "./SavingsGoalList";
import type { SavingsGoal } from "../../../../_data/savings";

/**
 * RED tests for `SavingsGoalList` (16.3) — ported/adapted from `main`'s
 * `frontend/src/features/savings/SavingsGoalList.test.tsx`. Delete flow
 * matches `savings-goal-management`'s existing deletion scenarios verbatim
 * (confirmation-gated, isolated to the target goal). Genuine RED before this
 * file existed — module not found.
 */
vi.mock("../../../../../lib/actions/savings", () => ({
  create: vi.fn(),
  update: vi.fn(),
  deleteGoal: vi.fn(),
  contributionUpsert: vi.fn(),
  contributionDelete: vi.fn(),
}));

const mockDelete = vi.mocked(deleteGoalAction);
const mockUpdate = vi.mocked(updateGoalAction);

const GROUP_ID = "44444444-4444-4444-8444-444444444444";

const GOAL_A: SavingsGoal = {
  id: "goal-a",
  groupId: GROUP_ID,
  name: "Vacation Fund",
  icon: "plane",
  targetAmount: 1000,
  currentAmount: 200,
  targetDate: "2026-12-01T00:00:00.000Z",
  projectedDate: "2026-11-01T00:00:00.000Z",
  varianceMonths: -1,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      share: 1,
      percentage: 100,
      proportionalAmount: 100,
      actualAmount: 100,
      isOverridden: false,
      remainingBalance: 500,
      user: { name: "Alice", email: "alice@example.com" },
    },
  ],
};

const GOAL_B: SavingsGoal = {
  ...GOAL_A,
  id: "goal-b",
  name: "Emergency Fund",
};

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

async function renderHydrated(goals: SavingsGoal[] | null) {
  const serverClient = new QueryClient();
  if (goals !== null) {
    await serverClient.prefetchQuery({
      queryKey: queryKeys.savingsGoals(GROUP_ID),
      queryFn: () => Promise.resolve(goals),
    });
  }
  const dehydratedState = dehydrate(serverClient);
  const browserClient = createQueryClient();
  render(
    <QueryClientProvider client={browserClient}>
      <HydrationBoundary state={dehydratedState}>
        <SavingsGoalList groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return browserClient;
}

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

describe("SavingsGoalList", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
    stubMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    mockDelete.mockReset();
    mockUpdate.mockReset();
  });

  // dashboard-view: "Loading state precedes hydration".
  it("shows a loading state before the savingsGoals query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SavingsGoalList groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("savings-goal-list-loading")).toBeInTheDocument();
  });

  it("shows an error state when the savingsGoals query fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(
      <QueryClientProvider
        client={createQueryClient({ queries: { retry: false } })}
      >
        <SavingsGoalList groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load savings goals/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state (not an error) when there are no goals", async () => {
    await renderHydrated([]);

    expect(
      await screen.findByText("No savings goals found."),
    ).toBeInTheDocument();
  });

  it("renders each goal's name and target from the hydrated cache without a client fetch", async () => {
    await renderHydrated([GOAL_A]);

    expect(await screen.findByText("Vacation Fund")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // savings-goal-management: deleting one goal does not affect others.
  it("row-menu delete, confirmed, deletes only the targeted goal", async () => {
    mockDelete.mockResolvedValue({ ok: true, data: { success: true } });
    const queryClient = await renderHydrated([GOAL_A, GOAL_B]);
    await screen.findByText("Vacation Fund");

    fireEvent.click(screen.getAllByLabelText("Row options")[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(
      screen.getByText(/removes the goal and its earmarking only/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Goal" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        { goalId: "goal-a" },
        expect.anything(),
      );
    });

    // client-data-cache: mutation invalidates via `invalidateGroupQueries`
    // (`invalidateQueries({ queryKey: queryKeys.group(groupId) })`), not just
    // "some invalidation happened".
    expect(
      queryClient.getQueryState(queryKeys.savingsGoals(GROUP_ID))
        ?.isInvalidated,
    ).toBe(true);
  });

  it("row-menu edit opens the full-edit modal prefilled with the goal", async () => {
    await renderHydrated([GOAL_A]);
    await screen.findByText("Vacation Fund");

    fireEvent.click(screen.getByLabelText("Row options"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByText("Edit Goal")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal Name")).toHaveValue("Vacation Fund");
  });

  it("renders the InlineAllocationEditor's Adjust affordance for each goal", async () => {
    await renderHydrated([GOAL_A]);
    await screen.findByText("Vacation Fund");

    expect(screen.getByRole("button", { name: "Adjust" })).toBeInTheDocument();
  });
});
