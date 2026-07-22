import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useContributionSession } from "./useContributionSession";
import type { SavingsGoal } from "./index";

const mockUpsertContribution =
  vi.fn<
    (goalId: string, memberId: string, amount: number) => Promise<undefined>
  >();
const mockDeleteContribution =
  vi.fn<(goalId: string, memberId: string) => Promise<undefined>>();

vi.mock("./index", async (importOriginal) => {
  const module = await importOriginal<typeof import("./index")>();
  return {
    ...module,
    savingsGoalApi: {
      ...module.savingsGoalApi,
      upsertContribution: (goalId: string, memberId: string, amount: number) =>
        mockUpsertContribution(goalId, memberId, amount),
      deleteContribution: (goalId: string, memberId: string) =>
        mockDeleteContribution(goalId, memberId),
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
  return renderHook(
    ({ goal }: { goal: SavingsGoal | null }) => useContributionSession(goal),
    { initialProps: { goal: null as SavingsGoal | null } },
  );
}

describe("useContributionSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertContribution.mockResolvedValue(undefined);
    mockDeleteContribution.mockResolvedValue(undefined);
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

  describe("saveSession scoping (issue #161: only intentional edits persist)", () => {
    it("only upserts members present in overrideAmounts, not every breakdown member", async () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "untouched",
            share: 0.5,
            percentage: 50,
            proportionalAmount: 100,
            actualAmount: 100,
            isOverridden: false,
            remainingBalance: 1000,
          },
          {
            memberId: "edited",
            share: 0.5,
            percentage: 50,
            proportionalAmount: 100,
            actualAmount: 100,
            isOverridden: false,
            remainingBalance: 1000,
          },
        ],
      };

      const { result, rerender } = makeHook();
      rerender({ goal });

      act(() => {
        result.current.overrideMember("edited", 250);
      });

      await act(async () => {
        await result.current.saveSession();
      });

      expect(mockUpsertContribution).toHaveBeenCalledTimes(1);
      expect(mockUpsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "edited",
        250,
      );
      expect(mockDeleteContribution).not.toHaveBeenCalled();
    });

    it("deletes the override row for a member reset then saved (not undone)", async () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 500,
            actualAmount: 600,
            isOverridden: true,
            remainingBalance: 1000,
          },
        ],
      };

      const { result, rerender } = makeHook();
      rerender({ goal });

      act(() => {
        result.current.resetToIncomeSplit();
      });

      await act(async () => {
        await result.current.saveSession();
      });

      expect(mockDeleteContribution).toHaveBeenCalledWith("goal-1", "m1");
      expect(mockUpsertContribution).not.toHaveBeenCalled();
    });

    it("upserts the restored value when a reset is undone before save, instead of deleting", async () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 500,
            actualAmount: 600,
            isOverridden: true,
            remainingBalance: 1000,
          },
        ],
      };

      const { result, rerender } = makeHook();
      rerender({ goal });

      act(() => {
        result.current.resetToIncomeSplit();
      });
      act(() => {
        result.current.undoReset();
      });

      await act(async () => {
        await result.current.saveSession();
      });

      expect(mockUpsertContribution).toHaveBeenCalledWith("goal-1", "m1", 600);
      expect(mockDeleteContribution).not.toHaveBeenCalled();
    });

    it("makes no delete call for a reset member that had no pre-existing override row", async () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 500,
            actualAmount: 500,
            isOverridden: false,
            remainingBalance: 1000,
          },
        ],
      };

      const { result, rerender } = makeHook();
      rerender({ goal });

      act(() => {
        result.current.resetToIncomeSplit();
      });

      await act(async () => {
        await result.current.saveSession();
      });

      expect(mockDeleteContribution).not.toHaveBeenCalled();
      expect(mockUpsertContribution).not.toHaveBeenCalled();
    });
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
          share: 1,
          percentage: 100,
          proportionalAmount: 800,
          actualAmount: 800,
          isOverridden: false,
          remainingBalance: 1000,
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
          share: 1,
          percentage: 100,
          proportionalAmount: 0,
          actualAmount: 0,
          isOverridden: false,
          remainingBalance: 1000,
        },
      ],
    };

    const { result, rerender } = makeHook();
    rerender({ goal: noContribGoal });

    expect(result.current.forecastColor).toBe("red");
  });

  describe("ceilingWarnings (derived, ceiling-aware Reset to Income Split)", () => {
    it("flags a member whose effective share exceeds their remainingBalance", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 500,
            actualAmount: 500,
            isOverridden: false,
            remainingBalance: 400,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      expect(result.current.ceilingWarnings).toEqual({ m1: true });
    });

    it("does not flag a member whose effective share is within their remainingBalance", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 300,
            actualAmount: 300,
            isOverridden: false,
            remainingBalance: 400,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      expect(result.current.ceilingWarnings).toEqual({ m1: false });
    });

    it("after resetToIncomeSplit, warning reflects the proportional share, not any prior override", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 600,
            actualAmount: 50,
            isOverridden: true,
            remainingBalance: 400,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      // Before reset: override (50) is well within the ceiling (400) -> no warning
      expect(result.current.overrideAmounts).toEqual({ m1: 50 });
      expect(result.current.ceilingWarnings).toEqual({ m1: false });

      act(() => {
        result.current.resetToIncomeSplit();
      });

      // After reset: overrideAmounts cleared, effective share falls back to
      // proportionalAmount (600), which exceeds remainingBalance (400)
      expect(result.current.overrideAmounts).toEqual({});
      expect(result.current.ceilingWarnings).toEqual({ m1: true });
    });

    it("a member with 0% income share is never flagged", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 0,
            percentage: 0,
            proportionalAmount: 0,
            actualAmount: 0,
            isOverridden: false,
            remainingBalance: 100,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      expect(result.current.ceilingWarnings).toEqual({ m1: false });
    });

    it("flags a member whose ceiling is zero or negative when their share is positive", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "zero-ceiling",
            share: 0.5,
            percentage: 50,
            proportionalAmount: 50,
            actualAmount: 50,
            isOverridden: false,
            remainingBalance: 0,
          },
          {
            memberId: "negative-ceiling",
            share: 0.5,
            percentage: 50,
            proportionalAmount: 50,
            actualAmount: 50,
            isOverridden: false,
            remainingBalance: -20,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      expect(result.current.ceilingWarnings).toEqual({
        "zero-ceiling": true,
        "negative-ceiling": true,
      });
    });

    it("flags multiple over-ceiling members independently, with no interaction between them", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "over",
            share: 0.5,
            percentage: 50,
            proportionalAmount: 500,
            actualAmount: 500,
            isOverridden: false,
            remainingBalance: 400,
          },
          {
            memberId: "under",
            share: 0.3,
            percentage: 30,
            proportionalAmount: 100,
            actualAmount: 100,
            isOverridden: false,
            remainingBalance: 400,
          },
          {
            memberId: "also-over",
            share: 0.2,
            percentage: 20,
            proportionalAmount: 600,
            actualAmount: 600,
            isOverridden: false,
            remainingBalance: 50,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      expect(result.current.ceilingWarnings).toEqual({
        over: true,
        under: false,
        "also-over": true,
      });
    });

    it("flags an overdue lump-sum goal's member whose live-income share exceeds their ceiling", () => {
      const overdueGoal: SavingsGoal = {
        ...mockGoal,
        targetDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        varianceMonths: -12,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 900,
            actualAmount: 900,
            isOverridden: false,
            remainingBalance: 300,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal: overdueGoal });

      expect(result.current.ceilingWarnings).toEqual({ m1: true });
    });

    it("reading ceilingWarnings never mutates overrideAmounts state", () => {
      const goal: SavingsGoal = {
        ...mockGoal,
        breakdown: [
          {
            memberId: "m1",
            share: 1,
            percentage: 100,
            proportionalAmount: 500,
            actualAmount: 500,
            isOverridden: true,
            remainingBalance: 400,
          },
        ],
      };
      const { result, rerender } = makeHook();
      rerender({ goal });

      const overridesBefore = result.current.overrideAmounts;
      // access ceilingWarnings repeatedly (simulating multiple renders/reads)
      void result.current.ceilingWarnings;
      void result.current.ceilingWarnings;
      rerender({ goal });

      expect(result.current.overrideAmounts).toEqual(overridesBefore);
      expect(result.current.overrideAmounts).toEqual({ m1: 500 });

      act(() => {
        result.current.overrideMember("m1", 999);
      });

      expect(result.current.overrideAmounts).toEqual({ m1: 999 });
    });
  });
});
