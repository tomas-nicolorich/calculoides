import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { InlineAllocationEditor } from "./InlineAllocationEditor";
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

function getRow(name: string): HTMLElement {
  const row = screen.getByText(name).closest("div")?.parentElement;
  if (!row) throw new Error(`Could not find row for "${name}"`);
  return row;
}

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

describe("InlineAllocationEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Monthly Allocation label and a single global Adjust control, with no input by default", () => {
    render(<InlineAllocationEditor goal={mockGoal} />);

    expect(screen.getByText(/Monthly Allocation/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^adjust$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Alice/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking Adjust hides the Adjust button and swaps every member's amount into an input", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={scopedGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(
      screen.getByRole("spinbutton", { name: /Alice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /Bob/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^adjust$/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("regression: clicking Adjust shows a member's existing custom amount, not the proportional/percentage amount", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={resetGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(screen.getByRole("spinbutton", { name: /Carol/i })).toHaveValue(350);
  });

  it("renders the allocation hint text after Adjust is clicked", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(
      screen.getByText(
        /Editing a member's monthly amount recalculates the projected completion date\./i,
      ),
    ).toBeInTheDocument();
  });

  it("does not render an over-ceiling badge when the member's share is within their remaining balance", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(screen.queryByText(/over balance/i)).not.toBeInTheDocument();
  });

  it("renders an amber over-ceiling badge only on the member row whose share exceeds their remaining balance", async () => {
    const user = userEvent.setup();
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

    render(<InlineAllocationEditor goal={goalWithWarning} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    const badges = screen.getAllByText(/over balance/i);
    expect(badges).toHaveLength(1);

    const aliceRow = getRow("Alice");
    const bobRow = getRow("Bob");
    expect(aliceRow).toContainElement(badges[0]);
    expect(bobRow).not.toContainElement(badges[0]);
  });

  it("keeps the allocation input value driven by overrideAmounts/proportionalAmount unaffected by the warning badge", async () => {
    const user = userEvent.setup();
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

    render(<InlineAllocationEditor goal={goalWithWarning} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    expect(input).toHaveValue(500);
  });

  it("renders Save Changes and Cancel controls after Adjust is clicked", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("regression: clicking Save immediately after Adjust with no edits still closes the editor (no stuck button)", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<InlineAllocationEditor goal={mockGoal} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: /^adjust$/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^adjust$/i }),
      ).toBeInTheDocument();
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("Save calls session.saveSession(): only the edited member is upserted, the untouched member gets no call, and onRefresh fires", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<InlineAllocationEditor goal={scopedGoal} onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input = screen.getByRole("spinbutton", { name: /Bob/i });
    fireEvent.change(input, { target: { value: "300" } });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "edited-member",
        300,
      );
      expect(onRefresh).toHaveBeenCalled();
    });
    expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalledWith(
      "goal-1",
      "untouched-member",
      expect.anything(),
    );
    expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
  });

  it("a member reset then saved deletes the prior override row", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={resetGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    await user.click(
      screen.getByRole("button", { name: /reset to income split/i }),
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savingsGoalApi.deleteContribution).toHaveBeenCalledWith(
        "goal-1",
        "reset-member",
      );
    });
    expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
  });

  it("regression: undo reset before save re-upserts the restored value instead of deleting (#159/#160)", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={resetGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    await user.click(
      screen.getByRole("button", { name: /reset to income split/i }),
    );
    await user.click(screen.getByRole("button", { name: /undo reset/i }));

    expect(screen.getByRole("spinbutton", { name: /Carol/i })).toHaveValue(350);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalledWith(
        "goal-1",
        "reset-member",
        350,
      );
    });
    expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
  });

  it("Cancel does not save and restores the Adjust button", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    fireEvent.change(input, { target: { value: "150" } });

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.getByRole("button", { name: /^adjust$/i }),
    ).toBeInTheDocument();
    expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
    expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
  });

  it("regression: re-opening the editor after a save shows a live date instead of Never", async () => {
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    fireEvent.change(input, { target: { value: "150" } });
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(savingsGoalApi.upsertContribution).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));

    expect(screen.getByText(/Projected completion:/i)).not.toHaveTextContent(
      "Never",
    );
  });

  it("regression: clearing an allocation input to type a new value doesn't get stuck at one character", () => {
    render(<InlineAllocationEditor goal={mockGoal} />);

    fireEvent.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input: HTMLInputElement = screen.getByRole("spinbutton", {
      name: /Alice/i,
    });

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "200" } });
    expect(input.value).toBe("200");
  });

  it("renders session.saveError when saveSession() rejects", async () => {
    vi.mocked(savingsGoalApi.upsertContribution).mockRejectedValueOnce(
      new Error("Save failed"),
    );
    const user = userEvent.setup();
    render(<InlineAllocationEditor goal={mockGoal} />);

    await user.click(screen.getByRole("button", { name: /^adjust$/i }));
    const input = screen.getByRole("spinbutton", { name: /Alice/i });
    fireEvent.change(input, { target: { value: "150" } });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });
  });
});
