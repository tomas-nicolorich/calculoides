import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useContributionSession } from "./useContributionSession";
import type { SavingsGoal } from "./index";

const mockUpsertContribution =
  vi.fn<
    (goalId: string, memberId: string, amount: number) => Promise<undefined>
  >();

vi.mock("./index", async (importOriginal) => {
  const module = await importOriginal<typeof import("./index")>();
  return {
    ...module,
    savingsGoalApi: {
      ...module.savingsGoalApi,
      upsertContribution: (goalId: string, memberId: string, amount: number) =>
        mockUpsertContribution(goalId, memberId, amount),
    },
  };
});

vi.mock("@/shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

const mockGoal: SavingsGoal = {
  id: "goal-1",
  groupId: "group-1",
  name: "Vacation Fund",
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  projectedDate: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  varianceMonths: -2,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      proportionalAmount: 500,
      actualAmount: 600,
      isOverridden: true,
    },
    {
      memberId: "m2",
      proportionalAmount: 300,
      actualAmount: 300,
      isOverridden: false,
    },
  ],
};

function makeHook() {
  return renderHook(
    ({ goal }: { goal: SavingsGoal | null }) => useContributionSession(goal),
    { initialProps: { goal: null as SavingsGoal | null } },
  );
}

describe("useContributionSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertContribution.mockResolvedValue(undefined);
  });

  it("sessionStart seeds overrideAmounts from snapshot and initializes sessionStartSnapshot with preResetSnapshot null", () => {
    const { result, rerender } = makeHook();

    expect(result.current.phase).toBe("idle");

    rerender({ goal: mockGoal });

    expect(result.current.phase).toBe("editing");
    expect(result.current.overrideAmounts).toEqual({ m1: 600 });
    expect(result.current.sessionStartSnapshot).toEqual({ m1: 600 });
    expect(result.current.preResetSnapshot).toBeNull();
  });

  it("overrideAmount action updates localProjectedMonths", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    const prevMonths = result.current.localProjectedMonths;

    act(() => {
      result.current.overrideMember("m1", 1000);
    });

    expect(result.current.localProjectedMonths).not.toBe(prevMonths);
    expect(result.current.localProjectedMonths).not.toBeNull();
  });

  it("resetToIncomeSplit captures preResetSnapshot then clears overrideAmounts to {}", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    const overridesBefore = result.current.overrideAmounts;

    act(() => {
      result.current.resetToIncomeSplit();
    });

    expect(result.current.preResetSnapshot).toEqual(overridesBefore);
    expect(result.current.overrideAmounts).toEqual({});
  });

  it("undoReset restores overrideAmounts from preResetSnapshot and clears preResetSnapshot", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    const overridesBefore = result.current.overrideAmounts;

    act(() => {
      result.current.resetToIncomeSplit();
    });

    act(() => {
      result.current.undoReset();
    });

    expect(result.current.overrideAmounts).toEqual(overridesBefore);
    expect(result.current.preResetSnapshot).toBeNull();
  });

  it("cancelSession restores overrideAmounts from sessionStartSnapshot and resets preResetSnapshot", () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    const snapshot = { ...result.current.sessionStartSnapshot };

    act(() => {
      result.current.overrideMember("m1", 999);
      result.current.resetToIncomeSplit();
    });

    act(() => {
      result.current.cancelSession();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.overrideAmounts).toEqual(snapshot);
    expect(result.current.preResetSnapshot).toBeNull();
  });

  it("saveSession success transitions phase to idle", async () => {
    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    await act(async () => {
      await result.current.saveSession();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.saveError).toBeNull();
  });

  it("saveSession failure sets saveError and keeps phase editing", async () => {
    mockUpsertContribution.mockRejectedValue(
      new Error("Internal Server Error"),
    );

    const { result, rerender } = makeHook();
    rerender({ goal: mockGoal });

    await act(async () => {
      await result.current.saveSession();
    });

    expect(result.current.phase).toBe("editing");
    expect(result.current.saveError).not.toBeNull();
  });

  it("forecastColor is neutral when phase is idle", () => {
    const { result } = renderHook(() => useContributionSession(null));
    expect(result.current.forecastColor).toBe("neutral");
  });

  it("forecastColor is green when localProjectedMonths <= targetMonths", () => {
    const nearGoal: SavingsGoal = {
      ...mockGoal,
      targetDate: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      breakdown: [
        {
          memberId: "m1",
          proportionalAmount: 800,
          actualAmount: 800,
          isOverridden: false,
        },
      ],
    };

    const { result, rerender } = makeHook();
    rerender({ goal: nearGoal });

    expect(result.current.forecastColor).toBe("green");
  });

  it("forecastColor is red when localProjectedMonths is Infinity", () => {
    const noContribGoal: SavingsGoal = {
      ...mockGoal,
      breakdown: [
        {
          memberId: "m1",
          proportionalAmount: 0,
          actualAmount: 0,
          isOverridden: false,
        },
      ],
    };

    const { result, rerender } = makeHook();
    rerender({ goal: noContribGoal });

    expect(result.current.forecastColor).toBe("red");
  });
});
