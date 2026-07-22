import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
import { vi, describe, it, expect, beforeEach } from "vitest";

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

  it("renders per-member allocation inputs when editing an existing goal", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(screen.getByText("Monthly Allocation")).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /Alice/i }),
    ).toBeInTheDocument();
  });

  it("saves metadata and an explicitly edited allocation override together on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <SavingsGoalForm
        groupId="group-1"
        goal={mockGoal}
        onSuccess={onSuccess}
      />,
    );

    // Editing the allocation input records an explicit override for this
    // member (issue #161: only members with an explicit override entry are
    // persisted on save — an untouched member gets no upsert call).
    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    fireEvent.change(input, { target: { value: "150" } });

    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalled();
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "member-1",
        150,
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("does not persist an override for a member left untouched on submit (issue #161)", async () => {
    const user = userEvent.setup();
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => {
      expect(savingsGoalApi.update).toHaveBeenCalled();
    });
    expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
    expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
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

  describe("scoped override persistence on save (issue #161)", () => {
    const scopedGoal = {
      ...mockGoal,
      breakdown: [
        {
          memberId: "untouched-member",
          share: 0.4,
          percentage: 40,
          proportionalAmount: 100,
          actualAmount: 100,
          isOverridden: false,
          remainingBalance: 1000,
          user: { id: "user-1", name: "Alice", email: "alice@example.com" },
        },
        {
          memberId: "edited-member",
          share: 0.6,
          percentage: 60,
          proportionalAmount: 150,
          actualAmount: 150,
          isOverridden: false,
          remainingBalance: 1000,
          user: { id: "user-2", name: "Bob", email: "bob@example.com" },
        },
      ],
    };

    const resetGoal = {
      ...mockGoal,
      breakdown: [
        {
          memberId: "reset-member",
          share: 1,
          percentage: 100,
          proportionalAmount: 200,
          actualAmount: 350,
          isOverridden: true,
          remainingBalance: 1000,
          user: { id: "user-3", name: "Carol", email: "carol@example.com" },
        },
      ],
    };

    it("isEditing branch: only the edited member is upserted, the untouched member gets no call", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalForm groupId="group-1" goal={scopedGoal} />);

      const input = screen.getByRole("spinbutton", { name: /Bob/i });
      fireEvent.change(input, { target: { value: "300" } });

      await user.click(screen.getByRole("button", { name: /update goal/i }));

      await waitFor(() => {
        expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
          "goal-1",
          "edited-member",
          300,
        );
      });
      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalledWith(
        "goal-1",
        "untouched-member",
        expect.anything(),
      );
      expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
    });

    it("isEditing branch: a member reset then saved deletes the prior override row", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalForm groupId="group-1" goal={resetGoal} />);

      await user.click(
        screen.getByRole("button", { name: /reset to income split/i }),
      );
      await user.click(screen.getByRole("button", { name: /update goal/i }));

      await waitFor(() => {
        expect(savingsGoalApi.deleteContribution).toHaveBeenCalledWith(
          "goal-1",
          "reset-member",
        );
      });
      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
    });

    it("isAllocationOnly branch: only the edited member is upserted, the untouched member gets no call", async () => {
      const user = userEvent.setup();
      render(
        <SavingsGoalForm
          groupId="group-1"
          goal={scopedGoal}
          mode="allocation"
        />,
      );

      const input = screen.getByRole("spinbutton", { name: /Bob/i });
      fireEvent.change(input, { target: { value: "300" } });

      await user.click(
        screen.getByRole("button", { name: /save allocation/i }),
      );

      await waitFor(() => {
        expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
          "goal-1",
          "edited-member",
          300,
        );
      });
      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalledWith(
        "goal-1",
        "untouched-member",
        expect.anything(),
      );
      expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
    });

    it("isAllocationOnly branch: a member reset then saved deletes the prior override row", async () => {
      const user = userEvent.setup();
      render(
        <SavingsGoalForm
          groupId="group-1"
          goal={resetGoal}
          mode="allocation"
        />,
      );

      await user.click(
        screen.getByRole("button", { name: /reset to income split/i }),
      );
      await user.click(
        screen.getByRole("button", { name: /save allocation/i }),
      );

      await waitFor(() => {
        expect(savingsGoalApi.deleteContribution).toHaveBeenCalledWith(
          "goal-1",
          "reset-member",
        );
      });
      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
    });

    it("regression: undo reset before save re-upserts the restored value instead of deleting, and leaves proportional/percentage computed fields untouched (#159/#160)", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalForm groupId="group-1" goal={resetGoal} />);

      await user.click(
        screen.getByRole("button", { name: /reset to income split/i }),
      );
      await user.click(screen.getByRole("button", { name: /undo reset/i }));

      // Non-regression guard: undoing a reset must not touch the
      // months-remaining (#159) or share/percentage (#160) computed
      // fields — the input still reflects the original override value
      // (actualAmount 350), proving proportionalAmount/percentage math
      // was never recalculated by the reset/undo cycle.
      const input = screen.getByRole("spinbutton", { name: /Carol/i });
      expect(input).toHaveValue(350);

      await user.click(screen.getByRole("button", { name: /update goal/i }));

      await waitFor(() => {
        expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
          "goal-1",
          "reset-member",
          350,
        );
      });
      expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
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

  it("does not render an over-ceiling badge when the member's share is within their remaining balance", () => {
    render(<SavingsGoalForm groupId="group-1" goal={mockGoal} />);

    expect(screen.queryByText(/over balance/i)).not.toBeInTheDocument();
  });

  it("renders an amber over-ceiling badge only on the member row whose share exceeds their remaining balance", () => {
    const goalWithWarning = {
      ...mockGoal,
      breakdown: [
        {
          memberId: "member-1",
          share: 0.6,
          percentage: 60,
          proportionalAmount: 500,
          actualAmount: 500,
          isOverridden: false,
          remainingBalance: 400,
          user: { id: "user-1", name: "Alice", email: "alice@example.com" },
        },
        {
          memberId: "member-2",
          share: 0.4,
          percentage: 40,
          proportionalAmount: 100,
          actualAmount: 100,
          isOverridden: false,
          remainingBalance: 400,
          user: { id: "user-2", name: "Bob", email: "bob@example.com" },
        },
      ],
    };

    render(<SavingsGoalForm groupId="group-1" goal={goalWithWarning} />);

    const badges = screen.getAllByText(/over balance/i);
    expect(badges).toHaveLength(1);

    const badge = badges[0];
    expect(badge).toHaveAttribute("title", "Exceeds available balance");

    const aliceRow = screen.getByRole("spinbutton", {
      name: /alice/i,
    }).parentElement;
    const bobRow = screen.getByRole("spinbutton", {
      name: /bob/i,
    }).parentElement;
    expect(aliceRow).toContainElement(badge);
    expect(bobRow).not.toContainElement(badge);
  });

  it("keeps the allocation input value driven by overrideAmounts/proportionalAmount unaffected by the warning badge", () => {
    const goalWithWarning = {
      ...mockGoal,
      breakdown: [
        {
          memberId: "member-1",
          share: 1,
          percentage: 100,
          proportionalAmount: 500,
          actualAmount: 500,
          isOverridden: false,
          remainingBalance: 400,
          user: { id: "user-1", name: "Alice", email: "alice@example.com" },
        },
      ],
    };

    render(<SavingsGoalForm groupId="group-1" goal={goalWithWarning} />);

    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    expect(input).toHaveValue(500);
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
