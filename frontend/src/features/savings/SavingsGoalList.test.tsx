import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavingsGoalList } from "./SavingsGoalList";
import { savingsGoalApi } from "../../entities/savings-goal";
import { vi, describe, it, expect } from "vitest";

vi.mock("../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

vi.mock("../../entities/savings-goal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../entities/savings-goal")>();
  return {
    ...actual,
    savingsGoalApi: {
      ...actual.savingsGoalApi,
      upsertContribution: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("../../shared/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../shared/ui")>();
  return {
    ...actual,
    UserDisplay: ({
      user,
    }: {
      user?: { name: string | null; email: string };
    }) => <span>{user?.name ?? user?.email}</span>,
  };
});

const mockGoals = [
  {
    id: "goal-1",
    groupId: "group-1",
    name: "Vacation",
    targetAmount: 1200,
    startingAmount: 0,
    targetDate: "2026-12-31T00:00:00.000Z",
    projectedDate: "2026-12-31T00:00:00.000Z",
    varianceMonths: 0,
    breakdown: [
      {
        memberId: "member-1",
        proportionalAmount: 100,
        actualAmount: 100,
        isOverridden: false,
        user: { id: "user-1", name: "Alice", email: "alice@example.com" },
      },
    ],
  },
];

describe("SavingsGoalList", () => {
  it("calls onRefresh after saving contributions and closes editing panel", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: /adjust/i }));

    // Wait for session to enter editing phase
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    // onRefresh called after successful save
    await waitFor(() => {
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "member-1",
        100,
      );
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("displays the projected date and variance correctly", () => {
    const goalsWithVariance = [
      {
        ...mockGoals[0],
        id: "goal-2",
        name: "New Car",
        projectedDate: "2027-06-30T00:00:00.000Z",
        varianceMonths: 6,
      },
    ];

    render(<SavingsGoalList goals={goalsWithVariance} />);

    expect(screen.getByText(/Delayed 6mo/i)).toBeInTheDocument();

    const dateDisplay = screen.getByText(/2027/);
    expect(dateDisplay).toBeInTheDocument();
    expect(dateDisplay).not.toHaveTextContent("1970");
  });
});
