// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../lib/query-client";
import { queryKeys } from "../../lib/query-keys";
import { useSavingsGoalsList, useCreateGoal, useUpdateGoal } from "./savings";

vi.mock("../../lib/actions/savings", () => ({
  create: vi.fn().mockResolvedValue({ ok: true, data: { id: "goal-1" } }),
  update: vi.fn().mockResolvedValue({ ok: true, data: { id: "goal-1" } }),
  deleteGoal: vi.fn(),
  contributionUpsert: vi.fn(),
  contributionDelete: vi.fn(),
}));

const GROUP_ID = "group-1";

/**
 * ADR-2: hoisted from `app/(app)/savings/[groupId]/queries.ts`. Genuine RED
 * before this file existed — module not found.
 */
describe("app/_data/savings", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("useSavingsGoalsList fetches /api/savings for the given group", async () => {
    const fixture = [{ id: "goal-1" }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = createQueryClient();

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useSavingsGoalsList(GROUP_ID), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(fixture);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/savings?groupId=group-1");
  });

  it("useCreateGoal invalidates the group's cache on success", async () => {
    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve({ groupName: "Roomies" }),
    });

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useCreateGoal(GROUP_ID), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: GROUP_ID,
        name: "Trip",
        targetAmount: 100,
        targetDate: "2026-12-01",
      });
    });

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
    ).toBe(true);
  });

  it("useUpdateGoal invalidates the group's cache on success", async () => {
    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve({ groupName: "Roomies" }),
    });

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useUpdateGoal(GROUP_ID), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        goalId: "goal-1",
        name: "Trip",
        targetAmount: 100,
        targetDate: "2026-12-01",
      });
    });

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
    ).toBe(true);
  });
});
