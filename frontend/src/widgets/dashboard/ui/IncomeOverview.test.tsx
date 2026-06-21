import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IncomeOverview } from "./IncomeOverview";

const members = [
  { id: "m1", name: "Alice", income: 3000, share: 60, colorIndex: 0 },
  { id: "m2", name: "Bob", income: 2000, share: 40, colorIndex: 1 },
];

describe("IncomeOverview", () => {
  it("renders an avatar initial per member in the legend", () => {
    render(<IncomeOverview totalIncome={5000} members={members} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("colours a member's avatar by its stable colorIndex, not array position", () => {
    // Alice sits at array position 0 but has a stable colorIndex of 2.
    // A position-based regression would render member-1; the index forces member-3.
    render(
      <IncomeOverview
        totalIncome={5000}
        members={[{ ...members[0], colorIndex: 2 }, members[1]]}
      />,
    );
    const alice = screen.getByText("A");
    expect(alice).toHaveStyle({ background: "var(--color-member-3)" });
  });

  it("renders income and share for each member", () => {
    render(<IncomeOverview totalIncome={5000} members={members} />);
    expect(screen.getByText("(60%)")).toBeInTheDocument();
    expect(screen.getByText("(40%)")).toBeInTheDocument();
  });
});
