// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { update as updateGoalAction } from "../../../../../lib/actions/savings";
import { SavingsGoalForm } from "./SavingsGoalForm";
import type { SavingsGoal } from "../../../../_data/savings";

/**
 * Ported/adapted from `main`'s
 * `frontend/src/features/savings/SavingsGoalForm.test.tsx` (PR 16). Scoped
 * to the edit path — `SavingsGoalList`'s row-menu Edit is this port's only
 * consumer (dashboard-level goal creation stays out of scope, same as
 * `main`'s widget). Genuine RED before this file existed — module not
 * found.
 */
vi.mock("../../../../../lib/actions/savings", () => ({
  create: vi.fn(),
  update: vi.fn(),
}));

const mockUpdate = vi.mocked(updateGoalAction);

const GOAL: SavingsGoal = {
  id: "goal-1",
  groupId: "group-1",
  name: "Vacation",
  icon: "plane",
  targetAmount: 1200,
  currentAmount: 200,
  targetDate: "2026-12-01T00:00:00.000Z",
  projectedDate: "2026-12-01T00:00:00.000Z",
  varianceMonths: 0,
  isNever: false,
  breakdown: [],
};

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("SavingsGoalForm", () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    mockUpdate.mockReset();
  });

  it("prefills every field from the goal being edited", () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SavingsGoalForm groupId={GOAL.groupId} goal={GOAL} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Goal Name")).toHaveValue("Vacation");
    expect(screen.getByLabelText("Target (€)")).toHaveValue(1200);
    expect(screen.getByLabelText("Saved So Far")).toHaveValue(200);
    expect(
      screen.getByRole("button", { name: "Update Goal" }),
    ).toBeInTheDocument();
  });

  it("submitting the edit form calls the update Server Action with the edited fields", async () => {
    mockUpdate.mockResolvedValue({
      ok: true,
      data: { ...GOAL, name: "Trip" },
    } as unknown as Awaited<ReturnType<typeof updateGoalAction>>);
    const onSuccess = vi.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SavingsGoalForm groupId={GOAL.groupId} goal={GOAL} onSuccess={onSuccess} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Goal Name"), {
      target: { value: "Trip" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Goal" }));

    await screen.findByDisplayValue("Trip");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: "goal-1", name: "Trip" }),
      expect.anything(),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("clicking Cancel calls onCancel without submitting", () => {
    const onCancel = vi.fn();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SavingsGoalForm groupId={GOAL.groupId} goal={GOAL} onCancel={onCancel} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
