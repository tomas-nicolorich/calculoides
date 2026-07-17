import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

function getMonthInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="month"]',
  );
  if (!input) throw new Error("month input not found");
  return input;
}
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
      share: 1,
      percentage: 100,
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

  it("renders icon picker tiles and selects one on click", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" />);

    const otherTile = screen.getByRole("button", { name: "Icon: other" });
    expect(otherTile).toHaveAttribute("aria-pressed", "true");

    const carTile = screen.getByRole("button", { name: "Icon: transport" });
    expect(carTile).toHaveAttribute("aria-pressed", "false");

    await user.click(carTile);

    expect(carTile).toHaveAttribute("aria-pressed", "true");
    expect(otherTile).toHaveAttribute("aria-pressed", "false");
  });

  it("includes selected icon in create submit payload", async () => {
    const user = userEvent.setup();
    const { container } = render(<SavingsGoalForm groupId="group-1" />);

    await user.type(screen.getByPlaceholderText(/e.g. New Sofa/i), "Trip");
    await user.type(screen.getAllByPlaceholderText("0.00")[0], "500");
    const monthInput = getMonthInput(container);
    await user.type(monthInput, "2027-06");
    await user.click(screen.getByRole("button", { name: "Icon: transport" }));
    await user.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.create).toHaveBeenCalledWith(
        "group-1",
        expect.objectContaining({ icon: "transport", name: "Trip" }),
      );
    });
  });

  it("includes selected icon in update submit payload", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: "Icon: transport" }));
    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({ icon: "transport" }),
      );
    });
  });

  it("renders the allocation hint text when editing a goal with breakdown", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(
      screen.getByText(
        /Editing a member's monthly amount recalculates the projected completion date\./i,
      ),
    ).toBeInTheDocument();
  });

  it("renders month input with YYYY-MM value derived from goal.targetDate", () => {
    const { container } = render(
      <SavingsGoalForm groupId="group-1" goal={mockGoal} />,
    );

    const monthInput = getMonthInput(container);
    expect(monthInput).not.toBeNull();
    expect(monthInput.value).toBe("2026-12");
  });

  it("submits an ISO date built from the typed month value", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SavingsGoalForm groupId="group-1" goal={mockGoal} />,
    );

    const monthInput = getMonthInput(container);
    await user.clear(monthInput);
    await user.type(monthInput, "2027-03");

    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({
          targetDate: new Date("2027-03-01").toISOString(),
        }),
      );
    });
  });
});
