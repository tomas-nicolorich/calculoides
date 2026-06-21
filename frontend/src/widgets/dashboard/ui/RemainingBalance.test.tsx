import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RemainingBalance } from "./RemainingBalance";

const members = [
  {
    id: "m1",
    name: "Alice",
    income: 3000,
    spent: 500,
    remainingQuota: 1000,
    budgeted: 1500,
    colorIndex: 0,
  },
  {
    id: "m2",
    name: "Bob",
    income: 2000,
    spent: 200,
    remainingQuota: 800,
    budgeted: 1000,
    colorIndex: 1,
  },
];

describe("RemainingBalance", () => {
  it("renders an avatar initial per member card", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("colours a member's avatar by its stable colorIndex, not array position", () => {
    render(
      <RemainingBalance
        totalRemaining={2500}
        members={[{ ...members[0], colorIndex: 2 }, members[1]]}
      />,
    );
    const alice = screen.getByText("A");
    expect(alice).toHaveStyle({ background: "var(--color-member-3)" });
  });
});
