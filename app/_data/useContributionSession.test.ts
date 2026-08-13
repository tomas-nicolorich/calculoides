// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../lib/query-client";
import { queryKeys } from "../../lib/query-keys";
import { useContributionSession } from "./useContributionSession";
import type { SavingsGoal } from "./savings";

/**
 * Ported/adapted from `main`'s
 * `frontend/src/entities/savings-goal/useContributionSession.test.ts`
 * (PR 16). DEVIATION (documented): `main`'s `savingsGoalApi.upsertContribution`/
 * `deleteContribution` throw on failure (`apiClient.fetch`); this repo's
 * Server Actions return `ActionResult` and never throw, so the mutationFn
 * internal to this hook translates a `{ ok: false }` result into a thrown
 * `Error` to preserve the reducer's existing try/catch save flow. Genuine
 * RED before this file existed — module not found.
 */
vi.mock("../../lib/actions/savings", () => ({
  contributionUpsert: vi.fn(),
  contributionDelete: vi.fn(),
}));

import {
  contributionUpsert,
  contributionDelete,
} from "../../lib/actions/savings";

const mockUpsert = vi.mocked(contributionUpsert);
const mockDelete = vi.mocked(contributionDelete);

const GROUP_ID = "group-1";

const mockGoal: SavingsGoal = {
  id: "goal-1",
  groupId: GROUP_ID,
  name: "Vacation Fund",
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: new Date(
    Date.now() + 12 * 30 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  projectedDate: new Date(
    Date.now() + 10 * 30 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  varianceMonths: -2,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      share: 0.625,
      percentage: 62.5,
      proportionalAmount: 500,
      actualAmount: 600,
      isOverridden: true,
      remainingBalance: 1000,
    },
    {
      memberId: "m2",
      share: 0.375,
      percentage: 37.5,
      proportionalAmount: 300,
      actualAmount: 300,
      isOverridden: false,
      remainingBalance: 1000,
    },
  ],
};

function makeHook() {
  const client = createQueryClient();
  const hook = renderHook(
    ({ goal }: { goal: SavingsGoal | null }) => useContributionSession(goal),
    {
      initialProps: { goal: null as SavingsGoal | null },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client, children }),
    },
  );
  return { ...hook, client };
}

describe("useContributionSession", () => {
  beforeEach(() => {
    mockUpsert.mockResolvedValue({
      ok: true,
      data: undefined,
    } as unknown as Awaited<ReturnType<typeof contributionUpsert>>);
    mockDelete.mockResolvedValue({
      ok: true,
      data: undefined,
    } as unknown as Awaited<ReturnType<typeof contributionDelete>>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sessionStart seeds overrideAmounts from the overridden breakdown entries", () => {
    const { result, rerender } = makeHook();
    expect(result.current.phase).toBe("idle");

    rerender({ goal: mockGoal });

    expect(result.current.phase).toBe("editing");
    expect(result.current.overrideAmounts).toEqual({ m1: 600 });
    expect(result.current.sessionStartSnapshot).toEqual({ m1: 600 });
    expect(result.current.preResetSnapshot).toBeNull();
  });

  it("overrideMember updates localProjectedMonths", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });
    const prevMonths = result.current.localProjectedMonths;

    act(() => {
      result.current.overrideMember("m1", 1000);
    });

    expect(result.current.overrideAmounts.m1).toBe(1000);
    expect(result.current.localProjectedMonths).not.toBe(prevMonths);
  });

  it("resetToIncomeSplit clears overrides and stores a preResetSnapshot; undoReset restores them", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    act(() => {
      result.current.resetToIncomeSplit();
    });
    expect(result.current.overrideAmounts).toEqual({});
    expect(result.current.preResetSnapshot).toEqual({ m1: 600 });

    act(() => {
      result.current.undoReset();
    });
    expect(result.current.overrideAmounts).toEqual({ m1: 600 });
    expect(result.current.preResetSnapshot).toBeNull();
  });

  it("saveSession diffs the breakdown against overrides, upserts/deletes accordingly, and invalidates the group cache", async () => {
    const { result, rerender, client } = makeHook();
    await client.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve({ groupName: "Roomies" }),
    });
    rerender({ goal: mockGoal });

    act(() => {
      result.current.overrideMember("m2", 250);
    });

    let saved = false;
    await act(async () => {
      saved = await result.current.saveSession();
    });

    expect(saved).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      goalId: "goal-1",
      memberId: "m1",
      amount: 600,
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      goalId: "goal-1",
      memberId: "m2",
      amount: 250,
    });
    expect(
      client.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
    ).toBe(true);
    expect(result.current.phase).toBe("idle");
  });

  it("saveSession failure keeps the session in editing phase and sets saveError", async () => {
    mockUpsert.mockResolvedValue({ ok: false, error: "Boom", status: 500 });
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    let saved = true;
    await act(async () => {
      saved = await result.current.saveSession();
    });

    expect(saved).toBe(false);
    expect(result.current.phase).toBe("editing");
    expect(result.current.saveError).toBeTruthy();
  });

  it("cancelSession restores overrideAmounts to the session-start snapshot and returns to idle", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    act(() => {
      result.current.overrideMember("m1", 999);
      result.current.cancelSession();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.overrideAmounts).toEqual({ m1: 600 });
  });
});
