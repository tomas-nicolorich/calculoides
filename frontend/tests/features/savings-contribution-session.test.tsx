import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SavingsGoalList } from "@/features/savings/SavingsGoalList";
import type { SavingsGoal } from "@/entities/savings-goal";

const mockUpsertContribution =
  vi.fn<
    (goalId: string, memberId: string, amount: number) => Promise<undefined>
  >();

vi.mock("@/entities/savings-goal", async (importOriginal) => {
  const module =
    await importOriginal<typeof import("@/entities/savings-goal")>();
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

vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false }),
}));

const now = new Date();
const futureTargetDate = new Date(now.getFullYear(), now.getMonth() + 12, 1)
  .toISOString()
  .split("T")[0];

const underTargetGoal: SavingsGoal = {
  id: "goal-under",
  groupId: "group-1",
  name: "Under Target Goal",
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: futureTargetDate,
  projectedDate: new Date(now.getFullYear(), now.getMonth() + 8, 1)
    .toISOString()
    .split("T")[0],
  varianceMonths: -4,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      proportionalAmount: 1000,
      actualAmount: 1000,
      isOverridden: false,
      user: { id: "m1", name: "Alice", email: "alice@test.com" },
    },
  ],
};

const overTargetGoal: SavingsGoal = {
  id: "goal-over",
  groupId: "group-1",
  name: "Over Target Goal",
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: futureTargetDate,
  projectedDate: new Date(now.getFullYear(), now.getMonth() + 14, 1)
    .toISOString()
    .split("T")[0],
  varianceMonths: 2,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      proportionalAmount: 500,
      actualAmount: 500,
      isOverridden: false,
      user: { id: "m1", name: "Alice", email: "alice@test.com" },
    },
  ],
};

const zeroContribGoal: SavingsGoal = {
  id: "goal-zero",
  groupId: "group-1",
  name: "Zero Contribution Goal",
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: futureTargetDate,
  projectedDate: new Date(now.getFullYear() + 100, now.getMonth(), 1)
    .toISOString()
    .split("T")[0],
  varianceMonths: 100,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      proportionalAmount: 0,
      actualAmount: 0,
      isOverridden: false,
      user: { id: "m1", name: "Alice", email: "alice@test.com" },
    },
  ],
};

const alreadyFundedGoal: SavingsGoal = {
  id: "goal-funded",
  groupId: "group-1",
  name: "Already Funded Goal",
  targetAmount: 5000,
  currentAmount: 6000,
  targetDate: futureTargetDate,
  projectedDate: new Date().toISOString().split("T")[0],
  varianceMonths: -12,
  isNever: false,
  breakdown: [
    {
      memberId: "m1",
      proportionalAmount: 500,
      actualAmount: 500,
      isOverridden: false,
      user: { id: "m1", name: "Alice", email: "alice@test.com" },
    },
  ],
};

async function clickAdjustAndWaitForForecast(goal: SavingsGoal) {
  render(<SavingsGoalList goals={[goal]} />);
  fireEvent.click(screen.getByRole("button", { name: /adjust/i }));
  await waitFor(() => screen.getByTestId("forecast-projected-date"));
  return screen.getByTestId("forecast-projected-date");
}

async function setupEditingSession(goal = underTargetGoal) {
  const user = userEvent.setup();
  render(<SavingsGoalList goals={[goal]} />);
  await user.click(screen.getByRole("button", { name: /adjust/i }));
  return user;
}

