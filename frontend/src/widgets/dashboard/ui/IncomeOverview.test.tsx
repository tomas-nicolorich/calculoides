import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncomeOverview } from "./IncomeOverview";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { groupApi } from "../../../entities/group";

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

vi.mock("../../../entities/group", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../entities/group")>();
  return {
    ...actual,
    groupApi: {
      ...actual.groupApi,
      updateMemberIncome: vi.fn(),
    },
  };
});

const members = [
  { id: "m1", name: "Alice", income: 3000, share: 60, colorIndex: 0 },
  { id: "m2", name: "Bob", income: 2000, share: 40, colorIndex: 1 },
];

describe("IncomeOverview", () => {
  it("renders member income amounts and shares in the dot legend", () => {
    render(<IncomeOverview totalIncome={5000} members={members} />);
    expect(screen.getByText(formatCurrency(3000))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(2000))).toBeInTheDocument();
    expect(screen.getByText("(60.0%)")).toBeInTheDocument();
    expect(screen.getByText("(40.0%)")).toBeInTheDocument();
  });

  it("does not render avatar initials — members shown as coloured dots", () => {
    render(<IncomeOverview totalIncome={5000} members={members} />);
    // Avatar initials "A" and "B" should not appear
    expect(screen.queryByText("A")).not.toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("colours a member's dot by its stable colorIndex, not array position", () => {
    // Alice sits at array position 0 but has a stable colorIndex of 2.
    // A position-based regression would use member-1; the index forces member-3.
    render(
      <IncomeOverview
        totalIncome={5000}
        members={[{ ...members[0], colorIndex: 2 }, members[1]]}
      />,
    );
    // The dot is the first child <span> inside the "Alice" legend row span
    const aliceLabel = screen.getByText("Alice");
    const dot = aliceLabel.querySelector("span");
    expect(dot).toHaveStyle({ background: "var(--color-member-3)" });
  });

  it("renders the total in neutral tone (not a brand tint)", () => {
    render(<IncomeOverview totalIncome={5000} members={members} />);
    const total = screen.getByText(formatCurrency(5000));
    expect(total).toHaveClass("text-slate-900");
    expect(total).not.toHaveClass("text-brand-income");
  });

  describe("edit mode", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(groupApi.updateMemberIncome).mockResolvedValue({
        id: "m2",
        userId: "user-2",
        income: 2000,
        joinedAt: "2026-01-01T00:00:00.000Z",
      });
    });

    it("header pencil toggles every row into a €-prefixed input with live % recompute while typing", async () => {
      const user = userEvent.setup();
      render(<IncomeOverview totalIncome={5000} members={members} />);

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));

      const aliceInput = screen.getByRole("spinbutton", {
        name: /Income for Alice/i,
      });
      const bobInput = screen.getByRole("spinbutton", {
        name: /Income for Bob/i,
      });
      expect(aliceInput).toBeInTheDocument();
      expect(bobInput).toBeInTheDocument();
      expect(screen.getAllByText("€").length).toBeGreaterThan(0);
      expect(screen.getByText("60.0%")).toBeInTheDocument();

      fireEvent.change(bobInput, { target: { value: "3000" } });

      expect(screen.getAllByText("50.0%")).toHaveLength(2);
    });

    it("Close discards without calling updateMemberIncome, restores original values", async () => {
      const user = userEvent.setup();
      render(<IncomeOverview totalIncome={5000} members={members} />);

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));
      const bobInput = screen.getByRole("spinbutton", {
        name: /Income for Bob/i,
      });
      fireEvent.change(bobInput, { target: { value: "9999" } });

      await user.click(screen.getByRole("button", { name: /^close$/i }));

      expect(groupApi.updateMemberIncome).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("spinbutton", { name: /Income for Bob/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /edit incomes/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(formatCurrency(2000))).toBeInTheDocument();
    });

    it("Confirm calls updateMemberIncome once per changed member then onRefresh, returns to view mode", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(
        <IncomeOverview
          totalIncome={5000}
          members={members}
          onRefresh={onRefresh}
        />,
      );

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));
      const bobInput = screen.getByRole("spinbutton", {
        name: /Income for Bob/i,
      });
      fireEvent.change(bobInput, { target: { value: "2500" } });

      await user.click(screen.getByRole("button", { name: /^confirm$/i }));

      await waitFor(() => {
        expect(groupApi.updateMemberIncome).toHaveBeenCalledWith("m2", 2500);
        expect(onRefresh).toHaveBeenCalled();
      });
      expect(groupApi.updateMemberIncome).not.toHaveBeenCalledWith(
        "m1",
        expect.anything(),
      );
      expect(
        screen.getByRole("button", { name: /edit incomes/i }),
      ).toBeInTheDocument();
    });

    it("negative/non-numeric input blocks Confirm dispatch with an inline message", async () => {
      const user = userEvent.setup();
      render(<IncomeOverview totalIncome={5000} members={members} />);

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));
      const bobInput = screen.getByRole("spinbutton", {
        name: /Income for Bob/i,
      });
      fireEvent.change(bobInput, { target: { value: "-50" } });

      await user.click(screen.getByRole("button", { name: /^confirm$/i }));

      expect(groupApi.updateMemberIncome).not.toHaveBeenCalled();
      expect(
        screen.getByText(/enter a valid non-negative income/i),
      ).toBeInTheDocument();
    });

    it("a failed Confirm shows an inline error, keeps edit mode open, and does not call onRefresh", async () => {
      vi.mocked(groupApi.updateMemberIncome).mockRejectedValueOnce(
        new Error("Network error"),
      );
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(
        <IncomeOverview
          totalIncome={5000}
          members={members}
          onRefresh={onRefresh}
        />,
      );

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));
      const bobInput = screen.getByRole("spinbutton", {
        name: /Income for Bob/i,
      });
      fireEvent.change(bobInput, { target: { value: "2500" } });

      await user.click(screen.getByRole("button", { name: /^confirm$/i }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
      expect(onRefresh).not.toHaveBeenCalled();
      expect(
        screen.getByRole("spinbutton", { name: /Income for Bob/i }),
      ).toBeInTheDocument();
    });

    it("empty members renders no rows and no error in edit mode", async () => {
      const user = userEvent.setup();
      render(<IncomeOverview totalIncome={0} members={[]} />);

      await user.click(screen.getByRole("button", { name: /edit incomes/i }));

      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});
