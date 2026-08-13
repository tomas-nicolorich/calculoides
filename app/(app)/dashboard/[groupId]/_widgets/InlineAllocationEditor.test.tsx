// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import {
  contributionUpsert,
  contributionDelete,
} from "../../../../../lib/actions/savings";
import { InlineAllocationEditor } from "./InlineAllocationEditor";
import type { SavingsGoal } from "../../../../_data/savings";

/**
 * Ported/adapted from `main`'s
 * `frontend/src/features/savings/InlineAllocationEditor.test.tsx` (PR 16).
 * Genuine RED before this file existed — module not found.
 */
vi.mock("../../../../../lib/actions/savings", () => ({
  contributionUpsert: vi.fn(),
  contributionDelete: vi.fn(),
}));

const mockUpsert = vi.mocked(contributionUpsert);
const mockDelete = vi.mocked(contributionDelete);

const GOAL: SavingsGoal = {
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
      user: { name: "Alice", email: "alice@example.com" },
    },
  ],
};

function renderEditor(goal: SavingsGoal = GOAL) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <InlineAllocationEditor goal={goal} />
    </QueryClientProvider>,
  );
}

describe("InlineAllocationEditor", () => {
  afterEach(() => {
    cleanup();
    mockUpsert.mockReset();
    mockDelete.mockReset();
  });

  it("renders each member's display amount and an Adjust toggle when not editing", () => {
    renderEditor();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getAllByText("€100.00").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Adjust" }),
    ).toBeInTheDocument();
  });

  it("clicking Adjust reveals an editable amount input per member plus Save/Cancel", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));

    expect(
      screen.getByLabelText("Override amount for Alice"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("editing an amount and saving upserts the override via the Server Action", async () => {
    mockUpsert.mockResolvedValue({
      ok: true,
      data: undefined,
    } as unknown as Awaited<ReturnType<typeof contributionUpsert>>);
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));
    const input = screen.getByLabelText("Override amount for Alice");
    fireEvent.change(input, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await screen.findByRole("button", { name: "Adjust" });
    expect(mockUpsert).toHaveBeenCalledWith({
      goalId: "goal-1",
      memberId: "member-1",
      amount: 150,
    });
  });

  it("Cancel discards edits and returns to the read-only display", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));
    const input = screen.getByLabelText("Override amount for Alice");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getAllByText("€100.00").length).toBeGreaterThan(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