describe("SavingsGoalList — Contribution Session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertContribution.mockResolvedValue(undefined);
  });

  it("Forecast panel shows text-green-600 when projection is under target", async () => {
    const el = await clickAdjustAndWaitForForecast(underTargetGoal);
    expect(el).toHaveClass("text-green-600");
  });

  it("Forecast panel shows text-amber-500 when projection is over target", async () => {
    const el = await clickAdjustAndWaitForForecast(overTargetGoal);
    expect(el).toHaveClass("text-amber-500");
  });

  it('Forecast panel shows text-red-500 and "Never" on zero contributions', async () => {
    const el = await clickAdjustAndWaitForForecast(zeroContribGoal);
    await waitFor(() => {
      expect(el).toHaveClass("text-red-500");
      expect(el).toHaveTextContent("Never");
    });
  });

  it("Save button is enabled even when all contributions are zero (FR-DS-014 updated: zero-contribution save allowed)", async () => {
    await clickAdjustAndWaitForForecast(zeroContribGoal);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^save$/i }),
      ).not.toBeDisabled();
    });
  });

  it("Save button remains enabled on already-funded goal (FR-DS-018)", async () => {
    render(<SavingsGoalList goals={[alreadyFundedGoal]} />);
    fireEvent.click(screen.getByRole("button", { name: /adjust/i }));
    await waitFor(() => screen.getByTestId("forecast-projected-date"));
    expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled();
  });

  it('shows "Already reached" on already-funded goal', async () => {
    render(<SavingsGoalList goals={[alreadyFundedGoal]} />);

    const adjustBtn = screen.getByRole("button", { name: /adjust/i });
    fireEvent.click(adjustBtn);

    await waitFor(() => {
      expect(screen.getByTestId("forecast-projected-date")).toHaveTextContent(
        "Already reached",
      );
    });
  });

  it("displays inline saveError when save fails", async () => {
    mockUpsertContribution.mockRejectedValue(new Error("Network error"));

    render(<SavingsGoalList goals={[underTargetGoal]} />);
    fireEvent.click(screen.getByRole("button", { name: /adjust/i }));

    await waitFor(() => screen.getByRole("button", { name: /save/i }));

    await waitFor(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByTestId("session-save-error")).toBeInTheDocument();
      });
    });
  });

  it("Cancel reverts projected date to server value", async () => {
    render(<SavingsGoalList goals={[underTargetGoal]} />);
    fireEvent.click(screen.getByRole("button", { name: /adjust/i }));

    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    const serverDateText = new Date(
      underTargetGoal.projectedDate,
    ).toLocaleDateString();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("forecast-projected-date")).toHaveTextContent(
        serverDateText,
      );
    });
  });

  it("Save button is disabled during saving phase", async () => {
    mockUpsertContribution.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
    );

    const user = userEvent.setup();
    render(<SavingsGoalList goals={[underTargetGoal]} />);

    await user.click(screen.getByRole("button", { name: /adjust/i }));

    // Wait for session to enter editing (useEffect fires and seeds overrideAmounts)
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toHaveValue(1000);
    });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const saveBtn = screen.queryByRole("button", { name: /saving/i });
      expect(saveBtn).toBeDisabled();
    });
  });

  it("Tab key cycles through contribution input, Save, Cancel, and Reset", async () => {
    const user = await setupEditingSession();

    // Wait for session to enter editing
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    const input = screen.getByRole("spinbutton");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    const resetBtn = screen.getByRole("button", {
      name: /reset to income split/i,
    });

    await user.click(input);
    await user.tab();
    expect(saveBtn).toHaveFocus();
    await user.tab();
    expect(cancelBtn).toHaveFocus();
    await user.tab();
    expect(resetBtn).toHaveFocus();
  });

  it("Undo button appears after reset and can be reached by Tab", async () => {
    const user = await setupEditingSession();
    await waitFor(() =>
      screen.getByRole("button", { name: /reset to income split/i }),
    );

    await user.click(
      screen.getByRole("button", { name: /reset to income split/i }),
    );
    await waitFor(() => screen.getByRole("button", { name: /undo reset/i }));

    const undoBtn = screen.getByRole("button", { name: /undo reset/i });
    expect(undoBtn).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", {
      name: /reset to income split/i,
    });
    await user.click(resetBtn);
    await user.tab();
    expect(undoBtn).toHaveFocus();
  });

  it("Enter activates Save button", async () => {
    const user = await setupEditingSession();
    await waitFor(() => screen.getByRole("button", { name: /save/i }));

    await user.click(screen.getByRole("button", { name: /save/i }));
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockUpsertContribution).toHaveBeenCalled();
    });
  });
});
