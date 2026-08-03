import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useSavingsGoals } from "./savingsHooks";
import { createTestQueryClient, QueryWrapper } from "../../test/queryTestUtils";
import type { SavingsGoal } from "../../entities/savings-goal";

const { mockList } = vi.hoisted(() => ({
  mockList: vi.fn<(groupId: string) => Promise<SavingsGoal[]>>(),
}));

vi.mock("../../entities/savings-goal", () => ({
  savingsGoalApi: { list: mockList },
}));

/** A client with a real (non-zero) staleTime, for cache-hit-on-remount cases. */
function createCacheableTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

function renderWithClient<TProps, TResult>(
  callback: (props: TProps) => TResult,
  initialProps: TProps,
  client: QueryClient = createTestQueryClient(),
) {
  const utils = renderHook(callback, {
    initialProps,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryWrapper, { client, children }),
  });
  return { ...utils, client };
}

const goalsFixture: SavingsGoal[] = [
  { id: "goal-1" } as unknown as SavingsGoal,
];

beforeEach(() => {
  mockList.mockReset();
});

describe("useSavingsGoals", () => {
  it("stays disabled (not loading, no fetch) when groupId is null", () => {
    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: null },
    );

    expect(result.current.loading).toBe(false);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("fetches the savings goals on first load and returns the data", async () => {
    mockList.mockResolvedValue(goalsFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(goalsFixture);
    });
    expect(mockList).toHaveBeenCalledWith("g1");
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockList.mockRejectedValue(new Error("savings down"));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("savings down");
    });
  });

  it("serves cache on remount within the staleness window (no second fetch)", async () => {
    mockList.mockResolvedValue(goalsFixture);
    const client = createCacheableTestClient();

    const first = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: "g1" },
      client,
    );
    await waitFor(() => {
      expect(first.result.current.data).toEqual(goalsFixture);
    });
    first.unmount();

    const second = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: "g1" },
      client,
    );

    expect(second.result.current.data).toEqual(goalsFixture);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockList.mockResolvedValue(goalsFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useSavingsGoals(groupId),
      { groupId: "g1" },
    );
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    result.current.refresh();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });
});
