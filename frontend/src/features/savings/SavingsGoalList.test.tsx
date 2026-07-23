import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavingsGoalList } from "./SavingsGoalList";
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
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
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
        share: 0.4,
        percentage: 40,
        isOverridden: false,
        remainingBalance: 1000,
        user: { id: "user-1", name: "Alice", email: "alice@example.com" },
      },
    ],
  },
];

const multiGoals = [
  mockGoals[0],
  {
    ...mockGoals[0],
    id: "goal-2",
    name: "New Car",
    targetAmount: 8000,
    breakdown: [
      {
        memberId: "member-2",
        proportionalAmount: 200,
        actualAmount: 200,
        share: 1,
        percentage: 100,
        isOverridden: false,
        remainingBalance: 2000,
        user: { id: "user-2", name: "Bob", email: "bob@example.com" },
      },
    ],
  },
];

describe("SavingsGoalList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly one global Adjust button and no standalone 'Adjust Allocation' button", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(screen.getAllByRole("button", { name: /^adjust$/i })).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole("button", { name: /adjust allocation/i }),
    ).not.toBeInTheDocument();
  });

  describe("edit modal", () => {
    async function openRowMenuFor(
      goalIndex: number,
      user: ReturnType<typeof userEvent.setup>,
    ) {
      const menuButtons = screen.getAllByRole("button", {
        name: /row options/i,
      });
      await user.click(menuButtons[goalIndex]);
      const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
      await user.click(editButtons[editButtons.length - 1]);
    }

    it("RowMenu 'Edit' opens a modal with the correct goal's metadata in a multi-goal fixture", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={multiGoals} />);

      await openRowMenuFor(1, user);

      expect(screen.getByText("Goal Name")).toBeInTheDocument();
      expect(screen.getByDisplayValue("New Car")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Vacation")).not.toBeInTheDocument();
    });

    it("the edit modal does not render per-member allocation-override inputs (guards competing-surfaces regression)", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await openRowMenuFor(0, user);

      expect(screen.queryByText("Monthly Allocation")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("spinbutton", { name: /Alice/i }),
      ).not.toBeInTheDocument();
    });

    it("modal Edit never surfaces allocation inputs even while inline Adjust is active for the same goal", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /^adjust$/i }));
      expect(
        screen.getByRole("spinbutton", { name: /Alice/i }),
      ).toBeInTheDocument();

      await openRowMenuFor(0, user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Goal Name")).toBeInTheDocument();
      expect(
        within(dialog).queryByRole("spinbutton", { name: /Alice/i }),
      ).not.toBeInTheDocument();
    });

    it("closes the edit modal when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await openRowMenuFor(0, user);
      expect(screen.getByText("Goal Name")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(screen.queryByText("Goal Name")).not.toBeInTheDocument();
    });
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
    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar.style.background).toBe("var(--color-brand-transfer)");
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

  it("renders an icon tile for each goal", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the saved-so-far amount", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(screen.getByText(/€0\.00 \/ €1,200\.00/)).toBeInTheDocument();
  });

  it("shows each member's income share percentage", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("shows the monthly allocation total in the section header", () => {
    render(<SavingsGoalList goals={mockGoals} />);
    expect(
      screen.getByText(/Monthly Allocation · €100\.00\/mo/),
    ).toBeInTheDocument();
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
    const bar = screen.getByRole("progressbar").firstChild as HTMLElement;
    expect(bar.style.background).toBe("var(--color-brand-expense)");
  });

  describe("adjust flow", () => {
    it("toggling ADJUST renders InlineAllocationEditor inline in the card (not swapping the whole card)", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      expect(screen.getByText("Vacation")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /^adjust$/i }));

      expect(screen.getByText("Vacation")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^adjust$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset to income split/i }),
      ).toBeInTheDocument();
    });

    it("Save in the inline editor persists the override and closes the editor", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

      await user.click(screen.getByRole("button", { name: /^adjust$/i }));
      const input = screen.getByRole("spinbutton", { name: /Alice/i });
      await user.clear(input);
      await user.type(input, "150");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(savingsGoalApi.upsertContribution).toHaveBeenCalled();
      });
      expect(
        screen.queryByRole("spinbutton", { name: /Alice/i }),
      ).not.toBeInTheDocument();
      expect(onRefresh).toHaveBeenCalled();
    });

    it("Cancel in the inline editor discards changes without saving", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /^adjust$/i }));
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("spinbutton", { name: /Alice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("delete flow", () => {
    it("RowMenu 'Delete' opens a confirmation dialog without calling savingsGoalApi.delete", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(
        screen.getByRole("heading", { name: "Delete Goal" }),
      ).toBeInTheDocument();
      expect(savingsGoalApi.delete).not.toHaveBeenCalled();
    });

    it("the delete-confirm dialog description states the shared balance is unaffected", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(
        screen.getByText(/shared balance stays intact/i),
      ).toBeInTheDocument();
    });

    it("confirming delete calls savingsGoalApi.delete(goalId) exactly once and triggers onRefresh", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));

      expect(savingsGoalApi.delete).toHaveBeenCalledTimes(1);
      expect(savingsGoalApi.delete).toHaveBeenCalledWith("goal-1");
      expect(onRefresh).toHaveBeenCalled();
    });

    it("cancelling the confirmation makes no delete call and the goal remains listed", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      expect(savingsGoalApi.delete).not.toHaveBeenCalled();
      expect(screen.getByText("Vacation")).toBeInTheDocument();
    });

    it("guards the shared-balance-isolation invariant: after delete only savingsGoalApi.delete fires, no contribution API is touched", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));

      expect(savingsGoalApi.delete).toHaveBeenCalledWith("goal-1");
      expect(savingsGoalApi.upsertContribution).not.toHaveBeenCalled();
      expect(savingsGoalApi.deleteContribution).not.toHaveBeenCalled();
    });

    it("deleting goal 1 in a multi-goal list leaves goal 2's amounts, breakdown, and overrides unchanged (spec: other goals are unaffected)", async () => {
      const user = userEvent.setup();
      render(<SavingsGoalList goals={multiGoals} />);

      // Baseline: goal 2 ("New Car") is rendered with its own breakdown before any delete.
      expect(screen.getByText("New Car")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("100.0%")).toBeInTheDocument();
      expect(screen.getByText(/€0\.00 \/ €8,000\.00/)).toBeInTheDocument();

      // Delete goal 1 ("Vacation") via the confirm dialog flow.
      const rowOptionButtons = screen.getAllByRole("button", {
        name: /row options/i,
      });
      await user.click(rowOptionButtons[0]);
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));

      // Only goal 1's id was ever passed to the delete API — goal 2 was never referenced.
      expect(savingsGoalApi.delete).toHaveBeenCalledTimes(1);
      expect(savingsGoalApi.delete).toHaveBeenCalledWith("goal-1");
      expect(savingsGoalApi.delete).not.toHaveBeenCalledWith("goal-2");

      // Goal 2's rendered amounts, breakdown, and overrides are unchanged after the delete.
      expect(screen.getByText("New Car")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("100.0%")).toBeInTheDocument();
      expect(screen.getByText(/€0\.00 \/ €8,000\.00/)).toBeInTheDocument();
      expect(screen.queryByText("Custom")).not.toBeInTheDocument();
    });

    it("shows an error and does not call onRefresh when savingsGoalApi.delete rejects", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      vi.mocked(savingsGoalApi.delete).mockRejectedValueOnce(
        new Error("Network error"),
      );
      render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));

      expect(await screen.findByText("Network error")).toBeInTheDocument();
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("clears a stale delete error when the dialog is reopened after Cancel", async () => {
      const user = userEvent.setup();
      vi.mocked(savingsGoalApi.delete).mockRejectedValueOnce(
        new Error("Network error"),
      );
      render(<SavingsGoalList goals={mockGoals} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));
      expect(await screen.findByText("Network error")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(screen.queryByText("Network error")).not.toBeInTheDocument();
    });

    it("keeps the confirmation dialog open while onRefresh is pending, closing it only once onRefresh resolves", async () => {
      const user = userEvent.setup();
      let resolveRefresh: (() => void) | undefined;
      const onRefresh = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

      await user.click(screen.getByRole("button", { name: /row options/i }));
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
      await user.click(screen.getByRole("button", { name: /delete goal/i }));

      await waitFor(() => {
        expect(savingsGoalApi.delete).toHaveBeenCalled();
      });
      expect(
        screen.getByRole("heading", { name: "Delete Goal" }),
      ).toBeInTheDocument();

      resolveRefresh?.();

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: "Delete Goal" }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
