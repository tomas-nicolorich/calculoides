import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavingsGoalList } from "./SavingsGoalList";
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
    currentAmount: 0,
    targetDate: "2026-12-31T00:00:00.000Z",
    projectedDate: "2026-12-31T00:00:00.000Z",
    varianceMonths: 0,
    isNever: false,
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
  it("opens the edit form (with metadata and allocation fields) when the pencil is clicked", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalList goals={mockGoals} />);

    await user.click(
      screen.getByRole("button", { name: /edit goal settings/i }),
    );

    expect(screen.getByText("Goal Name")).toBeInTheDocument();
    expect(screen.getByText("Monthly Allocation")).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /Alice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update goal/i }),
    ).toBeInTheDocument();
  });

  it("no longer renders a standalone ADJUST button", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(
      screen.queryByRole("button", { name: /^adjust$/i }),
    ).not.toBeInTheDocument();
  });

  it("closes the edit form when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalList goals={mockGoals} />);

    await user.click(
      screen.getByRole("button", { name: /edit goal settings/i }),
    );
    expect(screen.getByText("Goal Name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Goal Name")).not.toBeInTheDocument();
  });

  it("renders a ProgressMeter for each goal with correct value and max", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    const meter = screen.getByRole("progressbar");
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "1200");
  });

  it("renders an on-track Badge for goals with no variance", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("renders a delayed Badge and behind-state ProgressMeter for late goals", () => {
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
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "behind",
    );
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

    const dateDisplay = screen.getByText(/2027/);
    expect(dateDisplay).toBeInTheDocument();
    expect(dateDisplay).not.toHaveTextContent("1970");
  });

  it("renders a Never Badge and blocked ProgressMeter for isNever goals", () => {
    const neverGoals = [
      {
        ...mockGoals[0],
        id: "goal-never",
        name: "Impossible Dream",
        varianceMonths: 1200,
        isNever: true,
      },
    ];

    render(<SavingsGoalList goals={neverGoals} />);

    expect(screen.getAllByText("Never").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "blocked",
    );
  });
});
