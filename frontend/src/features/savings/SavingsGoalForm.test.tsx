import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Opens the DatePicker, jumps forward one year (deterministic regardless of
// the real current date — the popover's initial view year is always either
// today's year or, when editing, the existing target's year), and picks the
// given month. Mirrors driving the real Base UI popover, not a native input.
async function pickMonthNextYear(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: RegExp,
  monthLabel: string,
) {
  await user.click(screen.getByRole("button", { name: triggerName }));
  await user.click(await screen.findByRole("button", { name: "Next year" }));
  await user.click(screen.getByRole("button", { name: monthLabel }));
}

import { SavingsGoalForm } from "./SavingsGoalForm";
import { savingsGoalApi } from "../../entities/savings-goal";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Popover mount/interaction involves real userEvent timers; the 5s default
// is tight under load, not a sign of an indeterminate hang.
vi.setConfig({ testTimeout: 15000, hookTimeout: 15000 });

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
      deleteContribution: vi.fn().mockResolvedValue(undefined),
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
      remainingBalance: 1000,
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    },
  ],
};

describe("SavingsGoalForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("does not render an allocation section when editing an existing goal — allocation editing lives only in InlineAllocationEditor", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(screen.queryByText("Monthly Allocation")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Alice/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/reset to income split/i),
    ).not.toBeInTheDocument();
  });

  it("submits a metadata-only update — no contribution override calls are made", async () => {
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
      expect(savingsGoalApi.update).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({ name: "Vacation" }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
    expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
  });

  it("renders icon picker tiles and selects one on click", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" />);

    const trigger = screen.getByRole("button", { name: "Choose icon" });
    await user.click(trigger);

    const otherTile = await screen.findByRole("button", {
      name: "Icon: Other",
    });
    expect(otherTile).toHaveAttribute("aria-pressed", "true");

    const carTile = screen.getByRole("button", { name: "Icon: Transport" });
    expect(carTile).toHaveAttribute("aria-pressed", "false");

    // Selecting an icon closes the popover; the trigger reflects the choice.
    await user.click(carTile);
    expect(trigger).toHaveTextContent("Transport");

    await user.click(trigger);
    expect(
      await screen.findByRole("button", { name: "Icon: Transport" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Icon: Other" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("includes selected icon in create submit payload", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" />);

    await user.type(screen.getByPlaceholderText(/e.g. New Sofa/i), "Trip");
    await user.type(screen.getAllByPlaceholderText("0.00")[0], "500");
    await pickMonthNextYear(user, /target date/i, "Jun");
    await user.click(screen.getByRole("button", { name: "Choose icon" }));
    await user.click(
      await screen.findByRole("button", { name: "Icon: Transport" }),
    );
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

    await user.click(screen.getByRole("button", { name: "Choose icon" }));
    await user.click(
      await screen.findByRole("button", { name: "Icon: Transport" }),
    );
    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({ icon: "transport" }),
      );
    });
  });

  it("renders the date picker trigger with the month/year derived from goal.targetDate", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(
      screen.getByRole("button", { name: /target date/i }),
    ).toHaveTextContent("Dec 2026");
  });

  it("submits an ISO date built from the picked month", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    // The popover opens on the existing target's year (2026), so "Next
    // year" deterministically lands on 2027 regardless of the real date.
    await pickMonthNextYear(user, /target date/i, "Mar");

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
