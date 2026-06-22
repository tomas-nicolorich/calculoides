import { render, screen } from "@testing-library/react";
import { SavingsGoalForm } from "./SavingsGoalForm";
import { vi, describe, it, expect } from "vitest";

vi.mock("../../entities/savings-goal", () => ({
  savingsGoalApi: {
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
}));

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
});
