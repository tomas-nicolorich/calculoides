import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavingsGoalForm } from "./SavingsGoalForm";
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
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
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

const mockGoal = {
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
};

describe("SavingsGoalForm", () => {
  it("renders label elements with font-medium (not font-bold)", () => {
    render(<SavingsGoalForm groupId="group-1" />);

    const goalNameLabel = screen.getByText("Goal Name");
    expect(goalNameLabel).toHaveClass("font-medium");
  });

  it("renders submit button with balance variant", () => {
    render(<SavingsGoalForm groupId="group-1" />);

    expect(
      screen.getByRole("button", { name: /Save Goal/i }),
    ).toBeInTheDocument();
  });

  it("does not render an allocation section in create mode (no goal)", () => {
    render(<SavingsGoalForm groupId="group-1" />);

    expect(screen.queryByText("Monthly Allocation")).not.toBeInTheDocument();
  });

  it("renders per-member allocation inputs when editing an existing goal", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(screen.getByText("Monthly Allocation")).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /Alice/i }),
    ).toBeInTheDocument();
  });

  it("saves metadata and allocation overrides together on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <SavingsGoalForm
        groupId="group-1"
        goal={mockGoal}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalled();
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "member-1",
        100,
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("submit button stays enabled after clearing an allocation input to 0", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    await user.clear(input);
    await user.type(input, "0");

    const saveButton = screen.getByRole("button", { name: /update goal/i });
    expect(saveButton).not.toBeDisabled();
  });
});
