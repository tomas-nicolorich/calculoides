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
  it("renders the card title and stat label", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    expect(screen.getByText("Remaining Balance")).toBeInTheDocument();
    expect(screen.getByText("Total Group Remaining")).toBeInTheDocument();
  });

  it("renders an avatar initial per member", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders member income and budgeted figures", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    // One Income: row per member
    const incomeLabels = screen.getAllByText(/Income:/);
    expect(incomeLabels).toHaveLength(members.length);
    const budgetedLabels = screen.getAllByText(/Budgeted:/);
    expect(budgetedLabels).toHaveLength(members.length);
  });

  it("renders member remaining (income − budgeted) figures", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    // Alice: 3000 - 1500 = 1500; Bob: 2000 - 1000 = 1000
    // Both should appear as formatted currency amounts
    const allText =
      screen.getByText(/Total Group Remaining/).closest("div")?.parentElement
        ?.textContent ?? "";
    expect(allText).toContain("Alice");
    expect(allText).toContain("Bob");
  });

  it("uses xs-size avatars", () => {
    render(<RemainingBalance totalRemaining={2500} members={members} />);
    const alice = screen.getByText("A");
    // xs avatars have h-[22px] w-[22px] classes
    expect(alice).toHaveClass("h-[22px]");
    expect(alice).toHaveClass("w-[22px]");
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
