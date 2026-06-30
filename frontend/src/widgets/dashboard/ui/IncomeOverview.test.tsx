import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IncomeOverview } from "./IncomeOverview";
import { formatCurrency } from "../../../shared/api/dashboardUtils";

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
});
